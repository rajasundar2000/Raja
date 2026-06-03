"""
Integrations router.
Handles Google Sheets configuration and sync operations.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee, UserRole
from app.models.app_settings import AppSetting
from app.auth import require_roles
from app.config import settings

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class GoogleSheetsConfigBody(BaseModel):
    spreadsheet_id: str


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _get_setting(db: Session, key: str) -> Optional[str]:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    return row.value if row else None


def _set_setting(db: Session, key: str, value: str, description: str = "") -> None:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row:
        row.value = value
    else:
        row = AppSetting(key=key, value=value, description=description)
        db.add(row)
    db.commit()


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@router.get("/google-sheets/status")
def google_sheets_status(
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Check if Google Sheets integration is configured."""
    spreadsheet_id = _get_setting(db, "google_sheets_spreadsheet_id") or settings.google_sheets_spreadsheet_id
    credentials_configured = bool(settings.google_sheets_credentials_json)
    return {
        "configured": credentials_configured and bool(spreadsheet_id),
        "credentials_configured": credentials_configured,
        "spreadsheet_id": spreadsheet_id,
    }


@router.post("/google-sheets/configure")
def configure_google_sheets(
    body: GoogleSheetsConfigBody,
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Save Google Sheets spreadsheet ID to app settings."""
    _set_setting(db, "google_sheets_spreadsheet_id", body.spreadsheet_id, "Google Sheets Spreadsheet ID")
    return {
        "message": "Google Sheets spreadsheet ID saved successfully",
        "spreadsheet_id": body.spreadsheet_id,
    }


@router.post("/google-sheets/sync/employees")
def sync_employees_to_sheets(
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Sync all active employees to Google Sheets 'Employees' tab."""
    from app.models.employee import Employee as EmpModel
    from app.services.google_sheets_service import sync_employees_to_sheets as do_sync

    # Override spreadsheet_id from DB if available
    db_sheet_id = _get_setting(db, "google_sheets_spreadsheet_id")
    if db_sheet_id:
        settings.google_sheets_spreadsheet_id = db_sheet_id

    employees = db.query(EmpModel).filter(EmpModel.is_active == True).all()
    employee_dicts = [
        {
            "employee_id": e.employee_id,
            "full_name": e.full_name,
            "email": e.email,
            "department": e.department or "",
            "designation": e.designation or "",
            "role": e.role.value if hasattr(e.role, "value") else str(e.role),
            "date_of_joining": e.date_of_joining,
            "is_active": e.is_active,
        }
        for e in employees
    ]

    result = do_sync(employee_dicts)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message", "Sync failed"))
    return result


@router.post("/google-sheets/sync/payroll")
def sync_payroll_to_sheets(
    cycle_id: int = Query(..., description="Payroll cycle ID to sync"),
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Sync a specific payroll cycle's salary slips to Google Sheets."""
    from app.models.payroll import PayrollCycle, SalarySlip
    from app.services.google_sheets_service import sync_payroll_to_sheets as do_sync
    import calendar

    db_sheet_id = _get_setting(db, "google_sheets_spreadsheet_id")
    if db_sheet_id:
        settings.google_sheets_spreadsheet_id = db_sheet_id

    cycle = db.query(PayrollCycle).filter(PayrollCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Payroll cycle not found")

    slips = db.query(SalarySlip).filter(SalarySlip.payroll_cycle_id == cycle_id).all()
    slip_dicts = [
        {
            "employee_id": s.employee.employee_id if s.employee else "",
            "employee_name": s.employee.full_name if s.employee else "",
            "basic_salary": s.basic_salary,
            "hra": s.hra,
            "da": s.da,
            "special_allowance": s.special_allowance,
            "commission_amount": s.commission_amount,
            "gross_earnings": s.gross_earnings,
            "pf_employee": s.pf_employee,
            "esi_employee": s.esi_employee,
            "professional_tax": s.professional_tax,
            "income_tax": s.income_tax,
            "total_deductions": s.total_deductions,
            "net_pay": s.net_pay,
            "status": s.status.value if hasattr(s.status, "value") else str(s.status),
        }
        for s in slips
    ]

    month_name = calendar.month_name[cycle.month]
    result = do_sync(slip_dicts, month_name, cycle.year)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message", "Sync failed"))
    return result


@router.post("/google-sheets/sync/leaves")
def sync_leaves_to_sheets(
    year: Optional[int] = Query(None, description="Year for leave register sync"),
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Sync the leave register for a given year to Google Sheets."""
    from app.models.leave import LeaveRequest
    from app.services.google_sheets_service import sync_leave_register_to_sheets as do_sync
    from datetime import date
    from sqlalchemy import extract

    db_sheet_id = _get_setting(db, "google_sheets_spreadsheet_id")
    if db_sheet_id:
        settings.google_sheets_spreadsheet_id = db_sheet_id

    sync_year = year or date.today().year
    leaves = (
        db.query(LeaveRequest)
        .filter(extract("year", LeaveRequest.from_date) == sync_year)
        .all()
    )

    leave_dicts = [
        {
            "employee_id": l.employee.employee_id if l.employee else "",
            "employee_name": l.employee.full_name if l.employee else "",
            "leave_type": l.leave_type.name if l.leave_type else "",
            "from_date": l.from_date,
            "to_date": l.to_date,
            "total_days": l.total_days,
            "status": l.status.value if hasattr(l.status, "value") else str(l.status),
            "reason": l.reason or "",
            "created_at": l.created_at,
        }
        for l in leaves
    ]

    result = do_sync(leave_dicts, sync_year)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message", "Sync failed"))
    return result


@router.get("/google-sheets/import/employees")
def import_employees_from_sheets(
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """
    Import employee data from Google Sheets 'Employees' tab.
    Returns a preview of the data without creating any records.
    """
    from app.services.google_sheets_service import import_employees_from_sheets as do_import

    db_sheet_id = _get_setting(db, "google_sheets_spreadsheet_id")
    if db_sheet_id:
        settings.google_sheets_spreadsheet_id = db_sheet_id

    result = do_import()
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message", "Import failed"))
    return result
