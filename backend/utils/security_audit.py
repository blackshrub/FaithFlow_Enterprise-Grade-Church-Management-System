"""
Security Audit Logging for FaithFlow

Logs security-relevant events for monitoring and compliance:
- Authentication attempts (success/failure)
- Authorization failures
- Rate limit hits
- Suspicious activity detection
- Admin actions

Logs are structured JSON for easy parsing by SIEM tools.
"""

import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from functools import wraps
from fastapi import Request
import hashlib
import os

# Configure security logger
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

# Create handler if not exists
if not security_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(message)s'))
    security_logger.addHandler(handler)
    security_logger.propagate = False


class SecurityEventType:
    """Security event types for categorization."""
    AUTH_SUCCESS = "auth.success"
    AUTH_FAILURE = "auth.failure"
    AUTH_LOGOUT = "auth.logout"
    AUTH_TOKEN_EXPIRED = "auth.token_expired"
    AUTH_TOKEN_INVALID = "auth.token_invalid"

    AUTHZ_DENIED = "authz.denied"
    AUTHZ_ROLE_INSUFFICIENT = "authz.role_insufficient"
    AUTHZ_TENANT_MISMATCH = "authz.tenant_mismatch"

    RATE_LIMIT_HIT = "ratelimit.hit"
    RATE_LIMIT_EXCEEDED = "ratelimit.exceeded"

    SUSPICIOUS_ACTIVITY = "suspicious.activity"
    SUSPICIOUS_PATTERN = "suspicious.pattern"
    BRUTE_FORCE_DETECTED = "suspicious.brute_force"

    ADMIN_ACTION = "admin.action"
    DATA_EXPORT = "admin.data_export"
    BULK_DELETE = "admin.bulk_delete"
    SETTINGS_CHANGE = "admin.settings_change"

    API_KEY_CREATED = "apikey.created"
    API_KEY_REVOKED = "apikey.revoked"
    API_KEY_USED = "apikey.used"


def _get_client_ip(request: Request) -> str:
    """Extract client IP, handling proxies."""
    # Check X-Forwarded-For header (set by reverse proxy)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Take first IP (original client)
        return forwarded.split(",")[0].strip()

    # Check X-Real-IP header
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip

    # Fallback to direct connection
    return request.client.host if request.client else "unknown"


def _anonymize_sensitive(data: Dict[str, Any]) -> Dict[str, Any]:
    """Anonymize sensitive fields in log data."""
    sensitive_fields = {"password", "token", "secret", "api_key", "otp", "pin"}
    result = {}

    for key, value in data.items():
        if any(s in key.lower() for s in sensitive_fields):
            if isinstance(value, str) and len(value) > 4:
                result[key] = value[:2] + "***" + value[-2:]
            else:
                result[key] = "***"
        elif isinstance(value, dict):
            result[key] = _anonymize_sensitive(value)
        else:
            result[key] = value

    return result


def log_security_event(
    event_type: str,
    request: Optional[Request] = None,
    user_id: Optional[str] = None,
    church_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    severity: str = "info"
) -> None:
    """
    Log a security event in structured JSON format.

    Args:
        event_type: Type of security event (use SecurityEventType constants)
        request: FastAPI request object for IP/headers
        user_id: ID of the user (if known)
        church_id: Church/tenant ID (if applicable)
        details: Additional event-specific details
        severity: Log severity (debug, info, warning, error, critical)
    """
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "severity": severity,
    }

    # Add request context
    if request:
        event["client_ip"] = _get_client_ip(request)
        event["user_agent"] = request.headers.get("user-agent", "unknown")[:200]
        event["method"] = request.method
        event["path"] = str(request.url.path)
        event["request_id"] = request.headers.get("x-request-id", "")

    # Add user context
    if user_id:
        event["user_id"] = user_id
    if church_id:
        event["church_id"] = church_id

    # Add details (anonymized)
    if details:
        event["details"] = _anonymize_sensitive(details)

    # Log as JSON
    log_method = getattr(security_logger, severity, security_logger.info)
    log_method(json.dumps(event))


