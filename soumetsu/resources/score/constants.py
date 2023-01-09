from __future__ import annotations

from enum import IntEnum
from enum import IntFlag
from textwrap import wrap


class Mods(IntFlag):
    NOMOD = 0
    NOFAIL = 1 << 0
    EASY = 1 << 1
    TOUCHSCREEN = 1 << 2
    HIDDEN = 1 << 3
    HARDROCK = 1 << 4
    SUDDENDEATH = 1 << 5
    DOUBLETIME = 1 << 6
    RELAX = 1 << 7
    HALFTIME = 1 << 8
    NIGHTCORE = 1 << 9
    FLASHLIGHT = 1 << 10
    AUTOPLAY = 1 << 11
    SPUNOUT = 1 << 12
    AUTOPILOT = 1 << 13
    PERFECT = 1 << 14
    KEY4 = 1 << 15
    KEY5 = 1 << 16
    KEY6 = 1 << 17
    KEY7 = 1 << 18
    KEY8 = 1 << 19
    FADEIN = 1 << 20
    RANDOM = 1 << 21
    CINEMA = 1 << 22
    TARGET = 1 << 23
    KEY9 = 1 << 24
    KEYCOOP = 1 << 25
    KEY1 = 1 << 26
    KEY3 = 1 << 27
    KEY2 = 1 << 28
    SCOREV2 = 1 << 29
    MIRROR = 1 << 30

    SPEED_MODS = DOUBLETIME | NIGHTCORE | HALFTIME
    GAME_CHANGING = RELAX | AUTOPILOT

    UNRANKED = SCOREV2 | AUTOPLAY | TARGET

    def __str__(self) -> str:
        if not self:
            return "NM"

        res = ""

        for mod in Mods:
            if self & mod:
                res += _MOD_STR_MAP[mod]

        if self & Mods.NIGHTCORE:
            res = res.replace("DT", "")
        if self & Mods.PERFECT:
            res = res.replace("SD", "")

        return res

    @staticmethod
    def from_str(mods: str) -> Mods:
        if mods == "NM" or not mods:
            return Mods.NOMOD

        res = Mods.NOMOD
        for mod_str in wrap(mods.upper(), 2):
            res |= _STR_MOD_MAP.get(mod_str, 0)

        return res


_MOD_STR_MAP = {
    Mods.NOFAIL: "NF",
    Mods.EASY: "EZ",
    Mods.TOUCHSCREEN: "TD",
    Mods.HIDDEN: "HD",
    Mods.HARDROCK: "HR",
    Mods.SUDDENDEATH: "SD",
    Mods.DOUBLETIME: "DT",
    Mods.RELAX: "RX",
    Mods.HALFTIME: "HT",
    Mods.NIGHTCORE: "NC",
    Mods.FLASHLIGHT: "FL",
    Mods.AUTOPLAY: "AU",
    Mods.SPUNOUT: "SO",
    Mods.AUTOPILOT: "AP",
    Mods.PERFECT: "PF",
    Mods.FADEIN: "FI",
    Mods.RANDOM: "RN",
    Mods.CINEMA: "CN",
    Mods.TARGET: "TP",
    Mods.SCOREV2: "V2",
    Mods.MIRROR: "MR",
    Mods.KEY1: "1K",
    Mods.KEY2: "2K",
    Mods.KEY3: "3K",
    Mods.KEY4: "4K",
    Mods.KEY5: "5K",
    Mods.KEY6: "6K",
    Mods.KEY7: "7K",
    Mods.KEY8: "8K",
    Mods.KEY9: "9K",
    Mods.KEYCOOP: "CO",
}

_STR_MOD_MAP = {
    "NF": Mods.NOFAIL,
    "EZ": Mods.EASY,
    "TD": Mods.TOUCHSCREEN,
    "HD": Mods.HIDDEN,
    "HR": Mods.HARDROCK,
    "SD": Mods.SUDDENDEATH,
    "DT": Mods.DOUBLETIME,
    "RX": Mods.RELAX,
    "HT": Mods.HALFTIME,
    "NC": Mods.NIGHTCORE,
    "FL": Mods.FLASHLIGHT,
    "AU": Mods.AUTOPLAY,
    "SO": Mods.SPUNOUT,
    "AP": Mods.AUTOPILOT,
    "PF": Mods.PERFECT,
    "FI": Mods.FADEIN,
    "RN": Mods.RANDOM,
    "CN": Mods.CINEMA,
    "TP": Mods.TARGET,
    "V2": Mods.SCOREV2,
    "MR": Mods.MIRROR,
    "1K": Mods.KEY1,
    "2K": Mods.KEY2,
    "3K": Mods.KEY3,
    "4K": Mods.KEY4,
    "5K": Mods.KEY5,
    "6K": Mods.KEY6,
    "7K": Mods.KEY7,
    "8K": Mods.KEY8,
    "9K": Mods.KEY9,
    "CO": Mods.KEYCOOP,
}

_MODE_STR = (
    "osu!std",
    "osu!taiko",
    "osu!catch",
    "osu!mania",
    "std!rx",
    "taiko!rx",
    "catch!rx",
    "std!ap",
)


class Mode(IntEnum):
    STD = 0
    TAIKO = 1
    CATCH = 2
    MANIA = 3

    STD_RX = 4
    TAIKO_RX = 5
    CATCH_RX = 6
    STD_AP = 7

    def __str__(self) -> str:
        return _MODE_STR[self.value]

    @property
    def is_relax(self) -> bool:
        return 3 < self.value < 7

    @property
    def is_autopilot(self) -> bool:
        return self == Mode.STD_AP
