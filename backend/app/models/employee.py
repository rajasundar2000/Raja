import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    ForeignKey, Enum as SAEnum, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    employee = "employee"
    manager = "manager"
    hr = "hr"
    finance = "finance"
    super_admin = "super_admin"


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    date_of_joining = Column(Date, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    pan_number = Column(String(20), nullable=True)
    aadhaar_number = Column(String(4), nullable=True)  # last 4 digits only
    bank_account_last4 = Column(String(4), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.employee, nullable=False)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    state = Column(String(50), default="Karnataka", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    manager = relationship("Employee", remote_side=[id], foreign_keys=[manager_id], backref="subordinates")
    salary_structures = relationship("SalaryStructure", back_populates="employee", foreign_keys="SalaryStructure.employee_id")
    leave_entitlements = relationship("LeaveEntitlement", back_populates="employee", foreign_keys="LeaveEntitlement.employee_id")
    leave_requests = relationship("LeaveRequest", back_populates="employee", foreign_keys="LeaveRequest.employee_id")
    salary_slips = relationship("SalarySlip", back_populates="employee", foreign_keys="SalarySlip.employee_id")
    loans = relationship("Loan", back_populates="employee", foreign_keys="Loan.employee_id")
