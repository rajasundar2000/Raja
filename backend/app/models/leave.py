import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    ForeignKey, Enum as SAEnum, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class LeaveStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"
    revoked = "revoked"
    completed = "completed"


class ApprovalAction(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"
    delegated = "delegated"


class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    annual_entitlement = Column(Float, default=0.0, nullable=False)
    max_carry_forward = Column(Float, default=0.0, nullable=False)
    is_encashable = Column(Boolean, default=False, nullable=False)
    is_paid = Column(Boolean, default=True, nullable=False)
    requires_medical_cert_after_days = Column(Integer, nullable=True)
    can_club_with_cl = Column(Boolean, default=True, nullable=False)
    can_club_with_el = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    entitlements = relationship("LeaveEntitlement", back_populates="leave_type")
    leave_requests = relationship("LeaveRequest", back_populates="leave_type")


class LeaveEntitlement(Base):
    __tablename__ = "leave_entitlements"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    total_days = Column(Float, default=0.0, nullable=False)
    used_days = Column(Float, default=0.0, nullable=False)
    carried_forward = Column(Float, default=0.0, nullable=False)
    encashed_days = Column(Float, default=0.0, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="leave_entitlements", foreign_keys=[employee_id])
    leave_type = relationship("LeaveType", back_populates="entitlements")

    @property
    def available_days(self) -> float:
        return max(0.0, self.total_days + self.carried_forward - self.used_days - self.encashed_days)


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False, index=True)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    total_days = Column(Float, nullable=False, default=0.0)
    reason = Column(Text, nullable=True)
    status = Column(SAEnum(LeaveStatus), default=LeaveStatus.draft, nullable=False)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    rejected_reason = Column(Text, nullable=True)
    attachment_path = Column(String(500), nullable=True)
    backfill_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="leave_requests", foreign_keys=[employee_id])
    leave_type = relationship("LeaveType", back_populates="leave_requests")
    approver = relationship("Employee", foreign_keys=[approved_by])
    backfill_employee = relationship("Employee", foreign_keys=[backfill_employee_id])
    approvals = relationship("LeaveApproval", back_populates="leave_request")


class LeaveApproval(Base):
    __tablename__ = "leave_approvals"

    id = Column(Integer, primary_key=True, index=True)
    leave_request_id = Column(Integer, ForeignKey("leave_requests.id"), nullable=False, index=True)
    approver_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    level = Column(Integer, nullable=False)  # 1=manager, 2=dept_head, 3=hr
    action = Column(SAEnum(ApprovalAction), nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    leave_request = relationship("LeaveRequest", back_populates="approvals")
    approver = relationship("Employee", foreign_keys=[approver_id])
