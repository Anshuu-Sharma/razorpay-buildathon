"""Production wiring for the orchestrator.

Kept separate from the graph so the graph itself imports nothing heavy (no
Gemini client, no live SDKs). This factory is a FastAPI dependency, which means
tests can override it with fakes via ``app.dependency_overrides`` exactly like
the DB session.
"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.adapters.dispatcher import build_dispatcher
from app.database import get_db
from app.orchestrator.graph import OrchestratorDeps
from app.services.policy_sandbox import PolicySandbox


def get_orchestrator_deps(db: Session = Depends(get_db)) -> OrchestratorDeps:
    # Imported lazily so a missing GEMINI_API_KEY only bites when orchestration
    # actually runs, not at import time.
    from app.services.gemini_client import default_diagnosis_engine

    return OrchestratorDeps(
        db=db,
        diagnosis=default_diagnosis_engine(),
        sandbox=PolicySandbox.from_default_policy(),
        dispatch=build_dispatcher(db),
    )
