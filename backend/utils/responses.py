"""
Custom response classes for FastAPI with optimized JSON serialization.

Uses orjson for ~10x faster JSON serialization compared to standard json module.
Includes custom handlers for MongoDB/BSON-specific types.

Also provides utilities for Pydantic v2 model serialization for MongoDB.
"""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Union
from fastapi.responses import Response
from pydantic import BaseModel

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

try:
    import orjson
    ORJSON_AVAILABLE = True
except ImportError:
    ORJSON_AVAILABLE = False


def orjson_default(obj: Any) -> Any:
    """
    Custom default handler for orjson serialization.

    Handles all BSON/MongoDB types that orjson doesn't natively serialize:
    - datetime -> ISO 8601 string
    - date -> ISO 8601 string
    - ObjectId -> string
    - Decimal128 -> string (preserves precision for financial data)
    - Decimal -> string (Python's decimal.Decimal)
    - Binary -> base64 string
    - Regex -> pattern string
    - Code -> string
    - DBRef -> dict with $ref, $id, $db
    - Timestamp -> dict with time, inc
    - Int64 -> int
    - MinKey/MaxKey -> special marker strings
    - set -> list
    - bytes -> decoded string
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
        import base64
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
    if isinstance(obj, set):
        return list(obj)
    if isinstance(obj, frozenset):
        return list(obj)

    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


class ORJSONResponse(Response):
    """
    FastAPI response class using orjson for high-performance JSON serialization.

    Benefits:
    - ~10x faster than standard json.dumps
    - Native datetime/date serialization via custom default handler
    - Handles MongoDB ObjectId automatically
    - UTF-8 output with proper encoding

    Usage:
        from utils.responses import ORJSONResponse

        app = FastAPI(default_response_class=ORJSONResponse)

        # Or per-route:
        @app.get("/data", response_class=ORJSONResponse)
        async def get_data():
            return {"created_at": datetime.now(), ...}
    """
    media_type = "application/json"

    def render(self, content: Any) -> bytes:
        if content is None:
            return b"null"

        if ORJSON_AVAILABLE:
            return orjson.dumps(
                content,
                default=orjson_default,
                option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SERIALIZE_NUMPY
            )
        else:
            # Fallback to standard json if orjson not available
            import json
            return json.dumps(
                content,
                default=str,  # Simple fallback for non-serializable types
                ensure_ascii=False
            ).encode('utf-8')


# =============================================================================
# PYDANTIC V2 MODEL SERIALIZATION FOR MONGODB
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

    In Pydantic v2, model_dump() keeps Python objects as-is by default.
    This function uses mode='json' to ensure all enums, dates, and other
    types are properly serialized to JSON-compatible types.

    Args:
        model: Pydantic model instance
        exclude_unset: If True, exclude fields that were not explicitly set
        exclude_none: If True, exclude fields with None values
        exclude: Set of field names to exclude

    Returns:
        Dict ready for MongoDB insertion with all types serialized

    Usage:
        from utils.responses import model_to_dict

        # Instead of:
        doc = model.model_dump(mode='json')

        # Use:
        doc = model_to_dict(model)

        # With options:
        doc = model_to_dict(model, exclude_unset=True)
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

    Handles nested models and ensures all values are serializable.

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
                result[key] = value.isoformat() if hasattr(value, 'isoformat') else str(value)
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
