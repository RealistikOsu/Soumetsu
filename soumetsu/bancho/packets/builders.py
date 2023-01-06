from __future__ import annotations

from soumetsu.bancho.packets import writer
from soumetsu.bancho.packets.constants import PacketID


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


def channel_info(
    name: str,
    description: str,
    member_count: int,
) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_CHANNEL_INFO,
        writer.write_str(name)
        + writer.write_str(description)
        + writer.write_i16(member_count),
    )


def user_presence(
    user_id: int,
    username: str,
    utc_offset: int,
    country_enum: int,
    bancho_privileges: int,
    longitude: float,
    latitude: float,
    rank: int,
) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_USER_PRESENCE,
        writer.write_i32(user_id)
        + writer.write_str(username)
        + writer.write_u8(utc_offset + 24)
        + writer.write_u8(country_enum)
        + writer.write_u8(bancho_privileges)
        + writer.write_f32(longitude)
        + writer.write_f32(latitude)
        + writer.write_i32(rank),
    )


def user_stats(
    user_id: int,
    action_id: int,
    action_text: str,
    beatmap_md5: str,
    beatmap_id: int,
    mods: int,
    mode: int,
    ranked_score: int,
    total_score: int,
    accuracy: float,
    play_count: int,
    rank: int,
    pp: int,
) -> bytes:
    return writer.prefix_header(
        PacketID.SRV_USER_STATS,
        writer.write_i32(user_id)
        + writer.write_u8(action_id)
        + writer.write_str(action_text)
        + writer.write_str(beatmap_md5)
        + writer.write_i32(mods)
        + writer.write_u8(mode)
        + writer.write_i32(beatmap_id)
        + writer.write_i64(ranked_score)
        + writer.write_f32(accuracy / 100)
        + writer.write_i32(play_count)
        + writer.write_i64(total_score)
        + writer.write_i32(rank)
        + writer.write_i16(pp),
    )
