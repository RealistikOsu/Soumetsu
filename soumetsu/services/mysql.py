from __future__ import annotations

import asyncql

MySQLPool = asyncql.Database


def create_url(
    username: str,
    # TODO: Make password optional
    password: str,
    host: str,
    port: int,
    database: str,
) -> str:
    return f"mysql://{username}:{password}@{host}:{port}/{database}"
