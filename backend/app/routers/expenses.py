"""
Expense claims router.
Handles submission, review, and approval of employee expense claims.
"""
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from app.database import get_db
from app.models.employee import Employee, UserRole
from app.models.expense import ExpenseClaim, ExpenseCategory
from app.auth import get_current_employee, require_roles

router = APIRouter(prefix="/expenses", tags=["Expenses"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class ExpenseClaimCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: ExpenseCategory
    amount: float
    expense_date: date
    notes: Optional[str] = None


class ExpenseApprovalBody(BaseModel):
    action: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _serialize(claim: ExpenseClaim) -> dict:
    return {
        "id": claim.id,
        "employee_id": claim.employee_id,
        "employee_name": claim.employee.full_name if claim.employee else None,
        "title": claim.title,
        "description": claim.description,
        "category": claim.category,
        "amount": claim.amount,
        "expense_date": claim.expense_date,
        "receipt_path": claim.receipt_path,
        "status": claim.status,
        "approved_by": claim.approved_by,
        "approver_name": claim.approver.full_name if claim.approver else None,
        "approved_at": claim.approved_at,
        "rejection_reason": claim.rejection_reason,
        "payroll_cycle_id": claim.payroll_cycle_id,
        "created_at": claim.created_at,
    }


def _can_view_claim(claim: ExpenseClaim, current_user: Employee) -> bool:
    """Check if current_user is allowed to view this expense claim."""
    if current_user.role in (UserRole.hr, UserRole.super_admin, UserRole.finance):
        return True
    if claim.employee_id == current_user.id:
        return True
    # Manager can see their direct reports' claims
    if current_user.role == UserRole.manager:
        emp = claim.employee
        if emp and emp.manager_id == current_user.id:
            return True
    return False


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@router.get("", response_model=dict)
def list_expenses(
    status: Optional[str] = None,
    employee_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """
    List expense claims.
    - Employees see their own.
    - Managers see their team's.
    - HR/Finance/Admin see all.
    """
    query = db.query(ExpenseClaim)

    # Scope by role
    if current_user.role in (UserRole.hr, UserRole.super_admin, UserRole.finance):
        if employee_id:
            query = query.filter(ExpenseClaim.employee_id == employee_id)
    elif current_user.role == UserRole.manager:
        # Manager sees own + subordinates
        subordinate_ids = [s.id for s in current_user.subordinates] if current_user.subordinates else []
        subordinate_ids.append(current_user.id)
        query = query.filter(ExpenseClaim.employee_id.in_(subordinate_ids))
        if employee_id:
            query = query.filter(ExpenseClaim.employee_id == employee_id)
    else:
        query = query.filter(ExpenseClaim.employee_id == current_user.id)

    if status:
        query = query.filter(ExpenseClaim.status == status)
    if month:
        query = query.filter(extract("month", ExpenseClaim.expense_date) == month)
    if year:
        query = query.filter(extract("year", ExpenseClaim.expense_date) == year)

    total = query.count()
    claims = query.order_by(ExpenseClaim.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [_serialize(c) for c in claims], "total": total}


@router.post("", status_code=201)
def submit_expense_claim(
    body: ExpenseClaimCreate,
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Submit a new expense claim."""
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    claim = ExpenseClaim(
        employee_id=current_user.id,
        title=body.title,
        description=body.description or body.notes,
        category=body.category,
        amount=body.amount,
        expense_date=body.expense_date,
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return _serialize(claim)


@router.get("/summary")
def expense_summary(
    employee_id: Optional[int] = None,
    year: Optional[int] = None,
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """
    YTD expense summary by category for an employee.
    Defaults to current user if employee_id not specified.
    """
    target_year = year or date.today().year

    # Determine which employee to summarise
    if employee_id and employee_id != current_user.id:
        if current_user.role not in (UserRole.hr, UserRole.super_admin, UserRole.finance, UserRole.manager):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        target_id = employee_id
    else:
        target_id = current_user.id

    query = db.query(
        ExpenseClaim.category,
        func.sum(ExpenseClaim.amount).label("total"),
        func.count(ExpenseClaim.id).label("count"),
    ).filter(
        ExpenseClaim.employee_id == target_id,
        ExpenseClaim.status.in_(["approved", "paid"]),
        extract("year", ExpenseClaim.expense_date) == target_year,
    ).group_by(ExpenseClaim.category)

    rows = query.all()
    summary = [{"category": r.category, "total": r.total, "count": r.count} for r in rows]
    grand_total = sum(r["total"] for r in summary)

    return {
        "employee_id": target_id,
        "year": target_year,
        "summary": summary,
        "grand_total": grand_total,
    }


@router.get("/{claim_id}")
def get_expense_claim(
    claim_id: int,
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Get a single expense claim."""
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Expense claim not found")
    if not _can_view_claim(claim, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    return _serialize(claim)


@router.put("/{claim_id}/approve")
def approve_or_reject_expense(
    claim_id: int,
    body: ExpenseApprovalBody,
    current_user: Employee = Depends(require_roles(
        UserRole.manager, UserRole.hr, UserRole.super_admin, UserRole.finance
    )),
    db: Session = Depends(get_db),
):
    """Approve or reject an expense claim. Manager/HR/Finance only."""
    if body.action not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Action must be 'approved' or 'rejected'")

    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Expense claim not found")

    if claim.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Only pending claims can be approved/rejected. Current status: {claim.status}",
        )

    if body.action == "rejected" and not body.rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required when rejecting a claim")

    claim.status = body.action
    claim.approved_by = current_user.id
    claim.approved_at = datetime.utcnow()
    if body.action == "rejected":
        claim.rejection_reason = body.rejection_reason

    db.commit()
    db.refresh(claim)
    return {
        "message": f"Expense claim {body.action} successfully",
        "claim": _serialize(claim),
    }
