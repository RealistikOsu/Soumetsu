from __future__ import annotations

import struct
from typing import Union

from soumetsu.packets.constants import PacketID

ByteLike = Union[bytes, bytearray]


class PacketReader:
    __slots__ = (
        "_buf",
        "_pos",
    )

    @property
    def empty(self) -> bool:
        return self._pos >= len(self._buf)

    def __init__(self, buf: ByteLike) -> None:
        self._buf = buf
        self._pos = 0

    def read_i8(self) -> int:
        value = self._buf[self._pos]
        self._pos += 1
        return value

    def read_u8(self) -> int:
        value = self._buf[self._pos]
        self._pos += 1
        return value

    def read_i16(self) -> int:
        value = struct.unpack("<h", self._buf[self._pos : self._pos + 2])[0]
        self._pos += 2
        return value

    def read_u16(self) -> int:
        value = struct.unpack("<H", self._buf[self._pos : self._pos + 2])[0]
        self._pos += 2
        return value

    def read_i32(self) -> int:
        value = struct.unpack("<i", self._buf[self._pos : self._pos + 4])[0]
        self._pos += 4
        return value

    def read_u32(self) -> int:
        value = struct.unpack("<I", self._buf[self._pos : self._pos + 4])[0]
        self._pos += 4
        return value

    def read_i64(self) -> int:
        value = struct.unpack("<q", self._buf[self._pos : self._pos + 8])[0]
        self._pos += 8
        return value

    def read_u64(self) -> int:
        value = struct.unpack("<Q", self._buf[self._pos : self._pos + 8])[0]
        self._pos += 8
        return value

    def read_f32(self) -> float:
        value = struct.unpack("<f", self._buf[self._pos : self._pos + 4])[0]
        self._pos += 4
        return value

    def read_uleb128(self) -> int:
        value = 0
        shift = 0
        while True:
            byte = self._buf[self._pos]
            self._pos += 1
            value |= (byte & 0x7F) << shift
            if byte < 0x80:
                return value
            shift += 7

    def read_str(self) -> str:
        if self.read_i8() != 0xB:
            return ""
        length = self.read_uleb128()
        string = self._buf[self._pos : self._pos + length].decode()
        self._pos += length
        return string

    def skip(self, length: int) -> None:
        self._pos += length

    def read_header(self) -> tuple[PacketID, int]:
        """Reads the osu packet header.

        Note:
            You are responsible for incrementing the buffer if you do not
            read the rest of the packet.
        """

        packet_id = PacketID(self.read_u16())
        self.skip(1)
        packet_length = self.read_u32()
        return packet_id, packet_length

    def remove_excess(self, packet_size: int) -> bytes:
        """Removes the excess packet data from the buffer and returns it."""

        excess = self._buf[self._pos + packet_size :]
        self._buf = self._buf[: self._pos + packet_size]
        return excess

    def __iter__(self) -> PacketReader:
        return self

    def __next__(self) -> tuple[PacketID, int]:
        if self.empty:
            raise StopIteration
        return self.read_header()
