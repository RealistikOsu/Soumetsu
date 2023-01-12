from __future__ import annotations

from soumetsu.bancho.packets.constants import PacketID
from soumetsu.bancho.packets.router import PacketContext
from soumetsu.bancho.packets.router import PacketRouter
from soumetsu.bancho.packets.types import *


router = PacketRouter()


@router.register(PacketID.OSU_HEARTBEAT)
async def heartbeat_packet(ctx: PacketContext) -> None:
    return
