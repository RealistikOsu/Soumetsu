from __future__ import annotations

from soumetsu.packets import writer
from soumetsu.packets.constants import PacketID


def notification(text: str) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_NOTIFICATION,
        writer.write_str(text),
    )


def login_response(user_id: int) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_LOGIN_RESPONSE,
        writer.write_i32(user_id),
    )


def restrict_notify() -> bytes:
    return writer.prefix_header(PacketID.SRV_RESTRICTED_NOTIFY)


def protocol_version(version: int) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_PROTOCOL_VERSION,
        writer.write_i32(version),
    )


def silence_end(unix_ts: int) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_SILENCE_END,
        writer.write_u32(unix_ts),
    )


def user_silenced(user_id: int) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_USER_SILENCED,
        writer.write_i32(user_id),
    )


def bancho_privileges(privileges: int) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_PRIVILEGES,
        writer.write_u8(privileges),
    )


def friends_list(user_ids: list[int]) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_FRIENDS_LIST,
        writer.write_i32_array(user_ids),
    )


def channel_info_end() -> bytes:
    return writer.prefix_header(PacketID.SRV_CHANNEL_INFO_END)


def bancho_restart(time_till_restart: int) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_RESTART,
        writer.write_i32(time_till_restart),
    )


def logout(user_id: int) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_USER_LOGOUT,
        writer.write_i32(user_id) + writer.write_u8(0),
    )


def message_received(
    sender_name: str,
    sender_id: int,
    message_content: str,
    target_name: str,
) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_SEND_MESSAGE,
        writer.write_str(sender_name)
        + writer.write_str(message_content)
        + writer.write_str(target_name)
        + writer.write_i32(sender_id),
    )


def channel_join_notify(channel_name: str) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_CHANNEL_JOIN_SUCCESS,
        writer.write_str(channel_name),
    )
