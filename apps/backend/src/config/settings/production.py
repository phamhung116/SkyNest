from __future__ import annotations

import os

from .base import *  # noqa: F403,F401

DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = [
    host
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        ".vercel.app,.now.sh,localhost,127.0.0.1",
    ).split(",")
    if host
]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
