from pydantic import BaseModel
from datetime import datetime
from typing import Any, Dict, Optional

class TransactionStateBase(BaseModel):
    transaction_id: str
    razorpay_payment_id: str
    failure_class: int
    current_state: str
    merchant_id: str
    customer_contact: str
    amount_cents: int
    currency: str = "INR"
    metadata_json: Optional[Dict[str, Any]] = None

class TransactionStateCreate(TransactionStateBase):
    pass

class TransactionStateUpdate(BaseModel):
    current_state: Optional[str] = None
    retry_count: Optional[int] = None
    metadata_json: Optional[Dict[str, Any]] = None

class TransactionStateResponse(TransactionStateBase):
    id: int
    retry_count: int
    max_retries: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
