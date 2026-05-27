"""
Main FastAPI application for the Indian Leave Management & Payroll System.
"""
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, SessionLocal, Base

# Import all models so they are registered before create_all
import app.models  # noqa: F401

from app.routers import employees as emp_router
from app.routers import leaves as leave_router
from app.routers import payroll as payroll_router
from app.routers import reports as report_router
from app.routers import auth as auth_router
from app.routers import commission as commission_router


# ============================================================
# Seed helpers
# ============================================================

def seed_leave_types(db):
    from app.models.leave import LeaveType

    if db.query(LeaveType).count() > 0:
        return

    leave_types = [
        LeaveType(
            code="CL",
            name="Casual Leave",
            description="For personal / unforeseen needs. Max 3 consecutive days.",
            annual_entitlement=10.0,
            max_carry_forward=5.0,
            is_encashable=False,
            is_paid=True,
            can_club_with_cl=False,
            can_club_with_el=False,
            is_active=True,
        ),
        LeaveType(
            code="EL",
            name="Earned Leave",
            description="Accrued at 1.75 days/month. Can be encashed at exit.",
            annual_entitlement=18.0,
            max_carry_forward=30.0,
            is_encashable=True,
            is_paid=True,
            can_club_with_cl=True,
            can_club_with_el=False,
            is_active=True,
        ),
        LeaveType(
            code="SL",
            name="Sick Leave",
            description="For illness and medical appointments.",
            annual_entitlement=10.0,
            max_carry_forward=0.0,
            is_encashable=False,
            is_paid=True,
            requires_medical_cert_after_days=2,
            can_club_with_cl=False,
            can_club_with_el=False,
            is_active=True,
        ),
        LeaveType(
            code="PL",
            name="Privilege Leave",
            description="Planned vacation leave.",
            annual_entitlement=12.0,
            max_carry_forward=10.0,
            is_encashable=False,
            is_paid=True,
            can_club_with_cl=True,
            can_club_with_el=True,
            is_active=True,
        ),
        LeaveType(
            code="ML",
            name="Maternity Leave",
            description="26 weeks (182 days) maternity leave as per Maternity Benefit Act.",
            annual_entitlement=182.0,
            max_carry_forward=0.0,
            is_encashable=False,
            is_paid=True,
            can_club_with_cl=False,
            can_club_with_el=False,
            is_active=True,
        ),
        LeaveType(
            code="PTL",
            name="Paternity Leave",
            description="5 days paternity leave.",
            annual_entitlement=5.0,
            max_carry_forward=0.0,
            is_encashable=False,
            is_paid=True,
            can_club_with_cl=True,
            can_club_with_el=True,
            is_active=True,
        ),
        LeaveType(
            code="BL",
            name="Bereavement Leave",
            description="5 days for loss of immediate family member.",
            annual_entitlement=5.0,
            max_carry_forward=0.0,
            is_encashable=False,
            is_paid=True,
            can_club_with_cl=False,
            can_club_with_el=False,
            is_active=True,
        ),
        LeaveType(
            code="LWP",
            name="Leave Without Pay",
            description="Unpaid leave when paid leave balance is exhausted.",
            annual_entitlement=0.0,
            max_carry_forward=0.0,
            is_encashable=False,
            is_paid=False,
            can_club_with_cl=False,
            can_club_with_el=False,
            is_active=True,
        ),
    ]
    db.add_all(leave_types)
    db.commit()
    print("  [seed] Leave types created.")


