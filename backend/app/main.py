from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health
from app.database import engine, Base
from app.models import audit_trail, transaction_state

# Create database tables (sync for local sqlite simplicity during dev)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Revenue Recovery Engine",
    description="FastAPI backend orchestrating LLM-driven payment recovery workflows.",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "AI Revenue Recovery Engine API is running. Check /docs for Swagger UI."}
