"""
Profile router.
Self-service endpoints for the authenticated employee's own data.
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.leave import LeaveEntitlement
from app.models.payroll import SalarySlip, PayrollCycle
from app.models.expense import ExpenseClaim
from app.auth import get_current_employee, verify_password, get_password_hash

router = APIRouter(prefix="/profile", tags=["Profile"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    bank_account_last4: Optional[str] = None
    bank_ifsc: Optional[str] = None
    address: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _serialize_employee(emp: Employee) -> dict:
    return {
        "id": emp.id,
        "employee_id": emp.employee_id,
        "full_name": emp.full_name,
        "email": emp.email,
        "phone": emp.phone,
        "department": emp.department,
        "designation": emp.designation,
        "date_of_joining": emp.date_of_joining,
        "date_of_birth": emp.date_of_birth,
        "role": emp.role.value if hasattr(emp.role, "value") else str(emp.role),
        "state": emp.state,
        "bank_account_last4": emp.bank_account_last4,
        "bank_ifsc": emp.bank_ifsc,
        "is_active": emp.is_active,
        "created_at": emp.created_at,
        "manager_name": emp.manager.full_name if emp.manager else None,
    }


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@router.get("")
def get_profile(
    current_user: Employee = Depends(get_current_employee),
):
    """Get the authenticated employee's own profile."""
    return _serialize_employee(current_user)


@router.put("")
def update_profile(
    body: ProfileUpdate,
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """
    Update the authenticated employee's own profile.
    Allowed fields: phone, bank_account_last4, bank_ifsc, address.
    """
    update_data = body.model_dump(exclude_unset=True)

    # Validate bank_account_last4
    if "bank_account_last4" in update_data and update_data["bank_account_last4"]:
        val = update_data["bank_account_last4"]
        if len(val) != 4 or not val.isdigit():
            raise HTTPException(status_code=400, detail="bank_account_last4 must be exactly 4 digits")

    # Note: 'address' is not a column on Employee; store in a note or skip gracefully
    # We'll just skip address if the model doesn't have it
    allowed_fields = {"phone", "bank_account_last4", "bank_ifsc"}
    for field, value in update_data.items():
        if field in allowed_fields and hasattr(current_user, field):
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return _serialize_employee(current_user)


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Change the authenticated employee's own password."""
    if not current_user.is_password_set or not current_user.password_hash:
        raise HTTPException(status_code=400, detail="No password set on this account")

    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.password_hash = get_password_hash(body.new_password)
    current_user.is_password_set = True
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/leave-balance")
def get_own_leave_balance(
    year: Optional[int] = None,
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Get the authenticated employee's leave balance for all leave types."""
    balance_year = year or date.today().year

    entitlements = (
        db.query(LeaveEntitlement)
        .filter(
            LeaveEntitlement.employee_id == current_user.id,
            LeaveEntitlement.year == balance_year,
        )
        .all()
    )

    result = []
    for ent in entitlements:
        result.append({
            "id": ent.id,
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
            } if ent.leave_type else None,
        })
    return {"items": result, "total": len(result), "year": balance_year}


@router.get("/salary-slips")
def get_own_salary_slips(
    year: Optional[int] = None,
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Get the authenticated employee's salary slips."""
    query = db.query(SalarySlip).filter(SalarySlip.employee_id == current_user.id)
    if year:
        query = query.join(PayrollCycle).filter(PayrollCycle.year == year)

    slips = (
        query.join(PayrollCycle)
        .order_by(PayrollCycle.year.desc(), PayrollCycle.month.desc())
        .all()
    )

    items = [
        {
            "id": s.id,
            "payroll_cycle_id": s.payroll_cycle_id,
            "month": s.payroll_cycle.month if s.payroll_cycle else None,
            "year": s.payroll_cycle.year if s.payroll_cycle else None,
            "basic_salary": s.basic_salary,
            "gross_earnings": s.gross_earnings,
            "total_deductions": s.total_deductions,
            "net_pay": s.net_pay,
            "status": s.status,
            "created_at": s.created_at,
        }
        for s in slips
    ]
    return {"items": items, "total": len(items)}


@router.get("/expenses")
def get_own_expenses(
    status: Optional[str] = None,
    year: Optional[int] = None,
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Get the authenticated employee's expense claims."""
    from sqlalchemy import extract

    query = db.query(ExpenseClaim).filter(ExpenseClaim.employee_id == current_user.id)
    if status:
        query = query.filter(ExpenseClaim.status == status)
    if year:
        query = query.filter(extract("year", ExpenseClaim.expense_date) == year)

    claims = query.order_by(ExpenseClaim.created_at.desc()).all()
    items = [
        {
            "id": c.id,
            "title": c.title,
            "category": c.category,
            "amount": c.amount,
            "expense_date": c.expense_date,
            "status": c.status,
            "created_at": c.created_at,
            "rejection_reason": c.rejection_reason,
        }
        for c in claims
    ]
    return {"items": items, "total": len(items)}
