from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    basic_salary = Column(Float, nullable=False, default=0.0)
    hra_percentage = Column(Float, default=40.0, nullable=False)
    da_amount = Column(Float, default=0.0, nullable=False)
    conveyance_allowance = Column(Float, default=1600.0, nullable=False)
    medical_allowance = Column(Float, default=1250.0, nullable=False)
    special_allowance = Column(Float, default=0.0, nullable=False)
    lta_annual = Column(Float, default=0.0, nullable=False)
    other_allowances = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="salary_structures", foreign_keys=[employee_id])

    @property
    def hra_amount(self) -> float:
        return round(self.basic_salary * self.hra_percentage / 100, 2)

    @property
    def lta_monthly(self) -> float:
        return round(self.lta_annual / 12, 2)

    @property
    def gross_salary(self) -> float:
        return round(
            self.basic_salary
            + self.hra_amount
            + self.da_amount
            + self.conveyance_allowance
            + self.medical_allowance
            + self.special_allowance
            + self.lta_monthly
            + self.other_allowances,
            2
        )

    @property
    def monthly_salary(self) -> float:
        return self.gross_salary

    @property
    def annual_ctc(self) -> float:
        return round(self.gross_salary * 12, 2)
