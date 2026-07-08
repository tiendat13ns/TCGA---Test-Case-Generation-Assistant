import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import check_database_connection, init_db
from app.routers.ai import router as ai_router
from app.routers.documents import router as documents_router
from app.routers.requirements import router as requirements_router
from app.routers.test_cases import router as test_cases_router

app = FastAPI(title="AI Test Case Generation Assistant")

logging.basicConfig(level=logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(ai_router)
app.include_router(requirements_router)
app.include_router(test_cases_router)


@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as exc:
        print(f"WARNING: Database initialization failed: {exc}")
        print("WARNING: Backend will start, but database-backed APIs may fail until DATABASE_URL/network is fixed.")


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/health/db")
def database_health_check():
    connected, error = check_database_connection()

    return {
        "database_connected": connected,
        "error": error,
    }