def seed_holidays(db):
    from app.models.payroll import Holiday, HolidayType, HolidayCountry

    if db.query(Holiday).count() > 0:
        return

    holidays = [
        # India 2025 - National Holidays
        Holiday(name="Republic Day", date=date(2025, 1, 26), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2025, is_active=True),
        Holiday(name="Holi", date=date(2025, 3, 14), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2025, is_active=True),
        Holiday(name="Good Friday", date=date(2025, 4, 18), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2025, is_active=True),
        Holiday(name="Eid ul-Fitr", date=date(2025, 3, 31), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2025, is_active=True),
        Holiday(name="Independence Day", date=date(2025, 8, 15), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2025, is_active=True),
        Holiday(name="Gandhi Jayanti", date=date(2025, 10, 2), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2025, is_active=True),
        Holiday(name="Diwali", date=date(2025, 10, 20), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2025, is_active=True),
        Holiday(name="Christmas Day", date=date(2025, 12, 25), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2025, is_active=True),

        # India 2024
        Holiday(name="Republic Day", date=date(2024, 1, 26), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2024, is_active=True),
        Holiday(name="Independence Day", date=date(2024, 8, 15), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2024, is_active=True),
        Holiday(name="Gandhi Jayanti", date=date(2024, 10, 2), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2024, is_active=True),
        Holiday(name="Diwali", date=date(2024, 11, 1), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2024, is_active=True),
        Holiday(name="Christmas Day", date=date(2024, 12, 25), holiday_type=HolidayType.national, country=HolidayCountry.india, year=2024, is_active=True),

        # US 2025
        Holiday(name="New Year's Day", date=date(2025, 1, 1), holiday_type=HolidayType.us, country=HolidayCountry.us, year=2025, is_active=True),
        Holiday(name="Martin Luther King Jr. Day", date=date(2025, 1, 20), holiday_type=HolidayType.us, country=HolidayCountry.us, year=2025, is_active=True),
        Holiday(name="Presidents' Day", date=date(2025, 2, 17), holiday_type=HolidayType.us, country=HolidayCountry.us, year=2025, is_active=True),
        Holiday(name="Memorial Day", date=date(2025, 5, 26), holiday_type=HolidayType.us, country=HolidayCountry.us, year=2025, is_active=True),
        Holiday(name="Independence Day", date=date(2025, 7, 4), holiday_type=HolidayType.us, country=HolidayCountry.us, year=2025, is_active=True),
        Holiday(name="Labor Day", date=date(2025, 9, 1), holiday_type=HolidayType.us, country=HolidayCountry.us, year=2025, is_active=True),
        Holiday(name="Thanksgiving Day", date=date(2025, 11, 27), holiday_type=HolidayType.us, country=HolidayCountry.us, year=2025, is_active=True),
        Holiday(name="Christmas Day", date=date(2025, 12, 25), holiday_type=HolidayType.us, country=HolidayCountry.us, year=2025, is_active=True),
    ]
    db.add_all(holidays)
    db.commit()
    print("  [seed] Holidays created.")


