"""health.py — Health Check Route"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ai-book-writer"}
