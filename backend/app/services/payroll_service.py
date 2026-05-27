"""
Payroll processing service: salary slip generation, pro-rata calculations,
leave encashment, and full & final settlement.
"""
import calendar
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy.orm import Session

from app.models.payroll import PayrollCycle, SalarySlip, SlipStatus, PayrollStatus
from app.models.salary import SalaryStructure
from app.models.employee import Employee
from app.models.leave import LeaveRequest, LeaveStatus, LeaveEntitlement, LeaveType
from app.models.commission import CommissionEntry
from app.services.tax_service import calculate_all_deductions, calculate_pf
from app.services.leave_service import get_holidays_for_range, calculate_working_days


def get_active_salary_structure(db: Session, employee_id: int, as_of: date) -> Optional[SalaryStructure]:
    """Get the currently active salary structure for an employee as of a given date."""
    return (
        db.query(SalaryStructure)
        .filter(
            SalaryStructure.employee_id == employee_id,
            SalaryStructure.is_active == True,
            SalaryStructure.effective_from <= as_of,
        )
        .order_by(SalaryStructure.effective_from.desc())
        .first()
    )


def calculate_pro_rata(monthly_salary: float, worked_days: float, total_working_days: float) -> float:
    """
    Calculate pro-rata salary based on working days.
    pro_rata = monthly_salary * (worked_days / total_working_days)
    """
    if total_working_days <= 0:
        return 0.0
    return round(monthly_salary * (worked_days / total_working_days), 2)


def calculate_leave_encashment(db: Session, employee_id: int, days: float) -> float:
    """
    Calculate leave encashment amount.
    Encashment = (basic_salary / 26) * days  (26 working days per month standard)
    """
    today = date.today()
    salary = get_active_salary_structure(db, employee_id, today)
    if not salary:
        return 0.0
    daily_rate = salary.basic_salary / 26.0
    return round(daily_rate * days, 2)


def get_unpaid_leave_days_in_cycle(db: Session, employee_id: int, cycle: PayrollCycle) -> float:
    """
    Calculate unpaid leave (LWP) days for an employee in a payroll cycle.
    Looks for approved LWP leaves that overlap with the cycle period.
    """
    lwp_type = db.query(LeaveType).filter(LeaveType.code == "LWP").first()
    if not lwp_type:
        return 0.0

    lwp_requests = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.leave_type_id == lwp_type.id,
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.from_date <= cycle.end_date,
            LeaveRequest.to_date >= cycle.start_date,
        )
        .all()
    )

    total_lwp = 0.0
    for req in lwp_requests:
        # Intersect with cycle period
        overlap_start = max(req.from_date, cycle.start_date)
        overlap_end = min(req.to_date, cycle.end_date)
        holidays = get_holidays_for_range(db, overlap_start, overlap_end)
        lwp_days = calculate_working_days(overlap_start, overlap_end, holidays)
        total_lwp += lwp_days

    return total_lwp


def get_total_working_days_in_cycle(db: Session, cycle: PayrollCycle) -> float:
    """Calculate total working days in the payroll cycle (exclude weekends + holidays)."""
    holidays = get_holidays_for_range(db, cycle.start_date, cycle.end_date)
    return calculate_working_days(cycle.start_date, cycle.end_date, holidays)


def get_ytd_totals(db: Session, employee_id: int, year: int, current_month: int) -> Dict[str, float]:
    """Get year-to-date earnings, deductions, and tax up to (but not including) current month."""
    # Get all cycles for this year up to previous month
    prior_cycles = (
        db.query(PayrollCycle)
        .filter(
            PayrollCycle.year == year,
            PayrollCycle.month < current_month,
        )
        .all()
    )

    ytd_earnings = 0.0
    ytd_deductions = 0.0
    ytd_tax = 0.0

    for cycle in prior_cycles:
        slip = (
            db.query(SalarySlip)
            .filter(
                SalarySlip.payroll_cycle_id == cycle.id,
                SalarySlip.employee_id == employee_id,
                SalarySlip.status != SlipStatus.draft,
            )
            .first()
        )
        if slip:
            ytd_earnings += slip.gross_earnings
            ytd_deductions += slip.total_deductions
            ytd_tax += slip.income_tax

    return {
        "ytd_earnings": round(ytd_earnings, 2),
        "ytd_deductions": round(ytd_deductions, 2),
        "ytd_tax": round(ytd_tax, 2),
    }


