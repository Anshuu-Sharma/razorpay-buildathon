from pydantic import BaseModel
from datetime import datetime
from typing import Any, Dict

class AuditTrailBase(BaseModel):
    event_id: str
    transaction_id: str
    node_name: str
    action_type: str
    payload: Dict[str, Any]
    outcome: str

class AuditTrailCreate(AuditTrailBase):
    pass

class AuditTrailResponse(AuditTrailBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
