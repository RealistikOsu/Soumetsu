from __future__ import annotations

from dataclasses import dataclass


@dataclass
class HWIDLog:
    id: int
    user_id: int
    mac_hash: str
    unique_hash: str
    disk_hash: str
    occurences: int
    activated: bool
