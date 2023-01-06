from __future__ import annotations

from fastapi import FastAPI

from soumetsu.bancho.handler import router as bancho_handler


def init_routers(app: FastAPI) -> None:
    app.include_router(bancho_handler)


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