def seed_employees(db):
    from app.models.employee import Employee, UserRole
    from app.models.salary import SalaryStructure
    from app.models.leave import LeaveType, LeaveEntitlement
    from app.auth import get_password_hash

    if db.query(Employee).count() > 0:
        return

    default_password_hash = get_password_hash("Employee@123")

    # Create employees
    employees_data = [
        Employee(
            employee_id="E001",
            full_name="Raj Kumar",
            email="raj.kumar@company.com",
            phone="9876543210",
            department="IT",
            designation="Software Engineer",
            date_of_joining=date(2023, 1, 15),
            date_of_birth=date(1995, 5, 20),
            role=UserRole.employee,
            state="Karnataka",
            is_active=True,
            password_hash=default_password_hash,
            is_password_set=True,
        ),
        Employee(
            employee_id="E002",
            full_name="Priya Singh",
            email="priya.singh@company.com",
            phone="9876543211",
            department="IT",
            designation="Senior Developer",
            date_of_joining=date(2022, 6, 1),
            date_of_birth=date(1990, 8, 15),
            role=UserRole.manager,
            state="Karnataka",
            is_active=True,
            password_hash=default_password_hash,
            is_password_set=True,
        ),
        Employee(
            employee_id="E003",
            full_name="Amit Verma",
            email="amit.verma@company.com",
            phone="9876543212",
            department="HR",
            designation="HR Manager",
            date_of_joining=date(2021, 3, 10),
            date_of_birth=date(1985, 12, 5),
            role=UserRole.hr,
            state="Karnataka",
            is_active=True,
            password_hash=default_password_hash,
            is_password_set=True,
        ),
    ]
    db.add_all(employees_data)
    db.flush()  # Get IDs without committing

    # Set manager relationships
    e001 = db.query(Employee).filter(Employee.employee_id == "E001").first()
    e002 = db.query(Employee).filter(Employee.employee_id == "E002").first()
    e003 = db.query(Employee).filter(Employee.employee_id == "E003").first()

    e001.manager_id = e002.id  # Raj reports to Priya

    db.commit()
    print("  [seed] Employees created.")

    # Salary structures
    salary_data = [
        SalaryStructure(
            employee_id=e001.id,
            effective_from=date(2023, 1, 15),
            basic_salary=40000.0,
            hra_percentage=40.0,
            da_amount=5000.0,
            conveyance_allowance=1600.0,
            medical_allowance=1250.0,
            special_allowance=12150.0,
            lta_annual=25000.0,
            other_allowances=0.0,
            is_active=True,
        ),
        SalaryStructure(
            employee_id=e002.id,
            effective_from=date(2022, 6, 1),
            basic_salary=60000.0,
            hra_percentage=40.0,
            da_amount=8000.0,
            conveyance_allowance=1600.0,
            medical_allowance=1250.0,
            special_allowance=29150.0,
            lta_annual=25000.0,
            other_allowances=0.0,
            is_active=True,
        ),
        SalaryStructure(
            employee_id=e003.id,
            effective_from=date(2021, 3, 10),
            basic_salary=80000.0,
            hra_percentage=40.0,
            da_amount=10000.0,
            conveyance_allowance=1600.0,
            medical_allowance=1250.0,
            special_allowance=57150.0,
            lta_annual=25000.0,
            other_allowances=0.0,
            is_active=True,
        ),
    ]
    db.add_all(salary_data)
    db.commit()
    print("  [seed] Salary structures created.")

    # Leave entitlements for 2025
    leave_types_map = {lt.code: lt for lt in db.query(LeaveType).all()}
    entitlement_year = 2025

    entitlements_data = [
        # E001: CL=10(used=2), EL=18(used=5), SL=10(used=1), PL=12(used=0)
        LeaveEntitlement(employee_id=e001.id, leave_type_id=leave_types_map["CL"].id, year=entitlement_year, total_days=10.0, used_days=2.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e001.id, leave_type_id=leave_types_map["EL"].id, year=entitlement_year, total_days=18.0, used_days=5.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e001.id, leave_type_id=leave_types_map["SL"].id, year=entitlement_year, total_days=10.0, used_days=1.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e001.id, leave_type_id=leave_types_map["PL"].id, year=entitlement_year, total_days=12.0, used_days=0.0, carried_forward=0.0, encashed_days=0.0),

        # E002: CL=10(used=3), EL=18(used=8), SL=10(used=2), PL=12(used=1)
        LeaveEntitlement(employee_id=e002.id, leave_type_id=leave_types_map["CL"].id, year=entitlement_year, total_days=10.0, used_days=3.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e002.id, leave_type_id=leave_types_map["EL"].id, year=entitlement_year, total_days=18.0, used_days=8.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e002.id, leave_type_id=leave_types_map["SL"].id, year=entitlement_year, total_days=10.0, used_days=2.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e002.id, leave_type_id=leave_types_map["PL"].id, year=entitlement_year, total_days=12.0, used_days=1.0, carried_forward=0.0, encashed_days=0.0),

        # E003: CL=10(used=1), EL=18(used=3), SL=10(used=0), PL=12(used=2)
        LeaveEntitlement(employee_id=e003.id, leave_type_id=leave_types_map["CL"].id, year=entitlement_year, total_days=10.0, used_days=1.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e003.id, leave_type_id=leave_types_map["EL"].id, year=entitlement_year, total_days=18.0, used_days=3.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e003.id, leave_type_id=leave_types_map["SL"].id, year=entitlement_year, total_days=10.0, used_days=0.0, carried_forward=0.0, encashed_days=0.0),
        LeaveEntitlement(employee_id=e003.id, leave_type_id=leave_types_map["PL"].id, year=entitlement_year, total_days=12.0, used_days=2.0, carried_forward=0.0, encashed_days=0.0),
    ]
    db.add_all(entitlements_data)
    db.commit()
    print("  [seed] Leave entitlements created.")


