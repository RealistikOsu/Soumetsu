from __future__ import annotations

from .general import router as general_router
from soumetsu.bancho.packets.router import PacketRouter

# Packet router imports

router = PacketRouter()
router.include_router(general_router)
