from __future__ import annotations

from soumetsu.config import config
from soumetsu.services import geolocation
from soumetsu.services import mysql


geolocation = geolocation.GeolocationDatabase()

mysql = mysql.MySQLPool(
    mysql.create_url(
        username=config.mysql_username,
        password=config.mysql_password,
        host=config.mysql_host,
        port=config.mysql_port,
        database=config.mysql_database,
    ),
)
