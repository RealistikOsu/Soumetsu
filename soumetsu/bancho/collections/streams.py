from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable
from typing import Optional

from soumetsu.bancho.session import Session


class Stream:
    __slots__ = (
        "name",
        "_members",
    )

    def __init__(self, name: str) -> None:
        self.name = name
        self._members = dict[str, Session]()

    def __contains__(self, token: Session) -> bool:
        return token in self._members.values()

    def __iter__(self) -> Iterable[Session]:
        return iter(self._members.values())

    def __len__(self) -> int:
        return len(self._members)

    def add(self, session: Session) -> None:
        self._members[session.token] = session

    def remove(self, token: str) -> bool:
        if token in self._members:
            del self._members[token]
            return True

        return False

    def broadcast(self, data: bytes) -> None:
        for session in self._members.values():
            session.send(data)


class StreamManager:
    def __init__(self) -> None:
        self._streams = dict[str, Stream]()

    def __getitem__(self, name: str) -> Stream:
        return self._streams[name]

    def add(self, stream: Stream) -> None:
        self._streams[stream.name] = stream

    def remove(self, name: str) -> bool:
        if name in self._streams:
            del self._streams[name]
            return True

        return False

    def get(self, name: str) -> Optional[Stream]:
        return self._streams.get(name)

    def create(self, name: str) -> Stream:
        stream = Stream(name)
        self.add(stream)
        return stream
