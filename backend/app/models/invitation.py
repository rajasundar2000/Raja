from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime


class EmployeeInvitation(Base):
    __tablename__ = "employee_invitations"

    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    invited_by = Column(Integer, ForeignKey("employees.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)  # set after accepted

    # Pre-filled data for new employee creation
    full_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    role = Column(String, default="employee")

    is_accepted = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    inviter = relationship("Employee", foreign_keys=[invited_by])
