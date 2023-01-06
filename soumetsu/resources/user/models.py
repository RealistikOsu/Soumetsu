from __future__ import annotations

from dataclasses import dataclass

from soumetsu.resources.user.constants import Privileges


@dataclass
class User:
    id: int
    name: str
    name_safe: str
    password_hash: str
    email: str
    ban_timestamp: int
    register_timestamp: int
    last_online_timestamp: int
    supporter_expiry_timestamp: int
    silence_end_timestamp: int
    silence_reason: str
    privileges: Privileges
    notes: str
    country: ...

    # TODO: Cleanup frozen
    frozen: bool
    freeze_end_timestamp: int
