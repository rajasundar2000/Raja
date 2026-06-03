"""
Payroll router.
Handles payroll cycles, salary slip generation, and loan management.
"""
from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.payroll import (
    PayrollCycle, SalarySlip, Loan, LoanPayment,
    PayrollStatus, SlipStatus, LoanStatus
)
from app.models.commission import CommissionEntry
from app.schemas.payroll import (
    PayrollCycleCreate, PayrollCycleResponse,
    SalarySlipResponse,
    LoanCreate, LoanResponse,
)
from app.services.payroll_service import generate_salary_slip, generate_full_and_final

router = APIRouter(tags=["Payroll"])


# ================= Payroll Cycles =================

@router.post("/payroll-cycles", status_code=201)
def create_payroll_cycle(payload: PayrollCycleCreate, db: Session = Depends(get_db)):
    """Create a new payroll cycle."""
    # Check for existing cycle for the same month/year
    existing = db.query(PayrollCycle).filter(
        PayrollCycle.month == payload.month,
        PayrollCycle.year == payload.year,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Payroll cycle for {payload.month}/{payload.year} already exists"
        )

    cycle = PayrollCycle(
        month=payload.month,
        year=payload.year,
        status=PayrollStatus.draft,
        start_date=payload.start_date,
        end_date=payload.end_date,
        payment_date=payload.payment_date,
        cutoff_date=payload.cutoff_date,
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return _serialize_cycle(cycle)


@router.get("/payroll-cycles", response_model=dict)
def list_payroll_cycles(
    year: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List all payroll cycles."""
    query = db.query(PayrollCycle)
    if year:
        query = query.filter(PayrollCycle.year == year)
    if status:
        try:
            query = query.filter(PayrollCycle.status == PayrollStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    total = query.count()
    cycles = query.order_by(PayrollCycle.year.desc(), PayrollCycle.month.desc()).offset(skip).limit(limit).all()
    return {"items": [_serialize_cycle(c) for c in cycles], "total": total}


@router.get("/payroll-cycles/{cycle_id}")
def get_payroll_cycle(cycle_id: int, db: Session = Depends(get_db)):
    """Get a payroll cycle by ID."""
    cycle = db.query(PayrollCycle).filter(PayrollCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Payroll cycle not found")
    return _serialize_cycle(cycle)


@router.post("/payroll-cycles/{cycle_id}/generate")
def generate_payroll(
    cycle_id: int,
    employee_ids: Optional[list] = None,
    db: Session = Depends(get_db),
):
    """
    Generate salary slips for all active employees (or specified employees) in a payroll cycle.
    """
    cycle = db.query(PayrollCycle).filter(PayrollCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Payroll cycle not found")

    if cycle.status in (PayrollStatus.paid, PayrollStatus.locked):
        raise HTTPException(status_code=400, detail=f"Cannot generate slips for cycle in status: {cycle.status}")

    # Get employees to process
    query = db.query(Employee).filter(Employee.is_active == True)
    if employee_ids:
        query = query.filter(Employee.id.in_(employee_ids))

    employees = query.all()
    if not employees:
        raise HTTPException(status_code=404, detail="No active employees found")

    generated = []
    errors = []

    for emp in employees:
        try:
            slip = generate_salary_slip(db, cycle_id, emp.id)
            generated.append({
                "employee_id": emp.id,
                "employee_name": emp.full_name,
                "slip_id": slip.id,
                "net_pay": slip.net_pay,
            })
        except ValueError as e:
            errors.append({"employee_id": emp.id, "employee_name": emp.full_name, "error": str(e)})

    # Update cycle status
    if generated:
        cycle.status = PayrollStatus.processing
        cycle.processed_at = datetime.utcnow()
        db.commit()

    return {
        "cycle_id": cycle_id,
        "generated": len(generated),
        "errors": len(errors),
        "slips": generated,
        "error_details": errors,
    }


@router.get("/payroll-cycles/{cycle_id}/salary-slips", response_model=dict)
def list_cycle_salary_slips(
    cycle_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all salary slips for a payroll cycle."""
    cycle = db.query(PayrollCycle).filter(PayrollCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Payroll cycle not found")

    query = db.query(SalarySlip).filter(SalarySlip.payroll_cycle_id == cycle_id)
    if status:
        try:
            query = query.filter(SalarySlip.status == SlipStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    slips = query.all()
    return {
        "items": [_serialize_slip(s, cycle) for s in slips],
        "total": len(slips),
        "cycle": _serialize_cycle(cycle),
    }


@router.get("/salary-slips/{slip_id}")
def get_salary_slip(slip_id: int, db: Session = Depends(get_db)):
    """Get a salary slip by ID."""
    slip = db.query(SalarySlip).filter(SalarySlip.id == slip_id).first()
    if not slip:
        raise HTTPException(status_code=404, detail="Salary slip not found")
    cycle = slip.payroll_cycle
    return _serialize_slip(slip, cycle)


@router.post("/payroll-cycles/{cycle_id}/approve")
def approve_payroll_cycle(
    cycle_id: int,
    approver_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Approve a payroll cycle and all its salary slips."""
    cycle = db.query(PayrollCycle).filter(PayrollCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Payroll cycle not found")

    if cycle.status not in (PayrollStatus.processing, PayrollStatus.draft):
        raise HTTPException(status_code=400, detail=f"Cannot approve cycle in status: {cycle.status}")

    approver = db.query(Employee).filter(Employee.id == approver_id).first()
    if not approver:
        raise HTTPException(status_code=404, detail="Approver not found")

    # Approve all draft slips
    db.query(SalarySlip).filter(
        SalarySlip.payroll_cycle_id == cycle_id,
        SalarySlip.status == SlipStatus.draft,
    ).update({"status": SlipStatus.approved})

    cycle.status = PayrollStatus.approved
    cycle.approved_by = approver_id
    db.commit()
    db.refresh(cycle)

    return {
        "message": "Payroll cycle approved successfully",
        "cycle": _serialize_cycle(cycle),
    }


@router.post("/payroll-cycles/{cycle_id}/mark-paid")
def mark_payroll_paid(
    cycle_id: int,
    db: Session = Depends(get_db),
):
    """Mark an approved payroll cycle as paid and update linked commission entries."""
    cycle = db.query(PayrollCycle).filter(PayrollCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Payroll cycle not found")

    if cycle.status != PayrollStatus.approved:
        raise HTTPException(
            status_code=400,
            detail=f"Can only mark approved cycles as paid. Current status: {cycle.status}",
        )

    # Mark all salary slips as paid
    db.query(SalarySlip).filter(
        SalarySlip.payroll_cycle_id == cycle_id,
        SalarySlip.status == SlipStatus.approved,
    ).update({"status": SlipStatus.paid})

    # Mark linked commission entries as paid
    db.query(CommissionEntry).filter(
        CommissionEntry.payroll_cycle_id == cycle_id,
        CommissionEntry.status == "approved",
    ).update({"status": "paid"})

    cycle.status = PayrollStatus.paid
    cycle.payment_date = date.today()
    db.commit()
    db.refresh(cycle)

    # Fire-and-forget salary slip email notifications
    try:
        import calendar
        from app.services.email_service import send_salary_slip_email
        paid_slips = db.query(SalarySlip).filter(
            SalarySlip.payroll_cycle_id == cycle_id,
            SalarySlip.status == SlipStatus.paid,
        ).all()
        month_name = calendar.month_name[cycle.month]
        for slip in paid_slips:
            if slip.employee and slip.employee.email:
                try:
                    send_salary_slip_email(
                        to_email=slip.employee.email,
                        employee_name=slip.employee.full_name,
                        month=month_name,
                        year=cycle.year,
                        net_pay=slip.net_pay,
                    )
                except Exception:
                    pass
    except Exception:
        pass  # Email failures should not affect the payroll response

    return {
        "message": "Payroll cycle marked as paid",
        "cycle": _serialize_cycle(cycle),
    }


@router.get("/employees/{employee_id}/salary-slips", response_model=dict)
def list_employee_salary_slips(
    employee_id: int,
    year: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get all salary slips for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    query = db.query(SalarySlip).filter(SalarySlip.employee_id == employee_id)
    if year:
        query = query.join(PayrollCycle).filter(PayrollCycle.year == year)

    total = query.count()
    slips = (
        query.join(PayrollCycle)
        .order_by(PayrollCycle.year.desc(), PayrollCycle.month.desc())
        .offset(skip).limit(limit).all()
    )

    return {
        "items": [_serialize_slip(s, s.payroll_cycle) for s in slips],
        "total": total,
    }


# ================= Full & Final Settlement =================

@router.get("/employees/{employee_id}/full-and-final")
def get_full_and_final(
    employee_id: int,
    exit_date: date = Query(...),
    db: Session = Depends(get_db),
):
    """Calculate Full & Final settlement for an employee."""
    try:
        result = generate_full_and_final(db, employee_id, exit_date)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================= Loans =================

@router.post("/loans", status_code=201)
def create_loan(payload: LoanCreate, db: Session = Depends(get_db)):
    """Create a new loan request."""
    emp = db.query(Employee).filter(Employee.id == payload.employee_id, Employee.is_active == True).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Calculate EMI (simple division, no interest for 0% loans)
    if payload.interest_rate == 0:
        emi = round(payload.amount / payload.tenure_months, 2)
    else:
        # EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
        r = payload.interest_rate / 100 / 12
        n = payload.tenure_months
        emi = round(payload.amount * r * (1 + r) ** n / ((1 + r) ** n - 1), 2)

    loan = Loan(
        employee_id=payload.employee_id,
        loan_type=payload.loan_type,
        amount=payload.amount,
        interest_rate=payload.interest_rate,
        tenure_months=payload.tenure_months,
        emi_amount=emi,
        outstanding_balance=payload.amount,
        purpose=payload.purpose,
        status=LoanStatus.pending,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return _serialize_loan(loan)


@router.get("/loans", response_model=dict)
def list_loans(
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    loan_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List all loans with optional filters."""
    query = db.query(Loan)
    if employee_id:
        query = query.filter(Loan.employee_id == employee_id)
    if status:
        try:
            query = query.filter(Loan.status == LoanStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    if loan_type:
        query = query.filter(Loan.loan_type == loan_type)

    total = query.count()
    loans = query.order_by(Loan.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [_serialize_loan(l) for l in loans], "total": total}


@router.put("/loans/{loan_id}/approve")
def approve_loan(
    loan_id: int,
    approver_id: int = Query(...),
    action: str = Query(..., regex="^(approved|rejected)$"),
    disbursement_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Approve or reject a loan."""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if loan.status != LoanStatus.pending:
        raise HTTPException(status_code=400, detail=f"Can only approve/reject pending loans. Current: {loan.status}")

    approver = db.query(Employee).filter(Employee.id == approver_id).first()
    if not approver:
        raise HTTPException(status_code=404, detail="Approver not found")

    if action == "approved":
        loan.status = LoanStatus.active
        loan.approved_by = approver_id
        loan.disbursement_date = disbursement_date or date.today()
    else:
        loan.status = LoanStatus.rejected
        loan.approved_by = approver_id

    db.commit()
    db.refresh(loan)
    return {
        "message": f"Loan {action} successfully",
        "loan": _serialize_loan(loan),
    }


# ================= Serializers =================

def _serialize_cycle(cycle: PayrollCycle) -> dict:
    return {
        "id": cycle.id,
        "month": cycle.month,
        "year": cycle.year,
        "status": cycle.status,
        "start_date": cycle.start_date,
        "end_date": cycle.end_date,
        "payment_date": cycle.payment_date,
        "cutoff_date": cycle.cutoff_date,
        "created_at": cycle.created_at,
        "processed_at": cycle.processed_at,
        "approved_by": cycle.approved_by,
        "slip_count": len(cycle.salary_slips) if cycle.salary_slips else 0,
    }


def _serialize_slip(slip: SalarySlip, cycle: Optional[PayrollCycle] = None) -> dict:
    return {
        "id": slip.id,
        "payroll_cycle_id": slip.payroll_cycle_id,
        "employee_id": slip.employee_id,
        "employee_name": slip.employee.full_name if slip.employee else None,
        "basic_salary": slip.basic_salary,
        "hra": slip.hra,
        "da": slip.da,
        "conveyance": slip.conveyance,
        "medical": slip.medical,
        "special_allowance": slip.special_allowance,
        "lta": slip.lta,
        "other_allowances": slip.other_allowances,
        "gross_earnings": slip.gross_earnings,
        "commission_amount": slip.commission_amount,
        "pf_employee": slip.pf_employee,
        "pf_employer": slip.pf_employer,
        "esi_employee": slip.esi_employee,
        "esi_employer": slip.esi_employer,
        "professional_tax": slip.professional_tax,
        "income_tax": slip.income_tax,
        "other_deductions": slip.other_deductions,
        "total_deductions": slip.total_deductions,
        "net_pay": slip.net_pay,
        "unpaid_leave_days": slip.unpaid_leave_days,
        "unpaid_leave_deduction": slip.unpaid_leave_deduction,
        "ytd_earnings": slip.ytd_earnings,
        "ytd_deductions": slip.ytd_deductions,
        "ytd_tax": slip.ytd_tax,
        "status": slip.status,
        "created_at": slip.created_at,
        "month": cycle.month if cycle else None,
        "year": cycle.year if cycle else None,
    }


def _serialize_loan(loan: Loan) -> dict:
    return {
        "id": loan.id,
        "employee_id": loan.employee_id,
        "employee_name": loan.employee.full_name if loan.employee else None,
        "loan_type": loan.loan_type,
        "amount": loan.amount,
        "interest_rate": loan.interest_rate,
        "tenure_months": loan.tenure_months,
        "emi_amount": loan.emi_amount,
        "outstanding_balance": loan.outstanding_balance,
        "status": loan.status,
        "disbursement_date": loan.disbursement_date,
        "approved_by": loan.approved_by,
        "purpose": loan.purpose,
        "created_at": loan.created_at,
    }
