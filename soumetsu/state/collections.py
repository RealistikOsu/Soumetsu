from __future__ import annotations

from soumetsu.bancho.collections.streams import StreamManager


streams = StreamManager()


def configure_streams() -> None:
    streams.create("global")
