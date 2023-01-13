from __future__ import annotations

from typing import Any
from typing import Mapping
from typing import Optional

from soumetsu.resources.user.constants import Privileges
from soumetsu.resources.user.models import User
from soumetsu.state import services


def from_db_mapping(mapping: Mapping[str, Any]) -> User:
    return User(
        id=mapping["id"],
        name=mapping["username"],
        name_safe=mapping["username_safe"],
        password_hash=mapping["password_md5"],
        email=mapping["email"],
        ban_timestamp=mapping["ban_datetime"],
        register_timestamp=mapping["register_datetime"],
        last_online_timestamp=mapping["latest_activity"],
        supporter_expiry_timestamp=mapping["donor_expire"],
        silence_end_timestamp=mapping["silence_end"],
        silence_reason=mapping["silence_reason"],
        privileges=Privileges(mapping["privileges"]),
        notes=mapping["notes"],
        country=mapping["country"],  # TODO: Make this an enum.
        frozen=mapping["forzen"],
        freeze_end_timestamp=mapping["freezedate"],
    )


def into_db_dict(user: User, include_id: bool = True) -> Mapping[str, Any]:
    res = {
        "username": user.name,
        "username_safe": user.name_safe,
        "password_md5": user.password_hash,
        "email": user.email,
        "ban_datetime": user.ban_timestamp,
        "register_datetime": user.register_timestamp,
        "latest_activity": user.last_online_timestamp,
        "donor_expire": user.supporter_expiry_timestamp,
        "silence_end": user.silence_end_timestamp,
        "silence_reason": user.silence_reason,
        "privileges": user.privileges.value,
        "notes": user.notes,
        "country": user.country,
        "forzen": user.frozen,
        "freezedate": user.freeze_end_timestamp,
    }

    if include_id:
        res["id"] = user.id

    return res


async def from_db(user_id: int) -> Optional[User]:
    res_db = await services.mysql.fetch_one(
        "SELECT * FROM users WHERE id = :user_id",
        {
            "user_id": user_id,
        },
    )

    if res_db is None:
        return None

    return from_db_mapping(res_db)


async def update_db(user: User) -> None:
    await services.mysql.execute(
        "UPDATE users SET username = :username, username_safe = :username_safe,"
        "password_md5 = :password_md5, email = :email, ban_datetime = :ban_datetime,"
        "register_datetime = :register_datetime, latest_activity = :latest_activity,"
        "donor_expire = :donor_expire, silence_end = :silence_end,"
        "silence_reason = :silence_reason, privileges = :privileges,"
        "notes = :notes, country = :country, forzen = :forzen,"
        "freezedate = :freezedate WHERE id = :id",
        into_db_dict(user),
    )


async def insert(user: User) -> int:
    return await services.mysql.execute(
        "INSERT INTO users (username, username_safe, password_md5, email,"
        "ban_datetime, register_datetime, latest_activity, donor_expire,"
        "silence_end, silence_reason, privileges, notes, country, forzen,"
        "freezedate) VALUES (:username, :username_safe, :password_md5,"
        ":email, :ban_datetime, :register_datetime, :latest_activity,"
        ":donor_expire, :silence_end, :silence_reason, :privileges, :notes,"
        ":country, :forzen, :freezedate)",
        into_db_dict(user, include_id=False),
    )
