"""
Pydantic v2 schemas for commission structures, assignments, entries, and summaries.
"""
import json
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator

from app.models.commission import CommissionType


# --------------------------------------------------------------------------- #
# CommissionStructure
# --------------------------------------------------------------------------- #

class CommissionStructureCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    commission_type: CommissionType
    flat_amount: Optional[float] = None
    percentage_rate: Optional[float] = None
    tiers_json: Optional[str] = None   # JSON string
    monthly_target: Optional[float] = None
    is_active: bool = True


class CommissionStructureResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    commission_type: CommissionType
    flat_amount: Optional[float] = None
    percentage_rate: Optional[float] = None
    tiers: Optional[List[Dict[str, Any]]] = None   # parsed from tiers_json
    monthly_target: Optional[float] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        tiers = None
        if obj.tiers_json:
            try:
                tiers = json.loads(obj.tiers_json)
            except (json.JSONDecodeError, TypeError):
                tiers = None
        return cls(
            id=obj.id,
            name=obj.name,
            description=obj.description,
            commission_type=obj.commission_type,
            flat_amount=obj.flat_amount,
            percentage_rate=obj.percentage_rate,
            tiers=tiers,
            monthly_target=obj.monthly_target,
            is_active=obj.is_active,
            created_at=obj.created_at,
        )


class CommissionStructureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    commission_type: Optional[CommissionType] = None
    flat_amount: Optional[float] = None
    percentage_rate: Optional[float] = None
    tiers_json: Optional[str] = None
    monthly_target: Optional[float] = None
    is_active: Optional[bool] = None


# --------------------------------------------------------------------------- #
# CommissionAssignment
# --------------------------------------------------------------------------- #

class CommissionAssignmentCreate(BaseModel):
    commission_structure_id: int
    effective_from: date
    effective_to: Optional[date] = None
    is_active: bool = True


class CommissionAssignmentResponse(BaseModel):
    id: int
    employee_id: int
    commission_structure_id: int
    effective_from: date
    effective_to: Optional[date] = None
    is_active: bool
    structure: Optional[CommissionStructureResponse] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        structure = None
        if obj.structure:
            structure = CommissionStructureResponse.model_validate(obj.structure)
        return cls(
            id=obj.id,
            employee_id=obj.employee_id,
            commission_structure_id=obj.commission_structure_id,
            effective_from=obj.effective_from,
            effective_to=obj.effective_to,
            is_active=obj.is_active,
            structure=structure,
        )


# --------------------------------------------------------------------------- #
# CommissionEntry
# --------------------------------------------------------------------------- #

class CommissionEntryCreate(BaseModel):
    employee_id: int
    description: str = Field(..., min_length=1)
    deal_value: Optional[float] = None
    commission_structure_id: Optional[int] = None
    commission_amount: float = Field(..., gt=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    notes: Optional[str] = None


class CommissionEntryResponse(BaseModel):
    id: int
    employee_id: int
    commission_structure_id: Optional[int] = None
    month: int
    year: int
    description: str
    deal_value: Optional[float] = None
    commission_amount: float
    status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    payroll_cycle_id: Optional[int] = None
    employee_name: Optional[str] = None
    approver_name: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        employee_name = obj.employee.full_name if obj.employee else None
        approver_name = obj.approver.full_name if obj.approver else None
        return cls(
            id=obj.id,
            employee_id=obj.employee_id,
            commission_structure_id=obj.commission_structure_id,
            month=obj.month,
            year=obj.year,
            description=obj.description,
            deal_value=obj.deal_value,
            commission_amount=obj.commission_amount,
            status=obj.status,
            approved_by=obj.approved_by,
            approved_at=obj.approved_at,
            notes=obj.notes,
            created_at=obj.created_at,
            payroll_cycle_id=obj.payroll_cycle_id,
            employee_name=employee_name,
            approver_name=approver_name,
        )


class CommissionApprovalRequest(BaseModel):
    action: str = Field(..., pattern="^(approved|rejected)$")
    notes: Optional[str] = None


# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #

class MonthlyCommissionSummary(BaseModel):
    employee_id: int
    employee_name: Optional[str] = None
    month: int
    year: int
    total_commission: float
    approved_commission: float
    pending_commission: float
    paid_commission: float
    entries: List[CommissionEntryResponse]


# --------------------------------------------------------------------------- #
# Calculate helper
# --------------------------------------------------------------------------- #

class CommissionCalculateResponse(BaseModel):
    structure_id: int
    structure_name: str
    commission_type: CommissionType
    deal_value: Optional[float]
    commission_amount: float
    notes: str
