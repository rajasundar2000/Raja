"""
Reports router.
Leave utilization, payroll summaries, YTD data, and tax reports.
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.employee import Employee
from app.models.leave import LeaveType, LeaveEntitlement, LeaveRequest, LeaveStatus
from app.models.payroll import PayrollCycle, SalarySlip, SlipStatus
from app.models.salary import SalaryStructure

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/leave-utilization")
def leave_utilization_report(
    year: int = Query(default=None),
    department: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Company-wide leave utilization report.
    Shows leave taken vs. entitlement by leave type and department.
    """
    if not year:
        year = date.today().year

    # Get all leave types
    leave_types = db.query(LeaveType).filter(LeaveType.is_active == True).all()

    # Build query for entitlements
    query = (
        db.query(
            LeaveEntitlement,
            Employee.department,
            Employee.full_name,
            LeaveType.code,
            LeaveType.name,
        )
        .join(Employee, LeaveEntitlement.employee_id == Employee.id)
        .join(LeaveType, LeaveEntitlement.leave_type_id == LeaveType.id)
        .filter(
            LeaveEntitlement.year == year,
            Employee.is_active == True,
        )
    )

    if department:
        query = query.filter(Employee.department.ilike(f"%{department}%"))

    results = query.all()

    # Aggregate by department and leave type
    dept_summary = {}
    employee_summary = {}
    overall = {}

    for ent, dept, emp_name, lt_code, lt_name in results:
        # Department aggregation
        if dept not in dept_summary:
            dept_summary[dept] = {}
        if lt_code not in dept_summary[dept]:
            dept_summary[dept][lt_code] = {
                "leave_type": lt_name,
                "total_entitlement": 0.0,
                "used": 0.0,
                "available": 0.0,
                "utilization_pct": 0.0,
                "employee_count": 0,
            }
        dept_summary[dept][lt_code]["total_entitlement"] += ent.total_days + ent.carried_forward
        dept_summary[dept][lt_code]["used"] += ent.used_days
        dept_summary[dept][lt_code]["available"] += ent.available_days
        dept_summary[dept][lt_code]["employee_count"] += 1

        # Overall aggregation
        if lt_code not in overall:
            overall[lt_code] = {
                "leave_type": lt_name,
                "code": lt_code,
                "total_entitlement": 0.0,
                "used": 0.0,
                "available": 0.0,
                "employee_count": 0,
            }
        overall[lt_code]["total_entitlement"] += ent.total_days + ent.carried_forward
        overall[lt_code]["used"] += ent.used_days
        overall[lt_code]["available"] += ent.available_days
        overall[lt_code]["employee_count"] += 1

    # Compute utilization percentages
    for lt_code, data in overall.items():
        if data["total_entitlement"] > 0:
            data["utilization_pct"] = round(data["used"] / data["total_entitlement"] * 100, 1)

    for dept, dept_data in dept_summary.items():
        for lt_code, data in dept_data.items():
            if data["total_entitlement"] > 0:
                data["utilization_pct"] = round(data["used"] / data["total_entitlement"] * 100, 1)

    # Leave requests count by status
    request_stats = (
        db.query(
            LeaveRequest.status,
            func.count(LeaveRequest.id).label("count"),
        )
        .join(Employee, LeaveRequest.employee_id == Employee.id)
        .filter(
            func.extract("year", LeaveRequest.from_date) == year,
            Employee.is_active == True,
        )
        .group_by(LeaveRequest.status)
        .all()
    )

    return {
        "year": year,
        "department_filter": department,
        "overall_summary": list(overall.values()),
        "department_summary": {
            dept: list(data.values())
            for dept, data in dept_summary.items()
        },
        "request_status_counts": {
            str(row.status): row.count for row in request_stats
        },
    }


