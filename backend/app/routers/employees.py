"""
Employee management router.
CRUD operations for employees and their salary structures.
"""
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.salary import SalaryStructure
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    SalaryStructureCreate, SalaryStructureResponse,
)

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", response_model=dict)
def list_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    department: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = True,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all employees with optional filters and pagination."""
    query = db.query(Employee)

    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)
    if department:
        query = query.filter(Employee.department.ilike(f"%{department}%"))
    if role:
        query = query.filter(Employee.role == role)
    if search:
        query = query.filter(
            Employee.full_name.ilike(f"%{search}%")
            | Employee.email.ilike(f"%{search}%")
            | Employee.employee_id.ilike(f"%{search}%")
        )

    total = query.count()
    employees = query.order_by(Employee.full_name).offset(skip).limit(limit).all()

    return {
        "items": [_serialize_employee(e) for e in employees],
        "total": total,
    }


@router.post("", response_model=EmployeeResponse, status_code=201)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    """Create a new employee."""
    # Check uniqueness
    if db.query(Employee).filter(Employee.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    if db.query(Employee).filter(Employee.employee_id == payload.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    if payload.manager_id:
        manager = db.query(Employee).filter(Employee.id == payload.manager_id).first()
        if not manager:
            raise HTTPException(status_code=404, detail="Manager not found")

    emp = Employee(**payload.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _serialize_employee(emp)


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get a single employee by ID."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _serialize_employee(emp)


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db)):
    """Update employee details."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "email" in update_data:
        existing = db.query(Employee).filter(
            Employee.email == update_data["email"],
            Employee.id != employee_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")

    if "manager_id" in update_data and update_data["manager_id"]:
        if update_data["manager_id"] == employee_id:
            raise HTTPException(status_code=400, detail="Employee cannot be their own manager")
        manager = db.query(Employee).filter(Employee.id == update_data["manager_id"]).first()
        if not manager:
            raise HTTPException(status_code=404, detail="Manager not found")

    for field, value in update_data.items():
        setattr(emp, field, value)

    db.commit()
    db.refresh(emp)
    return _serialize_employee(emp)


@router.delete("/{employee_id}", status_code=200)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    """Soft-delete an employee (set is_active=False)."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.is_active = False
    db.commit()
    return {"message": f"Employee {emp.full_name} deactivated successfully", "id": employee_id}


@router.post("/{employee_id}/salary-structure", response_model=SalaryStructureResponse, status_code=201)
def set_salary_structure(
    employee_id: int,
    payload: SalaryStructureCreate,
    db: Session = Depends(get_db),
):
    """Create or update the salary structure for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Deactivate all existing active structures
    db.query(SalaryStructure).filter(
        SalaryStructure.employee_id == employee_id,
        SalaryStructure.is_active == True,
    ).update({"is_active": False, "effective_to": payload.effective_from})

    new_salary = SalaryStructure(
        employee_id=employee_id,
        **payload.model_dump(),
    )
    db.add(new_salary)
    db.commit()
    db.refresh(new_salary)
    return _serialize_salary(new_salary)


@router.get("/{employee_id}/salary-structure", response_model=SalaryStructureResponse)
def get_salary_structure(
    employee_id: int,
    as_of: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Get the active salary structure for an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    query = db.query(SalaryStructure).filter(
        SalaryStructure.employee_id == employee_id,
        SalaryStructure.is_active == True,
    )
    if as_of:
        query = query.filter(SalaryStructure.effective_from <= as_of)

    salary = query.order_by(SalaryStructure.effective_from.desc()).first()
    if not salary:
        raise HTTPException(status_code=404, detail="No salary structure found")

    return _serialize_salary(salary)


# ---- Helpers ----

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
        "pan_number": emp.pan_number,
        "aadhaar_number": emp.aadhaar_number,
        "bank_account_last4": emp.bank_account_last4,
        "bank_ifsc": emp.bank_ifsc,
        "role": emp.role,
        "manager_id": emp.manager_id,
        "state": emp.state,
        "is_active": emp.is_active,
        "created_at": emp.created_at,
        "updated_at": emp.updated_at,
        "manager_name": emp.manager.full_name if emp.manager else None,
    }


def _serialize_salary(sal: SalaryStructure) -> dict:
    return {
        "id": sal.id,
        "employee_id": sal.employee_id,
        "effective_from": sal.effective_from,
        "effective_to": sal.effective_to,
        "basic_salary": sal.basic_salary,
        "hra_percentage": sal.hra_percentage,
        "da_amount": sal.da_amount,
        "conveyance_allowance": sal.conveyance_allowance,
        "medical_allowance": sal.medical_allowance,
        "special_allowance": sal.special_allowance,
        "lta_annual": sal.lta_annual,
        "other_allowances": sal.other_allowances,
        "is_active": sal.is_active,
        "created_at": sal.created_at,
        "hra_amount": sal.hra_amount,
        "lta_monthly": sal.lta_monthly,
        "gross_salary": sal.gross_salary,
        "monthly_salary": sal.monthly_salary,
        "annual_ctc": sal.annual_ctc,
    }
