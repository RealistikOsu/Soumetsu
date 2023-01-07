from __future__ import annotations

from fastapi import FastAPI

from soumetsu import logger
from soumetsu import state
from soumetsu.bancho.handler import router as bancho_handler
from soumetsu.config import config


def init_routers(app: FastAPI) -> None:
    app.include_router(bancho_handler)


def init_events(app: FastAPI) -> None:
    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info("Loading Geolocation Datbase...")
        state.services.geolocation.load_database(config.geoloc_db_dir)
        logger.info("Connecting to MySQL...")
        await state.services.mysql.connect()

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        logger.info("Unloading Geolocation Database...")
        state.services.geolocation.unload()
        logger.info("Disconnecting from MySQL...")
        await state.services.mysql.disconnect()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Soumetsu",
    )

    init_routers(app)
    init_events(app)

    return app


asgi_app = create_app()
