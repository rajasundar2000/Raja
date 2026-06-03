import json
import logging
from typing import Optional, List, Dict, Any
from ..config import settings

logger = logging.getLogger(__name__)


def get_sheets_client():
    """Get authenticated gspread client. Returns None if not configured."""
    if not settings.google_sheets_credentials_json:
        return None
    try:
        import gspread
        from google.oauth2.service_account import Credentials
        creds_dict = json.loads(settings.google_sheets_credentials_json)
        scopes = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
        creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
        return gspread.authorize(creds)
    except Exception as e:
        logger.error(f"Failed to connect to Google Sheets: {e}")
        return None


def sync_employees_to_sheets(employees: List[Dict]) -> Dict:
    """Sync employee list to Google Sheets 'Employees' tab."""
    client = get_sheets_client()
    if not client or not settings.google_sheets_spreadsheet_id:
        return {"success": False, "message": "Google Sheets not configured"}
    try:
        sheet = client.open_by_key(settings.google_sheets_spreadsheet_id)
        try:
            ws = sheet.worksheet("Employees")
        except Exception:
            ws = sheet.add_worksheet("Employees", rows=100, cols=20)

        headers = ["Employee ID", "Full Name", "Email", "Department", "Designation", "Role", "Date of Joining", "Status"]
        rows = [headers]
        for e in employees:
            rows.append([
                e.get("employee_id", ""),
                e.get("full_name", ""),
                e.get("email", ""),
                e.get("department", ""),
                e.get("designation", ""),
                e.get("role", ""),
                str(e.get("date_of_joining", "")),
                "Active" if e.get("is_active") else "Inactive",
            ])
        ws.clear()
        ws.update(rows)
        return {"success": True, "message": f"Synced {len(employees)} employees", "rows": len(rows)}
    except Exception as e:
        logger.error(f"Google Sheets sync error: {e}")
        return {"success": False, "message": str(e)}


def sync_payroll_to_sheets(slips: List[Dict], month: str, year: int) -> Dict:
    """Sync payroll register to Google Sheets."""
    client = get_sheets_client()
    if not client or not settings.google_sheets_spreadsheet_id:
        return {"success": False, "message": "Google Sheets not configured"}
    try:
        sheet = client.open_by_key(settings.google_sheets_spreadsheet_id)
        tab_name = f"Payroll_{month}_{year}"
        try:
            ws = sheet.worksheet(tab_name)
        except Exception:
            ws = sheet.add_worksheet(tab_name, rows=200, cols=25)

        headers = [
            "Employee ID", "Name", "Basic", "HRA", "DA", "Special Allowance", "Commission",
            "Gross Earnings", "PF Employee", "ESI Employee", "Professional Tax",
            "Income Tax", "Total Deductions", "Net Pay", "Status",
        ]
        rows = [headers]
        for s in slips:
            rows.append([
                s.get("employee_id", ""),
                s.get("employee_name", ""),
                s.get("basic_salary", 0),
                s.get("hra", 0),
                s.get("da", 0),
                s.get("special_allowance", 0),
                s.get("commission_amount", 0),
                s.get("gross_earnings", 0),
                s.get("pf_employee", 0),
                s.get("esi_employee", 0),
                s.get("professional_tax", 0),
                s.get("income_tax", 0),
                s.get("total_deductions", 0),
                s.get("net_pay", 0),
                s.get("status", ""),
            ])
        ws.clear()
        ws.update(rows)
        return {"success": True, "message": f"Synced {len(slips)} salary slips to {tab_name}", "rows": len(rows)}
    except Exception as e:
        return {"success": False, "message": str(e)}


def sync_leave_register_to_sheets(leaves: List[Dict], year: int) -> Dict:
    """Sync leave register to Google Sheets."""
    client = get_sheets_client()
    if not client or not settings.google_sheets_spreadsheet_id:
        return {"success": False, "message": "Google Sheets not configured"}
    try:
        sheet = client.open_by_key(settings.google_sheets_spreadsheet_id)
        tab_name = f"Leave_Register_{year}"
        try:
            ws = sheet.worksheet(tab_name)
        except Exception:
            ws = sheet.add_worksheet(tab_name, rows=500, cols=15)

        headers = ["Employee ID", "Name", "Leave Type", "From Date", "To Date", "Days", "Status", "Reason", "Applied On"]
        rows = [headers]
        for l in leaves:
            rows.append([
                l.get("employee_id", ""),
                l.get("employee_name", ""),
                l.get("leave_type", ""),
                str(l.get("from_date", "")),
                str(l.get("to_date", "")),
                l.get("total_days", 0),
                l.get("status", ""),
                l.get("reason", ""),
                str(l.get("created_at", "")),
            ])
        ws.clear()
        ws.update(rows)
        return {"success": True, "message": f"Synced {len(leaves)} leave records to {tab_name}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def import_employees_from_sheets() -> Dict:
    """Import employees from Google Sheets 'Employees' tab. Returns list of employee dicts."""
    client = get_sheets_client()
    if not client or not settings.google_sheets_spreadsheet_id:
        return {"success": False, "message": "Google Sheets not configured", "data": []}
    try:
        sheet = client.open_by_key(settings.google_sheets_spreadsheet_id)
        ws = sheet.worksheet("Employees")
        records = ws.get_all_records()
        return {"success": True, "message": f"Found {len(records)} rows", "data": records}
    except Exception as e:
        return {"success": False, "message": str(e), "data": []}
