from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.responses import Response

from soumetsu.bancho.events import router


router = APIRouter(
    default_response_class=PlainTextResponse,
)


@router.get("/")
async def main_get() -> str:
    return "Running Soumetsu!"


@router.post("/")
async def main_post() -> Response:
    ...
