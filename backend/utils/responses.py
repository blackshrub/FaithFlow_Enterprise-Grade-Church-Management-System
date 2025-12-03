"""
Custom response classes for FastAPI with optimized JSON serialization.

This module provides backward compatibility with the previous ORJSONResponse.
All serialization is now handled by utils/serialization.py using msgspec.

For new code, import directly from serialization:
    from utils.serialization import MSGSpecResponse, json_dumps, json_loads

Legacy imports still work:
    from utils.responses import ORJSONResponse  # Now uses msgspec internally
"""

# Re-export everything from serialization module for backward compatibility
from utils.serialization import (
    # Core functions
    json_dumps,
    json_dumps_str,
    json_loads,
    # Response classes
    MSGSpecResponse,
    # Helpers
    model_to_dict,
    to_mongo_dict,
    redis_encode,
    redis_decode,
    # Flags
    MSGSPEC_AVAILABLE,
    ORJSON_AVAILABLE,
)

# Backward compatibility: ORJSONResponse is now MSGSpecResponse
# All existing code using ORJSONResponse will automatically use msgspec
ORJSONResponse = MSGSpecResponse

__all__ = [
    # Response classes
    'ORJSONResponse',      # Legacy name (now uses msgspec)
    'MSGSpecResponse',     # New name
    # Core functions
    'json_dumps',
    'json_dumps_str',
    'json_loads',
    # Helpers
    'model_to_dict',
    'to_mongo_dict',
    'redis_encode',
    'redis_decode',
    # Flags
    'MSGSPEC_AVAILABLE',
    'ORJSON_AVAILABLE',
]
