import socketio
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True,
    async_mode='asgi'
)

@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    logger.info(f"Client {sid} connected")
    await sio.emit('connected', {'message': 'Connected to live announcements'}, room=sid)

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client {sid} disconnected")

@sio.event
async def join_live_announcements(sid, data=None):
    """Join live announcements room"""
    await sio.enter_room(sid, 'live_announcements')
    logger.info(f"Client {sid} joined live announcements room")
    await sio.emit('joined_room', {'room': 'live_announcements'}, room=sid)

@sio.event
async def leave_live_announcements(sid, data=None):
    """Leave live announcements room"""
    await sio.leave_room(sid, 'live_announcements')
    logger.info(f"Client {sid} left live announcements room")

# Helper functions for emitting events
async def emit_announcement_received(data: Dict[str, Any]):
    """Emit announcement received event to all clients in live_announcements room"""
    await sio.emit('announcement_received', data, room='live_announcements')

async def emit_announcement_update(data: Dict[str, Any]):
    """Emit announcement update event to all clients in live_announcements room"""
    await sio.emit('announcement_update', data, room='live_announcements')

async def emit_announcement_error(announcement_id: str, error_message: str):
    """Emit announcement error event to all clients in live_announcements room"""
    await sio.emit('announcement_error', {
        'announcement_id': announcement_id,
        'error_message': error_message
    }, room='live_announcements')