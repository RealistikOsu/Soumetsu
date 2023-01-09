from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.responses import Response


router = APIRouter(
    default_response_class=PlainTextResponse,
)


@router.get("/")
async def main_get() -> str:
    return "Running Soumetsu!"


@router.post("/")
async def main_post() -> Response:
    # TODO: Check client ver?
    ...
