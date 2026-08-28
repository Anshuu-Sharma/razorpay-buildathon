from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey

from app.database import Base

class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    transaction_id = Column(String(64), ForeignKey("transaction_states.transaction_id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    node_name = Column(String(32), nullable=False) # e.g., INGEST, DIAGNOSE
    action_type = Column(String(32), nullable=False) # e.g., STATE_TRANSITION
    payload = Column(JSON, nullable=False)
    outcome = Column(String(16), nullable=False) # SUCCESS, FAILURE, ESCALATED
