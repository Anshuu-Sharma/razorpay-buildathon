"""Model registry.

Importing every model here guarantees they are all attached to ``Base``'s
metadata as soon as the package is imported, so table creation no longer
depends on the order models happen to be imported elsewhere.
"""

from app.models.audit_trail import AuditTrail
from app.models.transaction_state import TransactionState

__all__ = ["AuditTrail", "TransactionState"]