def generate_salary_slip(db: Session, payroll_cycle_id: int, employee_id: int) -> SalarySlip:
    """
    Generate (or regenerate) a salary slip for an employee in a payroll cycle.
    Full calculation including earnings, deductions, LWP deductions, and YTD.
    """
    cycle = db.query(PayrollCycle).filter(PayrollCycle.id == payroll_cycle_id).first()
    if not cycle:
        raise ValueError(f"Payroll cycle {payroll_cycle_id} not found")

    employee = db.query(Employee).filter(Employee.id == employee_id, Employee.is_active == True).first()
    if not employee:
        raise ValueError(f"Employee {employee_id} not found or inactive")

    salary = get_active_salary_structure(db, employee_id, cycle.start_date)
    if not salary:
        raise ValueError(f"No salary structure found for employee {employee_id}")

    # --- Earnings ---
    basic = salary.basic_salary
    hra = salary.hra_amount
    da = salary.da_amount
    conveyance = salary.conveyance_allowance
    medical = salary.medical_allowance
    special = salary.special_allowance
    lta = salary.lta_monthly
    other = salary.other_allowances
    gross = salary.gross_salary

    # --- LWP deduction ---
    total_working_days = get_total_working_days_in_cycle(db, cycle)
    lwp_days = get_unpaid_leave_days_in_cycle(db, employee_id, cycle)
    worked_days = max(0.0, total_working_days - lwp_days)

    # Pro-rata if LWP
    if lwp_days > 0 and total_working_days > 0:
        factor = worked_days / total_working_days
        basic_paid = round(basic * factor, 2)
        hra_paid = round(hra * factor, 2)
        da_paid = round(da * factor, 2)
        conveyance_paid = round(conveyance * factor, 2)
        medical_paid = round(medical * factor, 2)
        special_paid = round(special * factor, 2)
        lta_paid = round(lta * factor, 2)
        other_paid = round(other * factor, 2)
        gross_paid = round(
            basic_paid + hra_paid + da_paid + conveyance_paid +
            medical_paid + special_paid + lta_paid + other_paid,
            2
        )
        lwp_deduction = round(gross - gross_paid, 2)
    else:
        basic_paid = basic
        hra_paid = hra
        da_paid = da
        conveyance_paid = conveyance
        medical_paid = medical
        special_paid = special
        lta_paid = lta
        other_paid = other
        gross_paid = gross
        lwp_deduction = 0.0

    # --- Commission ---
    commission_entries = (
        db.query(CommissionEntry)
        .filter(
            CommissionEntry.employee_id == employee_id,
            CommissionEntry.month == cycle.month,
            CommissionEntry.year == cycle.year,
            CommissionEntry.status == "approved",
        )
        .all()
    )
    commission_amount = round(sum(e.commission_amount for e in commission_entries), 2)

    # Add commission to gross
    gross_paid_with_commission = round(gross_paid + commission_amount, 2)

    # --- Tax & statutory deductions ---
    annual_gross = gross_paid_with_commission * 12  # approximate annual
    deductions = calculate_all_deductions(
        basic_salary=basic_paid,
        da_amount=da_paid,
        gross_salary=gross_paid_with_commission,
        annual_gross=annual_gross,
        state=employee.state,
    )

    total_deductions = round(
        deductions["pf_employee"]
        + deductions["esi_employee"]
        + deductions["professional_tax"]
        + deductions["income_tax"],
        2,
    )
    net_pay = round(gross_paid_with_commission - total_deductions, 2)

    # --- YTD ---
    ytd = get_ytd_totals(db, employee_id, cycle.year, cycle.month)

    # --- Create or update slip ---
    existing_slip = (
        db.query(SalarySlip)
        .filter(
            SalarySlip.payroll_cycle_id == payroll_cycle_id,
            SalarySlip.employee_id == employee_id,
        )
        .first()
    )

    if existing_slip:
        slip = existing_slip
    else:
        slip = SalarySlip(
            payroll_cycle_id=payroll_cycle_id,
            employee_id=employee_id,
        )
        db.add(slip)

    slip.basic_salary = basic_paid
    slip.hra = hra_paid
    slip.da = da_paid
    slip.conveyance = conveyance_paid
    slip.medical = medical_paid
    slip.special_allowance = special_paid
    slip.lta = lta_paid
    slip.other_allowances = other_paid
    slip.commission_amount = commission_amount
    slip.gross_earnings = gross_paid_with_commission
    slip.pf_employee = deductions["pf_employee"]
    slip.pf_employer = deductions["pf_employer"]
    slip.esi_employee = deductions["esi_employee"]
    slip.esi_employer = deductions["esi_employer"]
    slip.professional_tax = deductions["professional_tax"]
    slip.income_tax = deductions["income_tax"]
    slip.other_deductions = 0.0
    slip.total_deductions = total_deductions
    slip.net_pay = net_pay
    slip.unpaid_leave_days = lwp_days
    slip.unpaid_leave_deduction = lwp_deduction
    slip.ytd_earnings = ytd["ytd_earnings"] + gross_paid_with_commission
    slip.ytd_deductions = ytd["ytd_deductions"] + total_deductions
    slip.ytd_tax = ytd["ytd_tax"] + deductions["income_tax"]
    slip.status = SlipStatus.draft

    # Mark commission entries as linked to this payroll cycle
    for ce in commission_entries:
        ce.payroll_cycle_id = payroll_cycle_id

    db.commit()
    db.refresh(slip)
    return slip


