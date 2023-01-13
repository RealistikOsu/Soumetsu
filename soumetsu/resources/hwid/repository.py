from __future__ import annotations

from typing import Any
from typing import Mapping
from typing import Optional

from soumetsu.resources.hwid.models import HWIDLog
from soumetsu.state import services


def from_db_mapping(mapping: Mapping[str, Any]) -> HWIDLog:
    return HWIDLog(
        id=mapping["id"],
        user_id=mapping["userid"],
        mac_hash=mapping["mac"],
        unique_hash=mapping["unique_id"],
        disk_hash=mapping["disk_id"],
        occurences=mapping["occurencies"],  # Ripple typo lmfao
        activated=mapping["activated"],
    )


def into_db_dict(hwid: HWIDLog, include_id: bool = True) -> Mapping[str, Any]:
    res = {
        "userid": hwid.user_id,
        "mac": hwid.mac_hash,
        "unique_id": hwid.unique_hash,
        "disk_id": hwid.disk_hash,
        "occurencies": hwid.occurences,
        "activated": hwid.activated,
    }

    if include_id:
        res["id"] = hwid.id

    return res


async def from_db(log_id: int) -> Optional[HWIDLog]:
    res_db = await services.mysql.fetch_one(
        "SELECT * FROM hw_user WHERE id = :log_id",
        {"log_id": log_id},
    )

    if res_db is None:
        return None

    return from_db_mapping(res_db)


async def from_db_user(user_id: int) -> Optional[HWIDLog]:
    res_db = await services.mysql.fetch_one(
        "SELECT * FROM hw_user WHERE userid = :user_id",
        {"user_id": user_id},
    )

    if res_db is None:
        return None

    return from_db_mapping(res_db)


async def insert(hwid: HWIDLog) -> int:
    return await services.mysql.execute(
        "INSERT INTO hw_user (userid, mac, unique_id, disk_id, "
        "occurencies, activated) VALUES (:userid, :mac, :unique_id, "
        ":disk_id, :occurencies, :activated)",
        into_db_dict(hwid),
    )
