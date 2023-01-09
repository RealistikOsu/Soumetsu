from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable
from typing import Callable
from typing import get_type_hints
from typing import Optional
from typing import Protocol
from typing import Union

from soumetsu.bancho.packets.constants import PacketID
from soumetsu.bancho.packets.reader import PacketReader
from soumetsu.bancho.packets.types import *
from soumetsu.bancho.session import Session

ReadableType = Union[
    float,
    str,
    u8,
    i8,
    u16,
    i16,
    u32,
    i32,
    u64,
    i64,
]

_READER_TYPE_MAP = {
    float: PacketReader.read_f32,
    str: PacketReader.read_str,
    u8: PacketReader.read_u8,
    i8: PacketReader.read_i8,
    u16: PacketReader.read_u16,
    i16: PacketReader.read_i16,
    u32: PacketReader.read_u32,
    i32: PacketReader.read_i32,
    u64: PacketReader.read_u64,
}


@dataclass
class PacketContext:
    session: Session
    reader: PacketReader


class PacketHandlerProtocol(Protocol):
    async def __call__(
        self, ctx: PacketContext, *args: ReadableType
    ) -> Optional[bytes]:
        ...


WrappedPacketHandler = Callable[
    [PacketContext],
    Awaitable[Optional[bytes]],
]


def _wrap_packet_handler(func: PacketHandlerProtocol) -> WrappedPacketHandler:
    async def new_packet_func(
        ctx: PacketContext,
    ) -> Optional[bytes]:
        # Read based on func signature
        args = []
        for arg_type in get_type_hints(func).values():
            if issubclass(arg_type, PacketContext):
                args.append(ctx)
            else:
                args.append(_READER_TYPE_MAP[arg_type](ctx.reader))

        return await func(*args)

    return new_packet_func


class PacketRouter:
    def __init__(self) -> None:
        self._routes = dict[PacketID, WrappedPacketHandler]()

    # Decorator
    def register(
        self,
        packet_id: PacketID,
    ) -> Callable[[PacketHandlerProtocol], WrappedPacketHandler]:
        def wrapper(func: PacketHandlerProtocol) -> WrappedPacketHandler:
            wrapped_func = _wrap_packet_handler(func)
            self._routes[packet_id] = wrapped_func

            return wrapped_func

        return wrapper

    # Non-decorator version
    def include_handler(
        self,
        packet_id: PacketID,
        handler: PacketHandlerProtocol,
    ) -> None:
        wrapped_func = _wrap_packet_handler(handler)
        self._routes[packet_id] = wrapped_func

    async def handle(
        self,
        session: Session,
        body: bytes,
    ) -> bytearray:
        res_buffer = bytearray()
        reader = PacketReader(body)

        ctx = PacketContext(
            session=session,
            reader=reader,
        )

        # TODO: Create reader instance per packet to avoid misreads.
        for packet_id, packet_len in reader:
            handler = self._routes.get(packet_id)
            if handler is not None:
                handler_res = await handler(ctx)
                if handler_res is not None:
                    res_buffer += handler_res
            else:
                reader.skip(packet_len)

        return res_buffer
