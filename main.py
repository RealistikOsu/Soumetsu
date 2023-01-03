from __future__ import annotations

import logging as stdlib_logging
import sys

import uvicorn

from soumetsu import logger
from soumetsu.config import config


def install_loop() -> bool:
    try:
        import uvloop

        uvloop.install()
        return True
    except ImportError:
        return False


IS_WINDOWS = sys.platform == "win32"


def main() -> int:
    logger.configure_logging(
        config.log_level,
    )

    if (not install_loop()) and not IS_WINDOWS:
        logger.warning("Uvloop is not installed! Expect degraded performance.")

    logger.info(f"Running Soumetsu on http://{config.http_host}:{config.http_port}/")
    uvicorn.run(
        "soumetsu.init_api:asgi_app",
        log_level=stdlib_logging.WARNING,
        server_header=False,
        date_header=False,
        host=config.http_host,
        port=config.http_port,
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
