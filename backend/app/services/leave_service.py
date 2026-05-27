"""
Leave management business logic service.
"""
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.leave import (
    LeaveEntitlement, LeaveRequest, LeaveApproval,
    LeaveStatus, ApprovalAction, LeaveType
)
from app.models.payroll import Holiday
from app.models.employee import Employee


def calculate_working_days(from_date: date, to_date: date, holidays: List[date]) -> float:
    """
    Calculate working days between two dates (inclusive), excluding weekends and holidays.
    Monday=0 ... Sunday=6
    """
    if from_date > to_date:
        return 0.0

    holiday_set = set(holidays)
    total = 0
    current = from_date
    while current <= to_date:
        # 5=Saturday, 6=Sunday
        if current.weekday() < 5 and current not in holiday_set:
            total += 1
        current += timedelta(days=1)
    return float(total)


def get_holidays_for_range(db: Session, from_date: date, to_date: date, country: str = "india") -> List[date]:
    """Fetch active holiday dates in range for a country."""
    holidays = (
        db.query(Holiday)
        .filter(
            Holiday.is_active == True,
            Holiday.country == country,
            Holiday.date >= from_date,
            Holiday.date <= to_date,
        )
        .all()
    )
    return [h.date for h in holidays]


def get_leave_balance(db: Session, employee_id: int, leave_type_id: int, year: int) -> Optional[LeaveEntitlement]:
    """Get leave entitlement record for an employee for given leave type and year."""
    return (
        db.query(LeaveEntitlement)
        .filter(
            LeaveEntitlement.employee_id == employee_id,
            LeaveEntitlement.leave_type_id == leave_type_id,
            LeaveEntitlement.year == year,
        )
        .first()
    )


def get_all_leave_balances(db: Session, employee_id: int, year: int) -> List[LeaveEntitlement]:
    """Get all leave balances for an employee for a given year."""
    return (
        db.query(LeaveEntitlement)
        .filter(
            LeaveEntitlement.employee_id == employee_id,
            LeaveEntitlement.year == year,
        )
        .all()
    )


def validate_leave_request(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    from_date: date,
    to_date: date,
    exclude_request_id: Optional[int] = None,
) -> Tuple[bool, str, float]:
    """
    Validate a leave request. Returns (is_valid, error_message, calculated_days).
    """
    if from_date > to_date:
        return False, "from_date must be before or equal to to_date", 0.0

    # Fetch leave type
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id, LeaveType.is_active == True).first()
    if not leave_type:
        return False, "Invalid or inactive leave type", 0.0

    # Calculate working days
    holidays = get_holidays_for_range(db, from_date, to_date)
    working_days = calculate_working_days(from_date, to_date, holidays)

    if working_days <= 0:
        return False, "No working days in the selected date range", 0.0

    year = from_date.year

    # Check overlap with existing active requests
    overlap_query = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status.in_([LeaveStatus.submitted, LeaveStatus.approved]),
            LeaveRequest.from_date <= to_date,
            LeaveRequest.to_date >= from_date,
        )
    )
    if exclude_request_id:
        overlap_query = overlap_query.filter(LeaveRequest.id != exclude_request_id)

    overlapping = overlap_query.first()
    if overlapping:
        return False, f"Leave request overlaps with existing request (ID: {overlapping.id})", 0.0

    # For paid leave types, check balance
    if leave_type.is_paid and leave_type.code not in ("ML", "PTL", "BL"):
        entitlement = get_leave_balance(db, employee_id, leave_type_id, year)
        if not entitlement:
            return False, f"No leave entitlement found for {leave_type.code} in year {year}", 0.0
        if entitlement.available_days < working_days:
            return (
                False,
                f"Insufficient {leave_type.code} balance. Available: {entitlement.available_days}, Requested: {working_days}",
                working_days,
            )

    return True, "", working_days


