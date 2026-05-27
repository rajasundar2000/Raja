"""
Authentication router: login, logout, change-password, current user, set-password.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee, UserRole
from app.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_employee,
    require_roles,
)

router = APIRouter()


# --------------------------------------------------------------------------- #
# Request / Response schemas
# --------------------------------------------------------------------------- #

class LoginRequest(BaseModel):
    email: str
    password: str


class EmployeeProfile(BaseModel):
    id: int
    employee_id: str
    full_name: str
    email: str
    role: str
    department: Optional[str] = None
    designation: Optional[str] = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: EmployeeProfile


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class SetPasswordRequest(BaseModel):
    employee_id: str   # employee_id string (e.g. "E001")
    new_password: str


class MessageResponse(BaseModel):
    message: str


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@router.post("/auth/login", response_model=LoginResponse, tags=["auth"])
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with email + password.
    Returns a JWT access token (valid 8 hours).
    """
    emp = (
        db.query(Employee)
        .filter(Employee.email == body.email, Employee.is_active == True)
        .first()
    )
    if not emp:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not emp.is_password_set or not emp.password_hash:
        raise HTTPException(
            status_code=401,
            detail="Password not set for this account. Please contact HR.",
        )

    if not verify_password(body.password, emp.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update last login
    emp.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(data={"sub": emp.employee_id})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        employee=EmployeeProfile(
            id=emp.id,
            employee_id=emp.employee_id,
            full_name=emp.full_name,
            email=emp.email,
            role=emp.role.value if hasattr(emp.role, "value") else str(emp.role),
            department=emp.department,
            designation=emp.designation,
        ),
    )


@router.post("/auth/logout", response_model=MessageResponse, tags=["auth"])
def logout():
    """
    Logout endpoint. The client should delete the token locally.
    Server-side there is nothing to invalidate (stateless JWT).
    """
    return MessageResponse(message="Logged out successfully")


@router.get("/auth/me", response_model=EmployeeProfile, tags=["auth"])
def get_me(current_user: Employee = Depends(get_current_employee)):
    """Return the currently authenticated employee's profile."""
    return EmployeeProfile(
        id=current_user.id,
        employee_id=current_user.employee_id,
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        department=current_user.department,
        designation=current_user.designation,
    )


@router.post("/auth/change-password", response_model=MessageResponse, tags=["auth"])
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
    return MessageResponse(message="Password changed successfully")


@router.post("/auth/set-password", response_model=MessageResponse, tags=["auth"])
def set_password(
    body: SetPasswordRequest,
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: set or reset an employee's password.
    Requires hr or super_admin role.
    """
    target = (
        db.query(Employee)
        .filter(Employee.employee_id == body.employee_id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail=f"Employee {body.employee_id} not found")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    target.password_hash = get_password_hash(body.new_password)
    target.is_password_set = True
    db.commit()
    return MessageResponse(message=f"Password set successfully for {target.full_name}")
