from __future__ import annotations

import struct

from soumetsu.packets.constants import PacketID


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
