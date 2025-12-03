"""
Unified JSON Serialization Module using msgspec

Provides high-performance JSON serialization with automatic handling of:
- MongoDB/BSON types (ObjectId, Decimal128, Binary, etc.)
- Python types (datetime, date, Decimal, Enum, set, etc.)
- Pydantic models
- Redis cache serialization

Performance:
- msgspec is ~10-20% faster than orjson for encoding
- msgspec is ~2x faster than orjson for decoding
- Both are ~10x faster than stdlib json

Usage:
    from utils.serialization import json_dumps, json_loads, JSONEncoder

    # Basic usage
    data = json_dumps({"created_at": datetime.now(), "_id": ObjectId()})
    parsed = json_loads(data)

    # For FastAPI responses
    from utils.serialization import MSGSpecResponse
    app = FastAPI(default_response_class=MSGSpecResponse)
"""

import base64
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Union
from dataclasses import asdict, is_dataclass

# BSON types from pymongo
from bson import ObjectId
from bson.decimal128 import Decimal128
from bson.binary import Binary
from bson.regex import Regex
from bson.code import Code
from bson.dbref import DBRef
from bson.timestamp import Timestamp
from bson.int64 import Int64
from bson.min_key import MinKey
from bson.max_key import MaxKey

# Pydantic
from pydantic import BaseModel

# Try to import msgspec (primary) with orjson fallback
try:
    import msgspec
    MSGSPEC_AVAILABLE = True
except ImportError:
    MSGSPEC_AVAILABLE = False

try:
    import orjson
    ORJSON_AVAILABLE = True
except ImportError:
    ORJSON_AVAILABLE = False


def _encode_hook(obj: Any) -> Any:
    """
    Custom encoder hook for msgspec.

    Handles all BSON/MongoDB and Python types that msgspec doesn't natively serialize.
    """
    # Date/time types
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()

    # MongoDB ObjectId
    if isinstance(obj, ObjectId):
        return str(obj)

    # Decimal types (important for financial/accounting data)
    if isinstance(obj, Decimal128):
        return str(obj)
    if isinstance(obj, Decimal):
        return str(obj)

    # Binary data
    if isinstance(obj, Binary):
        return base64.b64encode(obj).decode('ascii')
    if isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')

    # Regex
    if isinstance(obj, Regex):
        return obj.pattern

    # Code (JavaScript)
    if isinstance(obj, Code):
        return str(obj)

    # Database reference
    if isinstance(obj, DBRef):
        result = {"$ref": obj.collection, "$id": str(obj.id)}
        if obj.database:
            result["$db"] = obj.database
        return result

    # Timestamp (MongoDB internal)
    if isinstance(obj, Timestamp):
        return {"time": obj.time, "inc": obj.inc}

    # Int64 (large integers)
    if isinstance(obj, Int64):
        return int(obj)

    # Min/Max keys (comparison markers)
    if isinstance(obj, MinKey):
        return {"$minKey": 1}
    if isinstance(obj, MaxKey):
        return {"$maxKey": 1}

    # Python collections
    if isinstance(obj, (set, frozenset)):
        return list(obj)

    # Enums
    if isinstance(obj, Enum):
        return obj.value

    # Pydantic models
    if isinstance(obj, BaseModel):
        return obj.model_dump(mode='json')

    # Dataclasses
    if is_dataclass(obj) and not isinstance(obj, type):
        return asdict(obj)

    # Last resort: try string conversion
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def _orjson_default(obj: Any) -> Any:
    """Fallback encoder for orjson (same logic as msgspec hook)."""
    return _encode_hook(obj)


# Create msgspec encoder/decoder instances (reusable for better performance)
if MSGSPEC_AVAILABLE:
    _encoder = msgspec.json.Encoder(enc_hook=_encode_hook)
    _decoder = msgspec.json.Decoder()


def json_dumps(obj: Any) -> bytes:
    """
    Serialize object to JSON bytes.

    Uses msgspec if available, falls back to orjson, then stdlib json.

    Args:
        obj: Object to serialize

    Returns:
        bytes: JSON-encoded bytes

    Examples:
        >>> json_dumps({"name": "test", "created_at": datetime.now()})
        b'{"name":"test","created_at":"2025-01-15T10:30:00"}'
    """
    if MSGSPEC_AVAILABLE:
        return _encoder.encode(obj)
    elif ORJSON_AVAILABLE:
        return orjson.dumps(
            obj,
            default=_orjson_default,
            option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SERIALIZE_NUMPY
        )
    else:
        import json
        return json.dumps(obj, default=str, ensure_ascii=False).encode('utf-8')


def json_dumps_str(obj: Any) -> str:
    """
    Serialize object to JSON string.

    Convenience wrapper that returns str instead of bytes.

    Args:
        obj: Object to serialize

    Returns:
        str: JSON-encoded string
    """
    return json_dumps(obj).decode('utf-8')


