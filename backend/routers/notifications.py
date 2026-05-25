import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

_connections: set[WebSocket] = set()


@router.websocket("/ws/notifications")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _connections.add(ws)
    try:
        while True:
            # Keep connection alive; client sends pings if needed
            await ws.receive_text()
    except WebSocketDisconnect:
        _connections.discard(ws)


async def notify_all(payload: dict):
    message = json.dumps(payload)
    dead: set[WebSocket] = set()
    for ws in _connections:
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    _connections.difference_update(dead)
