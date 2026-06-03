from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime
import enum


class ExpenseCategory(str, enum.Enum):
    travel = "travel"
    accommodation = "accommodation"
    food = "food"
    communication = "communication"
    office_supplies = "office_supplies"
    medical = "medical"
    training = "training"
    client_entertainment = "client_entertainment"
    other = "other"


class ExpenseClaim(Base):
    __tablename__ = "expense_claims"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(ExpenseCategory), nullable=False)
    amount = Column(Float, nullable=False)
    expense_date = Column(Date, nullable=False)
    receipt_path = Column(String, nullable=True)

    status = Column(String, default="pending")  # pending/approved/rejected/paid
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    payroll_cycle_id = Column(Integer, ForeignKey("payroll_cycles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approved_by])
