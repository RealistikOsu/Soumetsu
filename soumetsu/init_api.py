from __future__ import annotations

from fastapi import FastAPI


def init_routers(app: FastAPI) -> None:
    ...


def init_events(app: FastAPI) -> None:
    ...


def create_app() -> FastAPI:
    app = FastAPI(
        title="Soumetsu",
    )

    init_routers(app)
    init_events(app)

    return app


asgi_app = create_app()
