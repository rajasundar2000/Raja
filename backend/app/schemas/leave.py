from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.leave import LeaveStatus, ApprovalAction


class LeaveTypeBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=10)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    annual_entitlement: float = Field(0.0, ge=0)
    max_carry_forward: float = Field(0.0, ge=0)
    is_encashable: bool = False
    is_paid: bool = True
    requires_medical_cert_after_days: Optional[int] = None
    can_club_with_cl: bool = True
    can_club_with_el: bool = True


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeResponse(LeaveTypeBase):
    id: int
    is_active: bool

    model_config = {"from_attributes": True}


class LeaveEntitlementResponse(BaseModel):
    id: int
    employee_id: int
    leave_type_id: int
    year: int
    total_days: float
    used_days: float
    carried_forward: float
    encashed_days: float
    available_days: float
    leave_type: Optional[LeaveTypeResponse] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        data = {
            "id": obj.id,
            "employee_id": obj.employee_id,
            "leave_type_id": obj.leave_type_id,
            "year": obj.year,
            "total_days": obj.total_days,
            "used_days": obj.used_days,
            "carried_forward": obj.carried_forward,
            "encashed_days": obj.encashed_days,
            "available_days": obj.available_days,
        }
        if obj.leave_type:
            data["leave_type"] = LeaveTypeResponse.model_validate(obj.leave_type)
        return cls(**data)


class LeaveRequestBase(BaseModel):
    employee_id: int
    leave_type_id: int
    from_date: date
    to_date: date
    reason: Optional[str] = None
    backfill_employee_id: Optional[int] = None


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestUpdate(BaseModel):
    reason: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    backfill_employee_id: Optional[int] = None


class LeaveRequestResponse(BaseModel):
    id: int
    employee_id: int
    leave_type_id: int
    from_date: date
    to_date: date
    total_days: float
    reason: Optional[str] = None
    status: LeaveStatus
    approved_by: Optional[int] = None
    rejected_reason: Optional[str] = None
    attachment_path: Optional[str] = None
    backfill_employee_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    leave_type_name: Optional[str] = None
    leave_type_code: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        data = {
            "id": obj.id,
            "employee_id": obj.employee_id,
            "leave_type_id": obj.leave_type_id,
            "from_date": obj.from_date,
            "to_date": obj.to_date,
            "total_days": obj.total_days,
            "reason": obj.reason,
            "status": obj.status,
            "approved_by": obj.approved_by,
            "rejected_reason": obj.rejected_reason,
            "attachment_path": obj.attachment_path,
            "backfill_employee_id": obj.backfill_employee_id,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        }
        if obj.employee:
            data["employee_name"] = obj.employee.full_name
        if obj.leave_type:
            data["leave_type_name"] = obj.leave_type.name
            data["leave_type_code"] = obj.leave_type.code
        return cls(**data)


class LeaveApprovalCreate(BaseModel):
    leave_request_id: int
    approver_id: int
    level: int = Field(1, ge=1, le=3)
    action: ApprovalAction
    comments: Optional[str] = None


class LeaveApprovalResponse(BaseModel):
    id: int
    leave_request_id: int
    approver_id: int
    level: int
    action: ApprovalAction
    comments: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