def seed_commissions(db):
    from app.models.commission import CommissionStructure, CommissionType, EmployeeCommissionAssignment, CommissionEntry
    from app.models.employee import Employee

    if db.query(CommissionStructure).count() > 0:
        return

    # 1. Sales Commission — 5% on deal value, monthly target ₹5,00,000
    sales_commission = CommissionStructure(
        name="Sales Commission",
        description="5% commission on every deal closed. Monthly target ₹5,00,000.",
        commission_type=CommissionType.PERCENTAGE,
        percentage_rate=5.0,
        monthly_target=500000.0,
        is_active=True,
    )
    # 2. Flat Deal Bonus — ₹5,000 per deal closed
    flat_bonus = CommissionStructure(
        name="Flat Deal Bonus",
        description="Fixed ₹5,000 bonus per deal regardless of deal size.",
        commission_type=CommissionType.FLAT,
        flat_amount=5000.0,
        is_active=True,
    )
    db.add_all([sales_commission, flat_bonus])
    db.commit()
    print("  [seed] Commission structures created.")

    # Assign "Sales Commission" to E001 effective 2025-01-01
    e001 = db.query(Employee).filter(Employee.employee_id == "E001").first()
    if e001:
        assignment = EmployeeCommissionAssignment(
            employee_id=e001.id,
            commission_structure_id=sales_commission.id,
            effective_from=date(2025, 1, 1),
            is_active=True,
        )
        db.add(assignment)
        db.commit()
        print("  [seed] Commission assignment for E001 created.")

        # 2 sample entries for E001 in May 2025
        entry1 = CommissionEntry(
            employee_id=e001.id,
            commission_structure_id=sales_commission.id,
            month=5,
            year=2025,
            description="Deal: TechCorp Software License",
            deal_value=200000.0,
            commission_amount=10000.0,
            status="approved",
        )
        entry2 = CommissionEntry(
            employee_id=e001.id,
            commission_structure_id=sales_commission.id,
            month=5,
            year=2025,
            description="Deal: StartupXYZ Annual Subscription",
            deal_value=150000.0,
            commission_amount=7500.0,
            status="approved",
        )
        db.add_all([entry1, entry2])
        db.commit()
        print("  [seed] Sample commission entries for E001 created.")


def run_seed():
    """Run all seed operations."""
    db = SessionLocal()
    try:
        print("[startup] Running database seed...")
        seed_leave_types(db)
        seed_holidays(db)
        seed_employees(db)
        seed_commissions(db)
        print("[startup] Seed complete.")
    except Exception as e:
        print(f"[startup] Seed error: {e}")
        db.rollback()
    finally:
        db.close()


# ============================================================
# Lifespan
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    # Startup: create tables and seed data
    print("[startup] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("[startup] Tables ready.")
    run_seed()
    yield
    # Shutdown: nothing to do for SQLite
    print("[shutdown] Goodbye.")


# ============================================================
# App
# ============================================================

app = FastAPI(
    title="Indian Leave Management & Payroll System",
    description=(
        "A comprehensive API for managing employee leave requests, payroll processing, "
        "salary slips, tax calculations, and reports — built for Indian companies with "
        "support for PF, ESI, Professional Tax, and TDS (FY 2024-25)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow frontend at localhost:5173 (Vite default) and all origins for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Routers
# ============================================================

API_PREFIX = "/api"

app.include_router(auth_router.router, prefix=API_PREFIX, tags=["auth"])
app.include_router(emp_router.router, prefix=API_PREFIX)
app.include_router(leave_router.router, prefix=API_PREFIX)
app.include_router(payroll_router.router, prefix=API_PREFIX)
app.include_router(report_router.router, prefix=API_PREFIX)
app.include_router(commission_router.router, prefix=API_PREFIX, tags=["commission"])


# ============================================================
# Root
# ============================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Leave & Payroll API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
