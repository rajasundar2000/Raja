from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.payroll import PayrollStatus, SlipStatus, LoanType, LoanStatus, HolidayType, HolidayCountry


class HolidayBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    date: date
    holiday_type: HolidayType = HolidayType.national
    country: HolidayCountry = HolidayCountry.india
    year: int


class HolidayCreate(HolidayBase):
    pass


class HolidayResponse(HolidayBase):
    id: int
    is_active: bool

    model_config = {"from_attributes": True}


class PayrollCycleBase(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    start_date: date
    end_date: date
    payment_date: Optional[date] = None
    cutoff_date: Optional[date] = None


class PayrollCycleCreate(PayrollCycleBase):
    pass


class PayrollCycleResponse(PayrollCycleBase):
    id: int
    status: PayrollStatus
    created_at: datetime
    processed_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    slip_count: Optional[int] = 0

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        data = {
            "id": obj.id,
            "month": obj.month,
            "year": obj.year,
            "status": obj.status,
            "start_date": obj.start_date,
            "end_date": obj.end_date,
            "payment_date": obj.payment_date,
            "cutoff_date": obj.cutoff_date,
            "created_at": obj.created_at,
            "processed_at": obj.processed_at,
            "approved_by": obj.approved_by,
            "slip_count": len(obj.salary_slips) if obj.salary_slips else 0,
        }
        return cls(**data)


class SalarySlipResponse(BaseModel):
    id: int
    payroll_cycle_id: int
    employee_id: int
    basic_salary: float
    hra: float
    da: float
    conveyance: float
    medical: float
    special_allowance: float
    lta: float
    other_allowances: float
    gross_earnings: float
    pf_employee: float
    pf_employer: float
    esi_employee: float
    esi_employer: float
    professional_tax: float
    income_tax: float
    other_deductions: float
    total_deductions: float
    net_pay: float
    unpaid_leave_days: float
    unpaid_leave_deduction: float
    ytd_earnings: float
    ytd_deductions: float
    ytd_tax: float
    status: SlipStatus
    created_at: datetime
    employee_name: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        data = {
            "id": obj.id,
            "payroll_cycle_id": obj.payroll_cycle_id,
            "employee_id": obj.employee_id,
            "basic_salary": obj.basic_salary,
            "hra": obj.hra,
            "da": obj.da,
            "conveyance": obj.conveyance,
            "medical": obj.medical,
            "special_allowance": obj.special_allowance,
            "lta": obj.lta,
            "other_allowances": obj.other_allowances,
            "gross_earnings": obj.gross_earnings,
            "pf_employee": obj.pf_employee,
            "pf_employer": obj.pf_employer,
            "esi_employee": obj.esi_employee,
            "esi_employer": obj.esi_employer,
            "professional_tax": obj.professional_tax,
            "income_tax": obj.income_tax,
            "other_deductions": obj.other_deductions,
            "total_deductions": obj.total_deductions,
            "net_pay": obj.net_pay,
            "unpaid_leave_days": obj.unpaid_leave_days,
            "unpaid_leave_deduction": obj.unpaid_leave_deduction,
            "ytd_earnings": obj.ytd_earnings,
            "ytd_deductions": obj.ytd_deductions,
            "ytd_tax": obj.ytd_tax,
            "status": obj.status,
            "created_at": obj.created_at,
        }
        if obj.employee:
            data["employee_name"] = obj.employee.full_name
        if obj.payroll_cycle:
            data["month"] = obj.payroll_cycle.month
            data["year"] = obj.payroll_cycle.year
        return cls(**data)


class LoanBase(BaseModel):
    employee_id: int
    loan_type: LoanType
    amount: float = Field(..., gt=0)
    interest_rate: float = Field(0.0, ge=0)
    tenure_months: int = Field(1, ge=1)
    purpose: Optional[str] = None


class LoanCreate(LoanBase):
    pass


class LoanResponse(LoanBase):
    id: int
    emi_amount: float
    outstanding_balance: float
    status: LoanStatus
    disbursement_date: Optional[date] = None
    approved_by: Optional[int] = None
    created_at: datetime
    employee_name: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        data = {
            "id": obj.id,
            "employee_id": obj.employee_id,
            "loan_type": obj.loan_type,
            "amount": obj.amount,
            "interest_rate": obj.interest_rate,
            "tenure_months": obj.tenure_months,
            "purpose": obj.purpose,
            "emi_amount": obj.emi_amount,
            "outstanding_balance": obj.outstanding_balance,
            "status": obj.status,
            "disbursement_date": obj.disbursement_date,
            "approved_by": obj.approved_by,
            "created_at": obj.created_at,
        }
        if obj.employee:
            data["employee_name"] = obj.employee.full_name
        return cls(**data)
