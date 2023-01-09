from __future__ import annotations

from dataclasses import dataclass

from soumetsu.resources.user.models import User


class Session:
    token: str
    user: User
    # NOTE: Maybe use a different solution to queues?
    buffer: bytearray

    # TODO: Actions, beatmaps, offsets, etc
