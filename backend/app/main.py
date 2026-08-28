from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise the schema on startup instead of at import time, so importing
    # the app (e.g. in tests) has no database side effects.
    init_db()
    yield


app = FastAPI(
    title="AI Revenue Recovery Engine",
    description="FastAPI backend orchestrating LLM-driven payment recovery workflows.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: explicit origins from config. A wildcard is deliberately not used
# because it is invalid in combination with credentialed requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "AI Revenue Recovery Engine API is running. Check /docs for Swagger UI."}
