"""
Commission router.
Handles commission structures, employee assignments, entries, approvals, and summaries.
"""
import json
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee, UserRole
from app.models.commission import (
    CommissionStructure,
    EmployeeCommissionAssignment,
    CommissionEntry,
    CommissionType,
)
from app.schemas.commission import (
    CommissionStructureCreate,
    CommissionStructureResponse,
    CommissionStructureUpdate,
    CommissionAssignmentCreate,
    CommissionAssignmentResponse,
    CommissionEntryCreate,
    CommissionEntryResponse,
    CommissionApprovalRequest,
    MonthlyCommissionSummary,
    CommissionCalculateResponse,
)

router = APIRouter(tags=["commission"])


# ─────────────────────────────────────────────
# Commission Structures
# ─────────────────────────────────────────────

@router.get("/commission/structures", response_model=dict)
def list_commission_structures(
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List all commission structures."""
    query = db.query(CommissionStructure)
    if is_active is not None:
        query = query.filter(CommissionStructure.is_active == is_active)
    total = query.count()
    structures = query.order_by(CommissionStructure.id).offset(skip).limit(limit).all()
    return {
        "items": [CommissionStructureResponse.model_validate(s) for s in structures],
        "total": total,
    }


@router.post("/commission/structures", status_code=201, response_model=CommissionStructureResponse)
def create_commission_structure(
    payload: CommissionStructureCreate,
    db: Session = Depends(get_db),
):
    """Create a new commission structure. (hr / finance / super_admin)"""
    structure = CommissionStructure(
        name=payload.name,
        description=payload.description,
        commission_type=payload.commission_type,
        flat_amount=payload.flat_amount,
        percentage_rate=payload.percentage_rate,
        tiers_json=payload.tiers_json,
        monthly_target=payload.monthly_target,
        is_active=payload.is_active,
    )
    db.add(structure)
    db.commit()
    db.refresh(structure)
    return CommissionStructureResponse.model_validate(structure)


@router.get("/commission/structures/calculate", response_model=CommissionCalculateResponse)
def calculate_commission(
    structure_id: int = Query(...),
    deal_value: float = Query(0.0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Calculate the commission amount for a given structure and deal value.
    Useful for previewing before logging an entry.
    """
    structure = db.query(CommissionStructure).filter(CommissionStructure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Commission structure not found")

    commission_amount, notes = _calculate_amount(structure, deal_value)

    return CommissionCalculateResponse(
        structure_id=structure.id,
        structure_name=structure.name,
        commission_type=structure.commission_type,
        deal_value=deal_value,
        commission_amount=commission_amount,
        notes=notes,
    )


@router.get("/commission/structures/{structure_id}", response_model=CommissionStructureResponse)
def get_commission_structure(structure_id: int, db: Session = Depends(get_db)):
    """Get a single commission structure by ID."""
    structure = db.query(CommissionStructure).filter(CommissionStructure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Commission structure not found")
    return CommissionStructureResponse.model_validate(structure)


@router.put("/commission/structures/{structure_id}", response_model=CommissionStructureResponse)
def update_commission_structure(
    structure_id: int,
    payload: CommissionStructureUpdate,
    db: Session = Depends(get_db),
):
    """Update a commission structure."""
    structure = db.query(CommissionStructure).filter(CommissionStructure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Commission structure not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(structure, field, value)

    db.commit()
    db.refresh(structure)
    return CommissionStructureResponse.model_validate(structure)


# ─────────────────────────────────────────────
# Employee Commission Assignments
# ─────────────────────────────────────────────

@router.post("/commission/employees/{emp_id}/assign", status_code=201, response_model=CommissionAssignmentResponse)
def assign_commission_structure(
    emp_id: int,
    payload: CommissionAssignmentCreate,
    db: Session = Depends(get_db),
):
    """Assign a commission structure to an employee."""
    emp = db.query(Employee).filter(Employee.id == emp_id, Employee.is_active == True).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    structure = db.query(CommissionStructure).filter(CommissionStructure.id == payload.commission_structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Commission structure not found")

    # Deactivate existing active assignments for this employee
    db.query(EmployeeCommissionAssignment).filter(
        EmployeeCommissionAssignment.employee_id == emp_id,
        EmployeeCommissionAssignment.is_active == True,
    ).update({"is_active": False})

    assignment = EmployeeCommissionAssignment(
        employee_id=emp_id,
        commission_structure_id=payload.commission_structure_id,
        effective_from=payload.effective_from,
        effective_to=payload.effective_to,
        is_active=payload.is_active,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return CommissionAssignmentResponse.model_validate(assignment)


@router.get("/commission/employees/{emp_id}/assignment", response_model=CommissionAssignmentResponse)
def get_employee_commission_assignment(emp_id: int, db: Session = Depends(get_db)):
    """Get the current active commission assignment for an employee."""
    assignment = (
        db.query(EmployeeCommissionAssignment)
        .filter(
            EmployeeCommissionAssignment.employee_id == emp_id,
            EmployeeCommissionAssignment.is_active == True,
        )
        .order_by(EmployeeCommissionAssignment.effective_from.desc())
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="No active commission assignment found for this employee")
    return CommissionAssignmentResponse.model_validate(assignment)


# ─────────────────────────────────────────────
# Commission Entries
# ─────────────────────────────────────────────

@router.get("/commission/entries", response_model=dict)
def list_commission_entries(
    employee_id: Optional[int] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List commission entries with optional filters."""
    query = db.query(CommissionEntry)
    if employee_id is not None:
        query = query.filter(CommissionEntry.employee_id == employee_id)
    if month is not None:
        query = query.filter(CommissionEntry.month == month)
    if year is not None:
        query = query.filter(CommissionEntry.year == year)
    if status is not None:
        query = query.filter(CommissionEntry.status == status)

    total = query.count()
    entries = query.order_by(CommissionEntry.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "items": [CommissionEntryResponse.model_validate(e) for e in entries],
        "total": total,
    }


@router.post("/commission/entries", status_code=201, response_model=CommissionEntryResponse)
def create_commission_entry(
    payload: CommissionEntryCreate,
    db: Session = Depends(get_db),
):
    """Log a new commission entry for an employee."""
    emp = db.query(Employee).filter(Employee.id == payload.employee_id, Employee.is_active == True).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if payload.commission_structure_id is not None:
        structure = db.query(CommissionStructure).filter(
            CommissionStructure.id == payload.commission_structure_id
        ).first()
        if not structure:
            raise HTTPException(status_code=404, detail="Commission structure not found")

    entry = CommissionEntry(
        employee_id=payload.employee_id,
        commission_structure_id=payload.commission_structure_id,
        month=payload.month,
        year=payload.year,
        description=payload.description,
        deal_value=payload.deal_value,
        commission_amount=payload.commission_amount,
        notes=payload.notes,
        status="pending",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return CommissionEntryResponse.model_validate(entry)


@router.get("/commission/entries/{entry_id}", response_model=CommissionEntryResponse)
def get_commission_entry(entry_id: int, db: Session = Depends(get_db)):
    """Get a single commission entry by ID."""
    entry = db.query(CommissionEntry).filter(CommissionEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Commission entry not found")
    return CommissionEntryResponse.model_validate(entry)


@router.put("/commission/entries/{entry_id}/approve", response_model=CommissionEntryResponse)
def approve_or_reject_entry(
    entry_id: int,
    payload: CommissionApprovalRequest,
    approver_id: int = Query(..., description="ID of the approving employee"),
    db: Session = Depends(get_db),
):
    """Approve or reject a commission entry."""
    entry = db.query(CommissionEntry).filter(CommissionEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Commission entry not found")

    if entry.status not in ("pending",):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve/reject entry with status '{entry.status}'. Only 'pending' entries can be acted on.",
        )

    approver = db.query(Employee).filter(Employee.id == approver_id).first()
    if not approver:
        raise HTTPException(status_code=404, detail="Approver not found")

    entry.status = payload.action  # "approved" or "rejected"
    entry.approved_by = approver_id
    entry.approved_at = datetime.utcnow()
    if payload.notes:
        entry.notes = payload.notes

    db.commit()
    db.refresh(entry)
    return CommissionEntryResponse.model_validate(entry)


# ─────────────────────────────────────────────
# Monthly Summary
# ─────────────────────────────────────────────

@router.get("/commission/employees/{emp_id}/summary", response_model=MonthlyCommissionSummary)
def get_monthly_commission_summary(
    emp_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    db: Session = Depends(get_db),
):
    """Get monthly commission summary for an employee."""
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    entries = (
        db.query(CommissionEntry)
        .filter(
            CommissionEntry.employee_id == emp_id,
            CommissionEntry.month == month,
            CommissionEntry.year == year,
        )
        .all()
    )

    total = sum(e.commission_amount for e in entries)
    approved = sum(e.commission_amount for e in entries if e.status == "approved")
    pending = sum(e.commission_amount for e in entries if e.status == "pending")
    paid = sum(e.commission_amount for e in entries if e.status == "paid")

    return MonthlyCommissionSummary(
        employee_id=emp_id,
        employee_name=emp.full_name,
        month=month,
        year=year,
        total_commission=round(total, 2),
        approved_commission=round(approved, 2),
        pending_commission=round(pending, 2),
        paid_commission=round(paid, 2),
        entries=[CommissionEntryResponse.model_validate(e) for e in entries],
    )


# ─────────────────────────────────────────────
# Internal helper
# ─────────────────────────────────────────────

def _calculate_amount(structure: CommissionStructure, deal_value: float) -> tuple[float, str]:
    """Return (commission_amount, notes) for a structure + deal value."""
    ctype = structure.commission_type

    if ctype == CommissionType.FLAT:
        amt = structure.flat_amount or 0.0
        return round(amt, 2), f"Flat commission: ₹{amt:,.2f} per deal"

    elif ctype == CommissionType.PERCENTAGE:
        rate = structure.percentage_rate or 0.0
        amt = round(deal_value * rate / 100, 2)
        return amt, f"{rate}% of deal value ₹{deal_value:,.2f} = ₹{amt:,.2f}"

    elif ctype == CommissionType.TIERED:
        if not structure.tiers_json:
            return 0.0, "No tiers defined"
        try:
            tiers = json.loads(structure.tiers_json)
        except (json.JSONDecodeError, TypeError):
            return 0.0, "Invalid tiers configuration"
        applicable_rate = 0.0
        for tier in tiers:
            min_s = tier.get("min_sales", 0)
            max_s = tier.get("max_sales")
            rate = tier.get("rate", 0)
            if deal_value >= min_s and (max_s is None or deal_value <= max_s):
                applicable_rate = rate
        amt = round(deal_value * applicable_rate / 100, 2)
        return amt, f"Tiered rate {applicable_rate}% on ₹{deal_value:,.2f} = ₹{amt:,.2f}"

    elif ctype == CommissionType.TARGET_BONUS:
        target = structure.monthly_target or 0.0
        if deal_value >= target:
            bonus = structure.flat_amount or 0.0
            return round(bonus, 2), f"Target bonus ₹{bonus:,.2f} (target ₹{target:,.2f} achieved)"
        return 0.0, f"Target ₹{target:,.2f} not yet achieved (current ₹{deal_value:,.2f})"

    return 0.0, "Unknown commission type"
