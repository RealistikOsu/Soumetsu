from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum

from soumetsu.resources.hwid.models import HWIDLog
from soumetsu.resources.user.models import User


class Session:
    token: str
    user: User
    hwid: HWIDLog
    # NOTE: Maybe use a different solution to queues?
    buffer: bytearray

    # TODO: Actions, beatmaps, offsets, etc

    def send(self, buffer: bytes) -> None:
        self.buffer += buffer
