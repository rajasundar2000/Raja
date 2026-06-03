"""
Announcements router.
Handles company-wide and department-targeted announcements.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee, UserRole
from app.models.announcement import Announcement, AnnouncementPriority
from app.auth import get_current_employee, require_roles

router = APIRouter(prefix="/announcements", tags=["Announcements"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: AnnouncementPriority = AnnouncementPriority.normal
    target_department: Optional[str] = None
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[AnnouncementPriority] = None
    target_department: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _serialize(ann: Announcement) -> dict:
    return {
        "id": ann.id,
        "title": ann.title,
        "content": ann.content,
        "priority": ann.priority,
        "is_active": ann.is_active,
        "published_by": ann.published_by,
        "publisher_name": ann.publisher.full_name if ann.publisher else None,
        "target_department": ann.target_department,
        "expires_at": ann.expires_at,
        "created_at": ann.created_at,
    }


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@router.get("", response_model=dict)
def list_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """
    List active announcements for the current user.
    Employees see announcements targeted to their department plus all-department ones.
    """
    now = datetime.utcnow()
    query = db.query(Announcement).filter(
        Announcement.is_active == True,
        (Announcement.expires_at == None) | (Announcement.expires_at > now),
    )

    # Filter by department: show announcements for user's dept OR all-dept (target_department is None)
    from sqlalchemy import or_
    query = query.filter(
        or_(
            Announcement.target_department == None,
            Announcement.target_department == current_user.department,
        )
    )

    total = query.count()
    announcements = query.order_by(Announcement.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [_serialize(a) for a in announcements], "total": total}


@router.post("", status_code=201)
def create_announcement(
    body: AnnouncementCreate,
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Create a new announcement. HR/super_admin only."""
    ann = Announcement(
        title=body.title,
        content=body.content,
        priority=body.priority,
        target_department=body.target_department,
        expires_at=body.expires_at,
        published_by=current_user.id,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return _serialize(ann)


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: int,
    body: AnnouncementUpdate,
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Update an announcement. HR/super_admin only."""
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ann, field, value)

    db.commit()
    db.refresh(ann)
    return _serialize(ann)


@router.delete("/{announcement_id}", status_code=200)
def deactivate_announcement(
    announcement_id: int,
    current_user: Employee = Depends(require_roles(UserRole.hr, UserRole.super_admin)),
    db: Session = Depends(get_db),
):
    """Deactivate (soft-delete) an announcement. HR/super_admin only."""
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    ann.is_active = False
    db.commit()
    return {"message": f"Announcement '{ann.title}' deactivated successfully"}
