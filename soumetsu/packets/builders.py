from __future__ import annotations

from soumetsu.packets.constants import PacketID
from soumetsu.packets.rw import PacketWriter


def _write_simple(packet_id: PacketID) -> bytes:
    """Writes a packet without any content."""
