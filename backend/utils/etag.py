"""
E-Tag Utility for HTTP Caching

Generates E-Tag headers for API responses to enable 304 Not Modified responses.
This reduces bandwidth by allowing clients to cache responses and only fetch
when content has changed.
"""

import hashlib
import json
from typing import Any
from fastapi import Request, Response


def generate_etag(data: Any) -> str:
    """
    Generate an E-Tag hash from data.

    Args:
        data: Any JSON-serializable data

    Returns:
        E-Tag string (quoted as per RFC 7232)
    """
    if data is None:
        return '"empty"'

    # Convert to JSON string for consistent hashing
    json_str = json.dumps(data, sort_keys=True, default=str)

    # Generate MD5 hash (fast, sufficient for E-Tag)
    hash_value = hashlib.md5(json_str.encode()).hexdigest()[:16]

    return f'"{hash_value}"'


def check_etag_match(request: Request, etag: str) -> bool:
    """
    Check if client's If-None-Match header matches the current E-Tag.

    Args:
        request: FastAPI request object
        etag: Current E-Tag value

    Returns:
        True if E-Tag matches (304 should be returned)
    """
    if_none_match = request.headers.get("if-none-match")

    if not if_none_match:
        return False

    # Handle multiple E-Tags (comma-separated)
    client_etags = [e.strip() for e in if_none_match.split(",")]

    return etag in client_etags or "*" in client_etags


def add_etag_headers(response: Response, etag: str, max_age: int = 0) -> None:
    """
    Add E-Tag and Cache-Control headers to response.

    Args:
        response: FastAPI response object
        etag: E-Tag value to set
        max_age: Cache max-age in seconds (default 0 = must revalidate)
    """
    response.headers["ETag"] = etag

    if max_age > 0:
        response.headers["Cache-Control"] = f"private, max-age={max_age}, must-revalidate"
    else:
        response.headers["Cache-Control"] = "private, no-cache, must-revalidate"
