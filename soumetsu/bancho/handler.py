from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse


router = APIRouter(
    default_response_class=PlainTextResponse,
)


@router.get("/")
async def main_get() -> str:
    return "Running Soumetsu!"