def generate_full_and_final(db: Session, employee_id: int, exit_date: date) -> Dict[str, Any]:
    """
    Generate Full & Final settlement for a departing employee.
    Calculates:
    - Salary for partial month worked
    - EL encashment
    - Gratuity (if applicable: >= 5 years service)
    - PF summary
    - Outstanding loan
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    salary = get_active_salary_structure(db, employee_id, exit_date)
    if not salary:
        raise ValueError(f"No salary structure for employee {employee_id}")

    # Partial month salary
    month_start = exit_date.replace(day=1)
    holidays = get_holidays_for_range(db, month_start, exit_date)
    days_worked = calculate_working_days(month_start, exit_date, holidays)

    # Total working days in exit month
    last_day = exit_date.replace(day=calendar.monthrange(exit_date.year, exit_date.month)[1])
    all_holidays = get_holidays_for_range(db, month_start, last_day)
    total_days_in_month = calculate_working_days(month_start, last_day, all_holidays)

    partial_salary = calculate_pro_rata(salary.gross_salary, days_worked, total_days_in_month)

    # EL encashment
    el_type = db.query(LeaveType).filter(LeaveType.code == "EL").first()
    el_encashment = 0.0
    el_days = 0.0
    if el_type:
        el_ent = (
            db.query(LeaveEntitlement)
            .filter(
                LeaveEntitlement.employee_id == employee_id,
                LeaveEntitlement.leave_type_id == el_type.id,
                LeaveEntitlement.year == exit_date.year,
            )
            .first()
        )
        if el_ent and el_ent.available_days > 0:
            el_days = el_ent.available_days
            el_encashment = calculate_leave_encashment(db, employee_id, el_days)

    # Gratuity: eligible if >= 5 years; formula = (last_basic * 15 / 26) * years_of_service
    gratuity = 0.0
    if employee.date_of_joining:
        years_of_service = (exit_date - employee.date_of_joining).days / 365.25
        if years_of_service >= 5:
            gratuity = round((salary.basic_salary * 15 / 26) * years_of_service, 2)

    # Service summary
    years_of_service = 0.0
    if employee.date_of_joining:
        years_of_service = round((exit_date - employee.date_of_joining).days / 365.25, 2)

    total_payout = round(partial_salary + el_encashment + gratuity, 2)

    return {
        "employee_id": employee_id,
        "employee_name": employee.full_name,
        "exit_date": exit_date.isoformat(),
        "years_of_service": years_of_service,
        "partial_month_salary": partial_salary,
        "days_worked_in_exit_month": days_worked,
        "el_days_encashed": el_days,
        "el_encashment_amount": el_encashment,
        "gratuity": gratuity,
        "total_payout": total_payout,
        "gross_monthly_salary": salary.gross_salary,
        "basic_salary": salary.basic_salary,
    }