def process_leave_approval(
    db: Session,
    leave_request_id: int,
    approver_id: int,
    action: str,
    comments: Optional[str] = None,
    rejected_reason: Optional[str] = None,
) -> Tuple[bool, str]:
    """
    Process approval or rejection of a leave request.
    Returns (success, message).
    """
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.id == leave_request_id).first()
    if not leave_request:
        return False, "Leave request not found"

    if leave_request.status not in (LeaveStatus.submitted,):
        return False, f"Cannot process leave in status: {leave_request.status}"

    approver = db.query(Employee).filter(Employee.id == approver_id).first()
    if not approver:
        return False, "Approver not found"

    # Determine level based on approver's role
    level_map = {"manager": 1, "hr": 3, "super_admin": 3, "finance": 2}
    level = level_map.get(approver.role.value, 1)

    # Create approval record
    approval_action = ApprovalAction.approved if action == "approved" else ApprovalAction.rejected
    approval = LeaveApproval(
        leave_request_id=leave_request_id,
        approver_id=approver_id,
        level=level,
        action=approval_action,
        comments=comments,
    )
    db.add(approval)

    if action == "approved":
        leave_request.status = LeaveStatus.approved
        leave_request.approved_by = approver_id

        # Deduct from entitlement
        year = leave_request.from_date.year
        entitlement = get_leave_balance(
            db, leave_request.employee_id, leave_request.leave_type_id, year
        )
        if entitlement:
            entitlement.used_days += leave_request.total_days

    elif action == "rejected":
        leave_request.status = LeaveStatus.rejected
        leave_request.rejected_reason = rejected_reason or comments

    leave_request.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(leave_request)
    return True, f"Leave request {action} successfully"


def apply_carry_forward(db: Session, year: int) -> int:
    """
    Apply carry-forward for all employees at year end.
    Returns number of entitlements updated.
    """
    next_year = year + 1
    entitlements = (
        db.query(LeaveEntitlement)
        .filter(LeaveEntitlement.year == year)
        .all()
    )

    updated = 0
    for ent in entitlements:
        leave_type = db.query(LeaveType).filter(LeaveType.id == ent.leave_type_id).first()
        if not leave_type:
            continue

        carry = min(ent.available_days, leave_type.max_carry_forward)

        # Check if next year entitlement already exists
        next_year_ent = get_leave_balance(db, ent.employee_id, ent.leave_type_id, next_year)
        if next_year_ent:
            next_year_ent.carried_forward += carry
        else:
            new_ent = LeaveEntitlement(
                employee_id=ent.employee_id,
                leave_type_id=ent.leave_type_id,
                year=next_year,
                total_days=leave_type.annual_entitlement,
                used_days=0.0,
                carried_forward=carry,
                encashed_days=0.0,
            )
            db.add(new_ent)
        updated += 1

    db.commit()
    return updated


def monthly_el_accrual(db: Session, employee_id: int, month: int, year: int) -> float:
    """
    Add 1.75 EL days per month for an employee (Earned Leave accrual).
    Returns the new available days.
    """
    el_type = db.query(LeaveType).filter(LeaveType.code == "EL").first()
    if not el_type:
        return 0.0

    entitlement = get_leave_balance(db, employee_id, el_type.id, year)
    accrual = 1.75

    if entitlement:
        entitlement.total_days += accrual
        db.commit()
        db.refresh(entitlement)
        return entitlement.available_days
    else:
        new_ent = LeaveEntitlement(
            employee_id=employee_id,
            leave_type_id=el_type.id,
            year=year,
            total_days=accrual,
            used_days=0.0,
            carried_forward=0.0,
            encashed_days=0.0,
        )
        db.add(new_ent)
        db.commit()
        db.refresh(new_ent)
        return new_ent.available_days


def cancel_leave_request(db: Session, leave_request_id: int, employee_id: int) -> Tuple[bool, str]:
    """
    Cancel a leave request. If already approved, also restore the balance.
    """
    leave_request = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.id == leave_request_id,
            LeaveRequest.employee_id == employee_id,
        )
        .first()
    )
    if not leave_request:
        return False, "Leave request not found"

    if leave_request.status in (LeaveStatus.cancelled, LeaveStatus.rejected, LeaveStatus.completed):
        return False, f"Cannot cancel leave in status: {leave_request.status}"

    was_approved = leave_request.status == LeaveStatus.approved

    leave_request.status = LeaveStatus.cancelled
    leave_request.updated_at = datetime.utcnow()

    # Restore balance if was approved
    if was_approved:
        year = leave_request.from_date.year
        entitlement = get_leave_balance(
            db, employee_id, leave_request.leave_type_id, year
        )
        if entitlement:
            entitlement.used_days = max(0.0, entitlement.used_days - leave_request.total_days)

    db.commit()
    return True, "Leave request cancelled successfully"