def audit_auth_attempt(
    request: Request,
    success: bool,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    method: str = "password",
    failure_reason: Optional[str] = None
) -> None:
    """Log authentication attempt."""
    event_type = SecurityEventType.AUTH_SUCCESS if success else SecurityEventType.AUTH_FAILURE
    severity = "info" if success else "warning"

    details = {
        "auth_method": method,
        "email": email[:3] + "***" if email else None,
    }

    if not success and failure_reason:
        details["failure_reason"] = failure_reason

    log_security_event(
        event_type=event_type,
        request=request,
        user_id=user_id,
        details=details,
        severity=severity
    )


def audit_authorization_failure(
    request: Request,
    user_id: str,
    required_role: str,
    actual_role: str,
    resource: str
) -> None:
    """Log authorization failure."""
    log_security_event(
        event_type=SecurityEventType.AUTHZ_DENIED,
        request=request,
        user_id=user_id,
        details={
            "required_role": required_role,
            "actual_role": actual_role,
            "resource": resource
        },
        severity="warning"
    )


def audit_rate_limit(
    request: Request,
    limit: int,
    window: int,
    exceeded: bool = False
) -> None:
    """Log rate limit event."""
    event_type = SecurityEventType.RATE_LIMIT_EXCEEDED if exceeded else SecurityEventType.RATE_LIMIT_HIT
    severity = "warning" if exceeded else "info"

    log_security_event(
        event_type=event_type,
        request=request,
        details={
            "limit": limit,
            "window_seconds": window
        },
        severity=severity
    )


def audit_admin_action(
    request: Request,
    user_id: str,
    church_id: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None
) -> None:
    """Log admin action for audit trail."""
    log_security_event(
        event_type=SecurityEventType.ADMIN_ACTION,
        request=request,
        user_id=user_id,
        church_id=church_id,
        details={
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "changes": changes
        },
        severity="info"
    )


def audit_suspicious_activity(
    request: Request,
    reason: str,
    user_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """Log suspicious activity for security monitoring."""
    log_security_event(
        event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
        request=request,
        user_id=user_id,
        details={
            "reason": reason,
            **(details or {})
        },
        severity="warning"
    )


# Decorator for auditing admin actions
def audit_action(action: str, resource_type: str):
    """Decorator to automatically audit admin actions."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request and current_user from kwargs
            request = kwargs.get("request")
            current_user = kwargs.get("current_user")

            result = await func(*args, **kwargs)

            # Log the action if we have context
            if request and current_user:
                audit_admin_action(
                    request=request,
                    user_id=current_user.get("sub", "unknown"),
                    church_id=current_user.get("session_church_id", "unknown"),
                    action=action,
                    resource_type=resource_type,
                    resource_id=kwargs.get("id") or kwargs.get("member_id") or kwargs.get("event_id")
                )

            return result
        return wrapper
    return decorator


# Failed login tracking (for brute force detection)
_failed_attempts: Dict[str, list] = {}
BRUTE_FORCE_THRESHOLD = 5
BRUTE_FORCE_WINDOW = 300  # 5 minutes


def track_failed_login(request: Request, identifier: str) -> bool:
    """
    Track failed login attempts and detect brute force.

    Returns True if brute force is detected.
    """
    client_ip = _get_client_ip(request)
    key = f"{client_ip}:{identifier}"
    now = datetime.now(timezone.utc).timestamp()

    # Clean old attempts
    if key in _failed_attempts:
        _failed_attempts[key] = [
            ts for ts in _failed_attempts[key]
            if now - ts < BRUTE_FORCE_WINDOW
        ]
    else:
        _failed_attempts[key] = []

    # Add this attempt
    _failed_attempts[key].append(now)

    # Check threshold
    if len(_failed_attempts[key]) >= BRUTE_FORCE_THRESHOLD:
        log_security_event(
            event_type=SecurityEventType.BRUTE_FORCE_DETECTED,
            request=request,
            details={
                "identifier": identifier[:3] + "***" if identifier else None,
                "attempts": len(_failed_attempts[key]),
                "window_seconds": BRUTE_FORCE_WINDOW
            },
            severity="error"
        )
        return True

    return False


def clear_failed_attempts(request: Request, identifier: str) -> None:
    """Clear failed login attempts after successful login."""
    client_ip = _get_client_ip(request)
    key = f"{client_ip}:{identifier}"
    _failed_attempts.pop(key, None)
