"""
Leave management router.
Handles leave types, balances, requests, approvals, and holidays.
"""
from typing import Optional, List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.leave import (
    LeaveType, LeaveEntitlement, LeaveRequest, LeaveApproval,
    LeaveStatus, ApprovalAction
)
from app.models.payroll import Holiday, HolidayType, HolidayCountry
from app.schemas.leave import (
    LeaveTypeCreate, LeaveTypeResponse,
    LeaveEntitlementResponse,
    LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse,
    LeaveApprovalCreate,
)
from app.schemas.payroll import HolidayCreate, HolidayResponse
from app.services.leave_service import (
    validate_leave_request,
    process_leave_approval,
    cancel_leave_request,
    get_all_leave_balances,
    get_holidays_for_range,
    calculate_working_days,
)

router = APIRouter(tags=["Leaves"])


# ================= Leave Types =================

@router.get("/leave-types", response_model=dict)
def list_leave_types(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
):
    """List all leave types."""
    query = db.query(LeaveType)
    if is_active is not None:
        query = query.filter(LeaveType.is_active == is_active)
    types = query.order_by(LeaveType.code).all()
    return {"items": [LeaveTypeResponse.model_validate(t) for t in types], "total": len(types)}


@router.post("/leave-types", response_model=LeaveTypeResponse, status_code=201)
def create_leave_type(payload: LeaveTypeCreate, db: Session = Depends(get_db)):
    """Create a new leave type."""
    existing = db.query(LeaveType).filter(LeaveType.code == payload.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Leave type with code '{payload.code}' already exists")

    lt = LeaveType(**payload.model_dump())
    lt.code = lt.code.upper()
    db.add(lt)
    db.commit()
    db.refresh(lt)
    return LeaveTypeResponse.model_validate(lt)


# ================= Leave Balance =================

@router.get("/employees/{employee_id}/leave-balance", response_model=dict)
def get_leave_balance(
    employee_id: int,
    year: int = Query(default=None),
    db: Session = Depends(get_db),
):
    """Get all leave balances for an employee for a given year."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not year:
        year = date.today().year

    entitlements = get_all_leave_balances(db, employee_id, year)
    result = []
    for ent in entitlements:
        result.append({
            "id": ent.id,
            "employee_id": ent.employee_id,
            "leave_type_id": ent.leave_type_id,
            "year": ent.year,
            "total_days": ent.total_days,
            "used_days": ent.used_days,
            "carried_forward": ent.carried_forward,
            "encashed_days": ent.encashed_days,
            "available_days": ent.available_days,
            "leave_type": {
                "id": ent.leave_type.id,
                "code": ent.leave_type.code,
                "name": ent.leave_type.name,
                "is_encashable": ent.leave_type.is_encashable,
                "is_paid": ent.leave_type.is_paid,
                "annual_entitlement": ent.leave_type.annual_entitlement,
                "max_carry_forward": ent.leave_type.max_carry_forward,
            } if ent.leave_type else None,
        })
    return {"items": result, "total": len(result), "year": year}


# ================= Leave History =================

@router.get("/employees/{employee_id}/leave-history", response_model=dict)
def get_leave_history(
    employee_id: int,
    year: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Get leave request history for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    query = db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee_id)

    if year:
        from sqlalchemy import extract
        query = query.filter(extract("year", LeaveRequest.from_date) == year)
    if status:
        try:
            query = query.filter(LeaveRequest.status == LeaveStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    total = query.count()
    requests = query.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "items": [_serialize_leave_request(r) for r in requests],
        "total": total,
    }


# ================= Leave Requests =================

@router.post("/leave-requests", status_code=201)
def create_leave_request(payload: LeaveRequestCreate, db: Session = Depends(get_db)):
    """Create a new leave request (starts as draft)."""
    emp = db.query(Employee).filter(Employee.id == payload.employee_id, Employee.is_active == True).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    lt = db.query(LeaveType).filter(LeaveType.id == payload.leave_type_id, LeaveType.is_active == True).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    is_valid, error_msg, working_days = validate_leave_request(
        db,
        payload.employee_id,
        payload.leave_type_id,
        payload.from_date,
        payload.to_date,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    req = LeaveRequest(
        employee_id=payload.employee_id,
        leave_type_id=payload.leave_type_id,
        from_date=payload.from_date,
        to_date=payload.to_date,
        total_days=working_days,
        reason=payload.reason,
        backfill_employee_id=payload.backfill_employee_id,
        status=LeaveStatus.draft,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _serialize_leave_request(req)


@router.get("/leave-requests", response_model=dict)
def list_leave_requests(
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    leave_type_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List leave requests with filters."""
    query = db.query(LeaveRequest)

    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if status:
        try:
            query = query.filter(LeaveRequest.status == LeaveStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    if from_date:
        query = query.filter(LeaveRequest.from_date >= from_date)
    if to_date:
        query = query.filter(LeaveRequest.to_date <= to_date)
    if leave_type_id:
        query = query.filter(LeaveRequest.leave_type_id == leave_type_id)

    total = query.count()
    requests = query.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "items": [_serialize_leave_request(r) for r in requests],
        "total": total,
    }


@router.get("/leave-requests/{request_id}")
def get_leave_request(request_id: int, db: Session = Depends(get_db)):
    """Get a single leave request."""
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return _serialize_leave_request(req)


@router.put("/leave-requests/{request_id}/submit")
def submit_leave_request(request_id: int, db: Session = Depends(get_db)):
    """Submit a draft leave request for approval."""
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if req.status != LeaveStatus.draft:
        raise HTTPException(status_code=400, detail=f"Only draft requests can be submitted. Current status: {req.status}")

    # Re-validate before submitting
    is_valid, error_msg, working_days = validate_leave_request(
        db,
        req.employee_id,
        req.leave_type_id,
        req.from_date,
        req.to_date,
        exclude_request_id=request_id,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    req.total_days = working_days
    req.status = LeaveStatus.submitted
    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    return _serialize_leave_request(req)


@router.put("/leave-requests/{request_id}/cancel")
def cancel_leave(request_id: int, employee_id: int = Query(...), db: Session = Depends(get_db)):
    """Cancel a leave request."""
    success, message = cancel_leave_request(db, request_id, employee_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    return _serialize_leave_request(req)


@router.post("/leave-requests/{request_id}/approve")
def approve_or_reject_leave(
    request_id: int,
    payload: LeaveApprovalCreate,
    db: Session = Depends(get_db),
):
    """Approve or reject a leave request."""
    if payload.action not in (ApprovalAction.approved, ApprovalAction.rejected):
        raise HTTPException(status_code=400, detail="Action must be 'approved' or 'rejected'")

    success, message = process_leave_approval(
        db,
        request_id,
        payload.approver_id,
        payload.action.value,
        comments=payload.comments,
        rejected_reason=payload.comments if payload.action == ApprovalAction.rejected else None,
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)

    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()

    # Fire-and-forget email notification
    try:
        from app.services.email_service import send_leave_status_email
        if req and req.employee and req.employee.email:
            send_leave_status_email(
                to_email=req.employee.email,
                employee_name=req.employee.full_name,
                leave_type=req.leave_type.name if req.leave_type else "Leave",
                from_date=str(req.from_date),
                to_date=str(req.to_date),
                status=payload.action.value,
                comments=payload.comments or "",
            )
    except Exception:
        pass  # Email failure should not affect the approval response

    return {
        "message": message,
        "leave_request": _serialize_leave_request(req),
    }


# ================= Holidays =================

@router.get("/holidays", response_model=dict)
def list_holidays(
    year: Optional[int] = None,
    country: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
):
    """List all holidays."""
    query = db.query(Holiday)
    if year:
        query = query.filter(Holiday.year == year)
    if country:
        query = query.filter(Holiday.country == country)
    if is_active is not None:
        query = query.filter(Holiday.is_active == is_active)

    holidays = query.order_by(Holiday.date).all()
    items = [
        {
            "id": h.id,
            "name": h.name,
            "date": h.date,
            "holiday_type": h.holiday_type,
            "country": h.country,
            "is_active": h.is_active,
            "year": h.year,
        }
        for h in holidays
    ]
    return {"items": items, "total": len(items)}


@router.post("/holidays", status_code=201)
def create_holiday(payload: HolidayCreate, db: Session = Depends(get_db)):
    """Create a new holiday."""
    holiday = Holiday(
        name=payload.name,
        date=payload.date,
        holiday_type=payload.holiday_type,
        country=payload.country,
        year=payload.year,
        is_active=True,
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return {
        "id": holiday.id,
        "name": holiday.name,
        "date": holiday.date,
        "holiday_type": holiday.holiday_type,
        "country": holiday.country,
        "is_active": holiday.is_active,
        "year": holiday.year,
    }


# ================= Helpers =================

def _serialize_leave_request(req: LeaveRequest) -> dict:
    return {
        "id": req.id,
        "employee_id": req.employee_id,
        "leave_type_id": req.leave_type_id,
        "from_date": req.from_date,
        "to_date": req.to_date,
        "total_days": req.total_days,
        "reason": req.reason,
        "status": req.status,
        "approved_by": req.approved_by,
        "rejected_reason": req.rejected_reason,
        "attachment_path": req.attachment_path,
        "backfill_employee_id": req.backfill_employee_id,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
        "employee_name": req.employee.full_name if req.employee else None,
        "leave_type_name": req.leave_type.name if req.leave_type else None,
        "leave_type_code": req.leave_type.code if req.leave_type else None,
        "approvals": [
            {
                "id": a.id,
                "approver_id": a.approver_id,
                "level": a.level,
                "action": a.action,
                "comments": a.comments,
                "created_at": a.created_at,
                "approver_name": a.approver.full_name if a.approver else None,
            }
            for a in (req.approvals or [])
        ],
    }
