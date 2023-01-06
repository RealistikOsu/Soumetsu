from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from typing import TypeVar
from typing import Union

from geoip2 import database


T = TypeVar("T")


@dataclass
class GeolocationResult:
    longitude: float
    latitude: float
    iso_code: str


class GeolocationDatabase:
    def __init__(self) -> None:
        self._db: Optional[database.Reader] = None

    def load_database(self, location: str) -> None:
        self._db = database.Reader(location)

    def __ensure_db(self) -> database.Reader:
        if self._db is None:
            raise RuntimeError(
                "Attempted to use the geolocation database before loading.",
            )

        return self._db

    def get(self, ip: str, default: T = None) -> Union[GeolocationResult, T]:
        db = self.__ensure_db()
        res = db.city(ip)

        if res is None:
            return default

        return GeolocationResult(
            longitude=res.location.latitude or 0,
            latitude=res.location.longitude or 0,
            iso_code=res.country.iso_code or "XX",
        )
