from fastapi import HTTPException, status
from typing import Dict, Any, Optional
import unicodedata


def normalize_church_id(church_id: str) -> str:
    """Normalize church_id to prevent hidden character mismatches."""
    if not church_id:
        return church_id
    normalized = unicodedata.normalize("NFKC", church_id)
    normalized = normalized.strip()
    return normalized


def get_session_church_id_from_user(user: Dict[str, Any]) -> str:
    """
    Centralized logic to resolve the effective church context (session_church_id).

    Rules:
    - For normal admin users:
        - user["church_id"] must be a non-empty string
        - session_church_id should default to that
    - For super_admin:
        - session_church_id MUST be provided in JWT
        - user["church_id"] is expected to be None
    - If no valid church context can be resolved → 403
    """
    if not isinstance(user, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user object in context",
        )

    role = user.get("role")
    raw_session = user.get("session_church_id")
    raw_church = user.get("church_id")

    # Super admin: MUST use session_church_id
    if role == "super_admin":
        if not raw_session or not isinstance(raw_session, str):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active church context. Please logout and login again selecting a church.",
            )
        return normalize_church_id(raw_session)

    # Non-super admin: must have a fixed church_id
    if raw_church and isinstance(raw_church, str):
        # If session_church_id exists, it MUST match church_id
        if raw_session and normalize_church_id(raw_session) != normalize_church_id(raw_church):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid church context in session.",
            )
        return normalize_church_id(raw_church)

    # Fallback – no valid context
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No valid church context for this user.",
    )
