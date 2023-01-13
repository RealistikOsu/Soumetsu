from __future__ import annotations

import struct
from typing import Optional

from soumetsu.bancho.packets.constants import PacketID


def write_u8(value: int) -> bytes:
    # Uh.
    return bytes([value])


write_i8 = write_u8


def write_i16(value: int) -> bytes:
    return struct.pack("<h", value)


def write_u16(value: int) -> bytes:
    return struct.pack("<H", value)


def write_i32(value: int) -> bytes:
    return struct.pack("<i", value)


def write_u32(value: int) -> bytes:
    return struct.pack("<I", value)


def write_i64(value: int) -> bytes:
    return struct.pack("<q", value)


def write_u64(value: int) -> bytes:
    return struct.pack("<Q", value)


def write_f32(value: float) -> bytes:
    return struct.pack("<f", value)


def write_uleb128(value: int) -> bytes:
    buffer = bytearray()
    while value >= 0x80:
        buffer.append((value & 0x7F) | 0x80)
        value >>= 7
    buffer.append(value)

    return bytes(buffer)


def write_str(value: str) -> bytes:
    # Exists byte.
    if not value:
        return write_u8(0)

    return bytes(
        bytearray(write_i8(0xB)) + write_uleb128(len(value)) + value.encode("utf-8"),
    )


def write_i32_array(array: list[int]) -> bytes:
    if not array:
        return write_u16(0)

    buffer = bytearray(write_u16(len(array)))
    for elem in array:
        buffer += write_i32(elem)

    return bytes(buffer)


def prefix_header(packet_id: PacketID, data: Optional[bytes] = None) -> bytes:
    if not data:
        return struct.pack(
            "<HxI",
            packet_id.value,
            0,
        )

    return (
        struct.pack(
            "<HxI",
            packet_id.value,
            len(data),
        )
        + data
    )
