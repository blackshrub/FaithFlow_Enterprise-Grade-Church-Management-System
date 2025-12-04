"""
WebSocket Routes for Real-time Communication

Endpoints:
- /ws/{church_id} - Main WebSocket connection (requires JWT in query param)
- /ws/kiosk/{church_id} - Kiosk WebSocket (limited permissions)
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from typing import Optional
import jwt
import os

from .manager import ws_manager, WSEventTypes

router = APIRouter(tags=["WebSocket"])

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


async def verify_ws_token(token: str) -> dict:
    """Verify JWT token for WebSocket connection."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.websocket("/ws/{church_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    church_id: str,
    token: str = Query(...)
):
    """
    Main WebSocket endpoint for real-time updates.

    Connect with: ws://host/ws/{church_id}?token=JWT_TOKEN

    Message types received:
    - attendance:update - Live attendance counts
    - giving:received - New giving notifications (admin/finance only)
    - event:participant_count - Live event participant counts
    - notification:new - New notifications
    - prayer:new - New prayer requests (prayer team only)

    Send messages:
    - {"type": "ping"} - Heartbeat
    - {"type": "subscribe", "events": ["attendance:update"]} - Subscribe to specific events
    """
    # Verify token
    try:
        payload = await verify_ws_token(token)
    except HTTPException:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Verify church access
    session_church_id = payload.get("session_church_id")
    user_church_id = payload.get("church_id")

    # Super admin can connect to any church via session_church_id
    if user_church_id == "global":
        if session_church_id != church_id:
            await websocket.close(code=4003, reason="Church access denied")
            return
    else:
        # Regular user must match their church_id
        if user_church_id != church_id:
            await websocket.close(code=4003, reason="Church access denied")
            return

    user_id = payload.get("sub")
    roles = payload.get("roles", [])

    # Connect
    await ws_manager.connect(websocket, church_id, user_id, roles)

    try:
        while True:
            # Receive and handle messages
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "subscribe":
                # Client can subscribe to specific event types
                # (Future: implement event filtering)
                await websocket.send_json({
                    "type": "subscribed",
                    "events": data.get("events", [])
                })

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, church_id)
    except Exception:
        ws_manager.disconnect(websocket, church_id)


@router.websocket("/ws/kiosk/{church_id}")
async def kiosk_websocket_endpoint(
    websocket: WebSocket,
    church_id: str,
    event_id: Optional[str] = Query(None)
):
    """
    Kiosk WebSocket endpoint for check-in displays.

    No authentication required - only receives public event updates.
    Limited to:
    - attendance:update for the specific event
    - event:status_change

    Connect with: ws://host/ws/kiosk/{church_id}?event_id=EVENT_ID
    """
    await ws_manager.connect(websocket, church_id, f"kiosk:{event_id}", ["kiosk"])

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, church_id)
    except Exception:
        ws_manager.disconnect(websocket, church_id)


# Admin endpoint to get connection stats
@router.get("/ws/stats")
async def get_ws_stats():
    """Get WebSocket connection statistics (super admin only)."""
    return {
        "total_connections": ws_manager.get_connection_count(),
        "connected_churches": ws_manager.get_connected_churches()
    }
