from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.employee import UserRole


class EmployeeBase(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=20)
    full_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    date_of_joining: Optional[date] = None
    date_of_birth: Optional[date] = None
    pan_number: Optional[str] = Field(None, max_length=20)
    aadhaar_number: Optional[str] = Field(None, max_length=4, description="Last 4 digits of Aadhaar")
    bank_account_last4: Optional[str] = Field(None, max_length=4)
    bank_ifsc: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.employee
    manager_id: Optional[int] = None
    state: str = "Karnataka"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    date_of_joining: Optional[date] = None
    date_of_birth: Optional[date] = None
    pan_number: Optional[str] = Field(None, max_length=20)
    aadhaar_number: Optional[str] = Field(None, max_length=4)
    bank_account_last4: Optional[str] = Field(None, max_length=4)
    bank_ifsc: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None
    state: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    manager_name: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        instance = super().model_validate(obj, *args, **kwargs)
        if obj.manager:
            instance.manager_name = obj.manager.full_name
        return instance


class SalaryStructureBase(BaseModel):
    effective_from: date
    effective_to: Optional[date] = None
    basic_salary: float = Field(..., ge=0)
    hra_percentage: float = Field(40.0, ge=0, le=100)
    da_amount: float = Field(0.0, ge=0)
    conveyance_allowance: float = Field(1600.0, ge=0)
    medical_allowance: float = Field(1250.0, ge=0)
    special_allowance: float = Field(0.0, ge=0)
    lta_annual: float = Field(0.0, ge=0)
    other_allowances: float = Field(0.0, ge=0)


class SalaryStructureCreate(SalaryStructureBase):
    pass


class SalaryStructureResponse(SalaryStructureBase):
    id: int
    employee_id: int
    is_active: bool
    created_at: datetime
    hra_amount: float
    lta_monthly: float
    gross_salary: float
    monthly_salary: float
    annual_ctc: float

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        data = {
            "id": obj.id,
            "employee_id": obj.employee_id,
            "effective_from": obj.effective_from,
            "effective_to": obj.effective_to,
            "basic_salary": obj.basic_salary,
            "hra_percentage": obj.hra_percentage,
            "da_amount": obj.da_amount,
            "conveyance_allowance": obj.conveyance_allowance,
            "medical_allowance": obj.medical_allowance,
            "special_allowance": obj.special_allowance,
            "lta_annual": obj.lta_annual,
            "other_allowances": obj.other_allowances,
            "is_active": obj.is_active,
            "created_at": obj.created_at,
            "hra_amount": obj.hra_amount,
            "lta_monthly": obj.lta_monthly,
            "gross_salary": obj.gross_salary,
            "monthly_salary": obj.monthly_salary,
            "annual_ctc": obj.annual_ctc,
        }
        return cls(**data)