def json_loads(data: Union[bytes, str, memoryview]) -> Any:
    """
    Deserialize JSON data to Python object.

    Uses msgspec if available, falls back to orjson, then stdlib json.

    Args:
        data: JSON bytes or string

    Returns:
        Deserialized Python object

    Examples:
        >>> json_loads(b'{"name": "test"}')
        {'name': 'test'}
    """
    if MSGSPEC_AVAILABLE:
        return _decoder.decode(data)
    elif ORJSON_AVAILABLE:
        return orjson.loads(data)
    else:
        import json
        if isinstance(data, bytes):
            data = data.decode('utf-8')
        return json.loads(data)


# =============================================================================
# FASTAPI RESPONSE CLASS
# =============================================================================

from fastapi.responses import Response


class MSGSpecResponse(Response):
    """
    FastAPI response class using msgspec for high-performance JSON serialization.

    Benefits over ORJSONResponse:
    - ~10-20% faster encoding
    - ~2x faster decoding (for request parsing)
    - Lower memory usage
    - Handles all BSON/MongoDB types automatically

    Usage:
        from utils.serialization import MSGSpecResponse

        app = FastAPI(default_response_class=MSGSpecResponse)

        # Or per-route:
        @app.get("/data", response_class=MSGSpecResponse)
        async def get_data():
            return {"created_at": datetime.now(), ...}
    """
    media_type = "application/json"

    def render(self, content: Any) -> bytes:
        if content is None:
            return b"null"
        return json_dumps(content)


# =============================================================================
# REDIS SERIALIZATION HELPERS
# =============================================================================

def redis_encode(value: Any) -> str:
    """
    Encode a value for Redis storage.

    Wraps the value with type information for proper deserialization.

    Args:
        value: Value to encode

    Returns:
        str: JSON string for Redis storage
    """
    if isinstance(value, (str, int, float, bool)):
        return json_dumps_str({"_t": "p", "v": value})
    elif isinstance(value, datetime):
        return json_dumps_str({"_t": "dt", "v": value.isoformat()})
    elif isinstance(value, date):
        return json_dumps_str({"_t": "d", "v": value.isoformat()})
    else:
        return json_dumps_str({"_t": "j", "v": value})


def redis_decode(data: str) -> Any:
    """
    Decode a value from Redis storage.

    Handles type-wrapped values from redis_encode().

    Args:
        data: JSON string from Redis

    Returns:
        Decoded Python value
    """
    try:
        parsed = json_loads(data)
        if isinstance(parsed, dict) and "_t" in parsed:
            t = parsed["_t"]
            v = parsed["v"]
            if t == "p":  # primitive
                return v
            elif t == "dt":  # datetime
                return datetime.fromisoformat(v)
            elif t == "d":  # date
                return date.fromisoformat(v)
            else:  # json
                return v
        return parsed
    except Exception:
        return data


# =============================================================================
# PYDANTIC MODEL HELPERS (kept for compatibility)
# =============================================================================

def model_to_dict(
    model: BaseModel,
    *,
    exclude_unset: bool = False,
    exclude_none: bool = False,
    exclude: set = None,
) -> Dict[str, Any]:
    """
    Serialize a Pydantic v2 model to a dict suitable for MongoDB insertion.

    Args:
        model: Pydantic model instance
        exclude_unset: If True, exclude fields that were not explicitly set
        exclude_none: If True, exclude fields with None values
        exclude: Set of field names to exclude

    Returns:
        Dict ready for MongoDB insertion with all types serialized
    """
    return model.model_dump(
        mode='json',
        exclude_unset=exclude_unset,
        exclude_none=exclude_none,
        exclude=exclude,
    )


def to_mongo_dict(obj: Union[BaseModel, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Convert a Pydantic model or dict to MongoDB-safe dict.

    Args:
        obj: Pydantic model or dict

    Returns:
        Dict safe for MongoDB insertion
    """
    if isinstance(obj, BaseModel):
        return obj.model_dump(mode='json')
    elif isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            if isinstance(value, BaseModel):
                result[key] = value.model_dump(mode='json')
            elif isinstance(value, Enum):
                result[key] = value.value
            elif isinstance(value, (datetime, date)):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = to_mongo_dict(value)
            elif isinstance(value, list):
                result[key] = [
                    to_mongo_dict(item) if isinstance(item, (BaseModel, dict)) else
                    item.value if isinstance(item, Enum) else
                    item
                    for item in value
                ]
            else:
                result[key] = value
        return result
    return obj


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Core functions
    'json_dumps',
    'json_dumps_str',
    'json_loads',
    # FastAPI
    'MSGSpecResponse',
    # Redis helpers
    'redis_encode',
    'redis_decode',
    # Pydantic helpers
    'model_to_dict',
    'to_mongo_dict',
    # Flags
    'MSGSPEC_AVAILABLE',
    'ORJSON_AVAILABLE',
]
