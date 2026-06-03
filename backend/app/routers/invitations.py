"""
Employee invitation router.
Handles sending invites, accepting invites, and managing pending invitations.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee, UserRole
from app.models.invitation import EmployeeInvitation
from app.auth import get_current_employee, require_roles, get_password_hash

router = APIRouter(prefix="/invitations", tags=["Invitations"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class SendInvitationRequest(BaseModel):
    email: str
    full_name: str
    department: Optional[str] = None
    designation: Optional[str] = None
    role: str = "employee"


class AcceptInvitationRequest(BaseModel):
    password: str
    confirm_password: str


class InvitationResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    department: Optional[str]
    designation: Optional[str]
    role: str
    is_accepted: bool
    expires_at: datetime
    created_at: datetime
    inviter_name: Optional[str] = None

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@router.post("/send", status_code=201)
def send_invitation(
    body: SendInvitationRequest,
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """
    HR/admin sends an invitation email to a new employee.
    Generates a 72-hour expiring token and emails the invite link.
    """
    # Check if an active (non-accepted, non-expired) invite already exists
    existing = db.query(EmployeeInvitation).filter(
        EmployeeInvitation.email == body.email,
        EmployeeInvitation.is_accepted == False,
        EmployeeInvitation.expires_at > datetime.utcnow(),
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"An active invitation for {body.email} already exists. "
                   "Please revoke it first or wait for it to expire.",
        )

    # Check if employee with this email already exists
    emp_exists = db.query(Employee).filter(Employee.email == body.email).first()
    if emp_exists:
        raise HTTPException(
            status_code=400,
            detail=f"An employee with email {body.email} already exists.",
        )

    token = secrets.token_urlsafe(32)
    invitation = EmployeeInvitation(
        email=body.email,
        token=token,
        invited_by=current_user.id,
        full_name=body.full_name,
        department=body.department,
        designation=body.designation,
        role=body.role,
        is_accepted=False,
        expires_at=datetime.utcnow() + timedelta(hours=72),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # Fire-and-forget email (don't fail if email sending fails)
    try:
        from app.services.email_service import send_invitation_email
        send_invitation_email(
            to_email=body.email,
            full_name=body.full_name,
            invite_token=token,
            invited_by_name=current_user.full_name,
        )
    except Exception:
        pass  # Email failure should not block invitation creation

    return {
        "id": invitation.id,
        "email": invitation.email,
        "full_name": invitation.full_name,
        "token": token,
        "expires_at": invitation.expires_at,
        "message": f"Invitation sent to {body.email}",
    }


@router.get("", response_model=dict)
def list_invitations(
    include_expired: bool = Query(False),
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """List all pending (and optionally expired) invitations. HR only."""
    query = db.query(EmployeeInvitation).filter(EmployeeInvitation.is_accepted == False)
    if not include_expired:
        query = query.filter(EmployeeInvitation.expires_at > datetime.utcnow())

    invitations = query.order_by(EmployeeInvitation.created_at.desc()).all()
    items = [
        {
            "id": inv.id,
            "email": inv.email,
            "full_name": inv.full_name,
            "department": inv.department,
            "designation": inv.designation,
            "role": inv.role,
            "is_accepted": inv.is_accepted,
            "expires_at": inv.expires_at,
            "created_at": inv.created_at,
            "inviter_name": inv.inviter.full_name if inv.inviter else None,
            "is_expired": inv.expires_at < datetime.utcnow(),
        }
        for inv in invitations
    ]
    return {"items": items, "total": len(items)}


@router.delete("/{invitation_id}", status_code=200)
def revoke_invitation(
    invitation_id: int,
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Cancel / revoke a pending invitation. HR only."""
    inv = db.query(EmployeeInvitation).filter(EmployeeInvitation.id == invitation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if inv.is_accepted:
        raise HTTPException(status_code=400, detail="Cannot revoke an already accepted invitation")

    db.delete(inv)
    db.commit()
    return {"message": f"Invitation for {inv.email} revoked successfully"}


@router.get("/accept/{token}")
def get_invitation_by_token(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Validate an invitation token.
    Returns invitation details (no auth required).
    Used by the frontend to pre-fill the registration form.
    """
    inv = db.query(EmployeeInvitation).filter(EmployeeInvitation.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation link")
    if inv.is_accepted:
        raise HTTPException(status_code=400, detail="This invitation has already been accepted")
    if inv.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This invitation link has expired. Please ask HR to resend.")

    return {
        "email": inv.email,
        "full_name": inv.full_name,
        "department": inv.department,
        "designation": inv.designation,
        "role": inv.role,
        "expires_at": inv.expires_at,
    }


@router.post("/accept/{token}", status_code=201)
def accept_invitation(
    token: str,
    body: AcceptInvitationRequest,
    db: Session = Depends(get_db),
):
    """
    Accept an invitation: set a password and create (or activate) the employee account.
    No auth required.
    """
    inv = db.query(EmployeeInvitation).filter(EmployeeInvitation.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation link")
    if inv.is_accepted:
        raise HTTPException(status_code=400, detail="This invitation has already been accepted")
    if inv.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This invitation link has expired. Please ask HR to resend.")

    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    password_hash = get_password_hash(body.password)

    if inv.employee_id:
        # Update existing employee's password
        emp = db.query(Employee).filter(Employee.id == inv.employee_id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Linked employee account not found")
        emp.password_hash = password_hash
        emp.is_password_set = True
        emp.is_active = True
    else:
        # Create new employee account
        # Determine next employee_id
        last_emp = (
            db.query(Employee)
            .filter(Employee.employee_id.like("E%"))
            .order_by(Employee.employee_id.desc())
            .first()
        )
        if last_emp:
            try:
                next_num = int(last_emp.employee_id[1:]) + 1
            except ValueError:
                next_num = db.query(Employee).count() + 1
        else:
            next_num = 1

        new_employee_id = f"E{next_num:03d}"
        # Make sure this ID is unique
        while db.query(Employee).filter(Employee.employee_id == new_employee_id).first():
            next_num += 1
            new_employee_id = f"E{next_num:03d}"

        role_value = UserRole.employee
        try:
            role_value = UserRole(inv.role)
        except ValueError:
            role_value = UserRole.employee

        emp = Employee(
            employee_id=new_employee_id,
            full_name=inv.full_name or inv.email.split("@")[0],
            email=inv.email,
            department=inv.department,
            designation=inv.designation,
            role=role_value,
            is_active=True,
            password_hash=password_hash,
            is_password_set=True,
            state="Karnataka",
        )
        db.add(emp)
        db.flush()
        inv.employee_id = emp.id

    inv.is_accepted = True
    inv.accepted_at = datetime.utcnow()
    db.commit()

    return {
        "message": "Invitation accepted. You can now log in.",
        "employee_id": emp.employee_id,
        "email": emp.email,
    }
