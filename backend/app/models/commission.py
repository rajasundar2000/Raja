from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from datetime import datetime


class CommissionType(str, enum.Enum):
    FLAT = "flat"                   # Fixed amount per deal
    PERCENTAGE = "percentage"       # % of deal value
    TIERED = "tiered"               # Tiered based on targets
    TARGET_BONUS = "target_bonus"   # Bonus on hitting target


class CommissionStructure(Base):
    """Template for commission plan per employee/role"""
    __tablename__ = "commission_structures"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    commission_type = Column(Enum(CommissionType), nullable=False)

    # For FLAT type
    flat_amount = Column(Float, nullable=True)

    # For PERCENTAGE type
    percentage_rate = Column(Float, nullable=True)  # e.g. 5.0 for 5%

    # For TIERED type (JSON string storing tiers)
    # Format: [{"min_sales": 0, "max_sales": 100000, "rate": 2}, ...]
    tiers_json = Column(Text, nullable=True)

    # Target
    monthly_target = Column(Float, nullable=True)   # Sales target for the month

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmployeeCommissionAssignment(Base):
    """Assigns a commission structure to an employee"""
    __tablename__ = "employee_commission_assignments"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    commission_structure_id = Column(Integer, ForeignKey("commission_structures.id"), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)

    employee = relationship("Employee", back_populates="commission_assignments")
    structure = relationship("CommissionStructure")


class CommissionEntry(Base):
    """Individual commission earned by an employee"""
    __tablename__ = "commission_entries"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    commission_structure_id = Column(Integer, ForeignKey("commission_structures.id"), nullable=True)

    month = Column(Integer, nullable=False)   # 1-12
    year = Column(Integer, nullable=False)

    description = Column(String, nullable=False)   # e.g., "Deal: Acme Corp - Software License"
    deal_value = Column(Float, nullable=True)       # Value of underlying deal/sale
    commission_amount = Column(Float, nullable=False)  # Calculated commission amount

    status = Column(String, default="pending")  # pending/approved/paid/rejected
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Link to payroll when paid
    payroll_cycle_id = Column(Integer, ForeignKey("payroll_cycles.id"), nullable=True)

    employee = relationship("Employee", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approved_by])
