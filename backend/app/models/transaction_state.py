from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.orm import relationship

from app.database import Base

class TransactionState(Base):
    __tablename__ = "transaction_states"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(64), unique=True, index=True, nullable=False)
    razorpay_payment_id = Column(String(64), nullable=False)
    failure_class = Column(Integer, nullable=False) # 1-4
    current_state = Column(String(32), nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    merchant_id = Column(String(64), nullable=False)
    customer_contact = Column(String(128), nullable=False)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    metadata_json = Column(JSON, nullable=True) # renamed from metadata as metadata is reserved in sqlalchemy Base
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    audit_trails = relationship("AuditTrail", backref="transaction_state")
