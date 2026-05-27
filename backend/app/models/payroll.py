import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    ForeignKey, Enum as SAEnum, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class PayrollStatus(str, enum.Enum):
    draft = "draft"
    processing = "processing"
    approved = "approved"
    paid = "paid"
    locked = "locked"


class SlipStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    paid = "paid"


class LoanType(str, enum.Enum):
    personal = "personal"
    salary_advance = "salary_advance"
    festival = "festival"
    emergency = "emergency"


class LoanStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    active = "active"
    closed = "closed"


class HolidayType(str, enum.Enum):
    national = "national"
    state = "state"
    us = "us"
    floating = "floating"


class HolidayCountry(str, enum.Enum):
    india = "india"
    us = "us"


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    date = Column(Date, nullable=False, index=True)
    holiday_type = Column(SAEnum(HolidayType), default=HolidayType.national, nullable=False)
    country = Column(SAEnum(HolidayCountry), default=HolidayCountry.india, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    year = Column(Integer, nullable=False, index=True)


class PayrollCycle(Base):
    __tablename__ = "payroll_cycles"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(SAEnum(PayrollStatus), default=PayrollStatus.draft, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=True)
    cutoff_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)

    # Relationships
    approver = relationship("Employee", foreign_keys=[approved_by])
    salary_slips = relationship("SalarySlip", back_populates="payroll_cycle")


class SalarySlip(Base):
    __tablename__ = "salary_slips"

    id = Column(Integer, primary_key=True, index=True)
    payroll_cycle_id = Column(Integer, ForeignKey("payroll_cycles.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)

    # Earnings
    basic_salary = Column(Float, default=0.0, nullable=False)
    hra = Column(Float, default=0.0, nullable=False)
    da = Column(Float, default=0.0, nullable=False)
    conveyance = Column(Float, default=0.0, nullable=False)
    medical = Column(Float, default=0.0, nullable=False)
    special_allowance = Column(Float, default=0.0, nullable=False)
    lta = Column(Float, default=0.0, nullable=False)
    other_allowances = Column(Float, default=0.0, nullable=False)
    gross_earnings = Column(Float, default=0.0, nullable=False)

    # Deductions
    pf_employee = Column(Float, default=0.0, nullable=False)
    pf_employer = Column(Float, default=0.0, nullable=False)
    esi_employee = Column(Float, default=0.0, nullable=False)
    esi_employer = Column(Float, default=0.0, nullable=False)
    professional_tax = Column(Float, default=0.0, nullable=False)
    income_tax = Column(Float, default=0.0, nullable=False)
    other_deductions = Column(Float, default=0.0, nullable=False)
    total_deductions = Column(Float, default=0.0, nullable=False)
    net_pay = Column(Float, default=0.0, nullable=False)

    # Leave deductions
    unpaid_leave_days = Column(Float, default=0.0, nullable=False)
    unpaid_leave_deduction = Column(Float, default=0.0, nullable=False)

    # YTD
    ytd_earnings = Column(Float, default=0.0, nullable=False)
    ytd_deductions = Column(Float, default=0.0, nullable=False)
    ytd_tax = Column(Float, default=0.0, nullable=False)

    status = Column(SAEnum(SlipStatus), default=SlipStatus.draft, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    payroll_cycle = relationship("PayrollCycle", back_populates="salary_slips")
    employee = relationship("Employee", back_populates="salary_slips", foreign_keys=[employee_id])


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    loan_type = Column(SAEnum(LoanType), nullable=False)
    amount = Column(Float, nullable=False)
    interest_rate = Column(Float, default=0.0, nullable=False)
    tenure_months = Column(Integer, nullable=False, default=1)
    emi_amount = Column(Float, default=0.0, nullable=False)
    outstanding_balance = Column(Float, default=0.0, nullable=False)
    status = Column(SAEnum(LoanStatus), default=LoanStatus.pending, nullable=False)
    disbursement_date = Column(Date, nullable=True)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    purpose = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="loans", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approved_by])
    payments = relationship("LoanPayment", back_populates="loan")


class LoanPayment(Base):
    __tablename__ = "loan_payments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False, index=True)
    payroll_cycle_id = Column(Integer, ForeignKey("payroll_cycles.id"), nullable=True)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    principal = Column(Float, default=0.0, nullable=False)
    interest = Column(Float, default=0.0, nullable=False)
    balance_after = Column(Float, default=0.0, nullable=False)

    # Relationships
    loan = relationship("Loan", back_populates="payments")
    payroll_cycle = relationship("PayrollCycle", foreign_keys=[payroll_cycle_id])
