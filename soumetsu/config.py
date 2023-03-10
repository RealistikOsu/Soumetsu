from __future__ import annotations

import os
from dataclasses import dataclass
from dataclasses import field
from json import dump
from json import load
from typing import Any
from typing import get_type_hints

from soumetsu import logger


@dataclass
class Config:
    http_host: str = "127.0.0.1"
    http_port: int = 8080
    log_level: str = "INFO"
    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_database: str = "rosu"
    mysql_username: str = "rosu"
    mysql_password: str = ""
    geoloc_db_dir: str = "/home/db/ip.mmdb"


def read_config_json() -> dict[str, Any]:
    with open("config.json") as f:
        return load(f)


def write_config(config: Config):
    with open("config.json", "w") as f:
        dump(config.__dict__, f, indent=4)


def load_json_config() -> Config:
    """Loads the config from the file, handling config updates.
    Note:
        Raises `SystemExit` on config update.
    """

    config_dict = {}

    if os.path.exists("config.json"):
        config_dict = read_config_json()

    # Compare config json attributes with config class attributes
    missing_keys = [key for key in Config.__annotations__ if key not in config_dict]

    # Remove extra fields
    for key in tuple(
        config_dict,
    ):  # Tuple cast is necessary to create a copy of the keys.
        if key not in Config.__annotations__:
            del config_dict[key]

    # Create config regardless, populating it with missing keys.
    config = Config(**config_dict)

    if missing_keys:
        logger.info(f"Your config has been updated with {len(missing_keys)} new keys.")
        logger.debug("Missing keys: " + ", ".join(missing_keys))
        write_config(config)
        raise SystemExit(0)

    return config


def load_env_config() -> Config:
    conf = Config()

    for key, cast in get_type_hints(conf).items():
        if (env_value := os.environ.get(key.upper())) is not None:
            setattr(conf, key, cast(env_value))

    return conf


def load_config() -> Config:
    if os.environ.get("USE_ENV_CONFIG") == "1":
        return load_env_config()
    return load_json_config()


config = load_config()