@router.get("/payroll-summary/{cycle_id}")
def payroll_summary_report(cycle_id: int, db: Session = Depends(get_db)):
    """
    Payroll summary report for a given payroll cycle.
    Total earnings, deductions, net pay, statutory contributions.
    """
    cycle = db.query(PayrollCycle).filter(PayrollCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Payroll cycle not found")

    slips = db.query(SalarySlip).filter(SalarySlip.payroll_cycle_id == cycle_id).all()

    if not slips:
        return {
            "cycle_id": cycle_id,
            "month": cycle.month,
            "year": cycle.year,
            "status": cycle.status,
            "message": "No salary slips generated yet",
            "totals": {},
            "employee_count": 0,
        }

    # Aggregate totals
    totals = {
        "gross_earnings": 0.0,
        "basic_salary": 0.0,
        "hra": 0.0,
        "da": 0.0,
        "conveyance": 0.0,
        "medical": 0.0,
        "special_allowance": 0.0,
        "lta": 0.0,
        "other_allowances": 0.0,
        "pf_employee": 0.0,
        "pf_employer": 0.0,
        "esi_employee": 0.0,
        "esi_employer": 0.0,
        "professional_tax": 0.0,
        "income_tax": 0.0,
        "total_deductions": 0.0,
        "net_pay": 0.0,
        "unpaid_leave_deduction": 0.0,
        "total_employer_cost": 0.0,  # gross + employer PF + employer ESI
    }

    department_breakdown = {}
    slip_details = []

    for slip in slips:
        for key in totals:
            if hasattr(slip, key):
                totals[key] += getattr(slip, key)

        totals["total_employer_cost"] += slip.gross_earnings + slip.pf_employer + slip.esi_employer

        emp = slip.employee
        dept = emp.department if emp else "Unknown"
        if dept not in department_breakdown:
            department_breakdown[dept] = {
                "department": dept,
                "employee_count": 0,
                "gross_earnings": 0.0,
                "net_pay": 0.0,
                "total_deductions": 0.0,
            }
        department_breakdown[dept]["employee_count"] += 1
        department_breakdown[dept]["gross_earnings"] += slip.gross_earnings
        department_breakdown[dept]["net_pay"] += slip.net_pay
        department_breakdown[dept]["total_deductions"] += slip.total_deductions

        slip_details.append({
            "slip_id": slip.id,
            "employee_id": slip.employee_id,
            "employee_name": emp.full_name if emp else "Unknown",
            "department": dept,
            "gross_earnings": slip.gross_earnings,
            "total_deductions": slip.total_deductions,
            "net_pay": slip.net_pay,
            "status": slip.status,
        })

    # Round all totals
    totals = {k: round(v, 2) for k, v in totals.items()}

    return {
        "cycle_id": cycle_id,
        "month": cycle.month,
        "year": cycle.year,
        "status": cycle.status,
        "payment_date": cycle.payment_date,
        "employee_count": len(slips),
        "totals": totals,
        "department_breakdown": list(department_breakdown.values()),
        "slip_details": slip_details,
    }


@router.get("/employee-ytd/{employee_id}")
def employee_ytd_report(
    employee_id: int,
    year: int = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Year-to-date (YTD) earnings and deductions report for an employee.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not year:
        year = date.today().year

    # Get all cycles for the year
    cycles = db.query(PayrollCycle).filter(PayrollCycle.year == year).all()
    cycle_ids = [c.id for c in cycles]

    slips = (
        db.query(SalarySlip)
        .filter(
            SalarySlip.employee_id == employee_id,
            SalarySlip.payroll_cycle_id.in_(cycle_ids),
        )
        .all()
    )

    monthly_data = []
    ytd_totals = {
        "gross_earnings": 0.0,
        "basic_salary": 0.0,
        "hra": 0.0,
        "da": 0.0,
        "pf_employee": 0.0,
        "pf_employer": 0.0,
        "esi_employee": 0.0,
        "esi_employer": 0.0,
        "professional_tax": 0.0,
        "income_tax": 0.0,
        "total_deductions": 0.0,
        "net_pay": 0.0,
    }

    # Map cycle_id -> cycle
    cycle_map = {c.id: c for c in cycles}

    for slip in sorted(slips, key=lambda s: (cycle_map[s.payroll_cycle_id].month if s.payroll_cycle_id in cycle_map else 0)):
        cycle = cycle_map.get(slip.payroll_cycle_id)
        month_data = {
            "month": cycle.month if cycle else None,
            "year": year,
            "gross_earnings": slip.gross_earnings,
            "basic_salary": slip.basic_salary,
            "hra": slip.hra,
            "da": slip.da,
            "pf_employee": slip.pf_employee,
            "pf_employer": slip.pf_employer,
            "esi_employee": slip.esi_employee,
            "esi_employer": slip.esi_employer,
            "professional_tax": slip.professional_tax,
            "income_tax": slip.income_tax,
            "total_deductions": slip.total_deductions,
            "net_pay": slip.net_pay,
            "status": slip.status,
        }
        monthly_data.append(month_data)

        for key in ytd_totals:
            if key in month_data:
                ytd_totals[key] += month_data[key]

    ytd_totals = {k: round(v, 2) for k, v in ytd_totals.items()}

    # Current salary structure
    salary = (
        db.query(SalaryStructure)
        .filter(
            SalaryStructure.employee_id == employee_id,
            SalaryStructure.is_active == True,
        )
        .order_by(SalaryStructure.effective_from.desc())
        .first()
    )

    return {
        "employee_id": employee_id,
        "employee_name": emp.full_name,
        "department": emp.department,
        "designation": emp.designation,
        "year": year,
        "months_processed": len(slips),
        "current_salary": {
            "gross_monthly": salary.gross_salary if salary else None,
            "basic": salary.basic_salary if salary else None,
            "annual_ctc": salary.annual_ctc if salary else None,
        },
        "ytd_totals": ytd_totals,
        "monthly_breakdown": monthly_data,
    }


@router.get("/tax-summary/{year}")
def tax_summary_report(
    year: int,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Annual tax (TDS) summary report for all employees for a given year.
    Useful for Form 16 preparation.
    """
    # Get all cycles for the year
    cycles = db.query(PayrollCycle).filter(PayrollCycle.year == year).all()
    cycle_ids = [c.id for c in cycles]
    cycle_map = {c.id: c for c in cycles}

    if not cycle_ids:
        return {
            "year": year,
            "message": "No payroll cycles found for this year",
            "employees": [],
            "total_tax_deducted": 0.0,
        }

    # Get all slips for the year
    query = (
        db.query(SalarySlip, Employee)
        .join(Employee, SalarySlip.employee_id == Employee.id)
        .filter(
            SalarySlip.payroll_cycle_id.in_(cycle_ids),
            SalarySlip.status != SlipStatus.draft,
        )
    )

    if department:
        query = query.filter(Employee.department.ilike(f"%{department}%"))

    results = query.all()

    # Aggregate by employee
    employee_tax_data = {}

    for slip, emp in results:
        if emp.id not in employee_tax_data:
            employee_tax_data[emp.id] = {
                "employee_id": emp.id,
                "employee_name": emp.full_name,
                "department": emp.department,
                "designation": emp.designation,
                "pan_number": emp.pan_number,
                "gross_earnings_ytd": 0.0,
                "pf_employee_ytd": 0.0,
                "pf_employer_ytd": 0.0,
                "esi_employee_ytd": 0.0,
                "esi_employer_ytd": 0.0,
                "professional_tax_ytd": 0.0,
                "income_tax_ytd": 0.0,
                "net_pay_ytd": 0.0,
                "months_paid": 0,
            }

        d = employee_tax_data[emp.id]
        d["gross_earnings_ytd"] += slip.gross_earnings
        d["pf_employee_ytd"] += slip.pf_employee
        d["pf_employer_ytd"] += slip.pf_employer
        d["esi_employee_ytd"] += slip.esi_employee
        d["esi_employer_ytd"] += slip.esi_employer
        d["professional_tax_ytd"] += slip.professional_tax
        d["income_tax_ytd"] += slip.income_tax
        d["net_pay_ytd"] += slip.net_pay
        d["months_paid"] += 1

    # Round all values
    employees_list = []
    total_tax = 0.0

    for emp_data in employee_tax_data.values():
        for key in emp_data:
            if isinstance(emp_data[key], float):
                emp_data[key] = round(emp_data[key], 2)
        # Estimated annual taxable income
        emp_data["estimated_annual_taxable"] = round(
            emp_data["gross_earnings_ytd"] / max(emp_data["months_paid"], 1) * 12, 2
        ) if emp_data["months_paid"] > 0 else 0.0
        total_tax += emp_data["income_tax_ytd"]
        employees_list.append(emp_data)

    return {
        "year": year,
        "department_filter": department,
        "total_employees": len(employees_list),
        "total_tax_deducted": round(total_tax, 2),
        "employees": sorted(employees_list, key=lambda x: x["employee_name"]),
    }
