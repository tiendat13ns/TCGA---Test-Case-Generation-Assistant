from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.documents import router as documents_router

app = FastAPI(title="AI Test Case Generation Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)


@app.get("/")
def health_check():
    return {"status": "ok"}
