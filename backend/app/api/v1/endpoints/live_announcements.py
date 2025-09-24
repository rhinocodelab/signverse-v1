from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from app.db.database import get_db
from app.schemas.live_announcement import (
    LiveAnnouncementRequest,
    LiveAnnouncementResponse,
    LiveAnnouncementItem,
    AnnouncementStatus
)
from app.services.live_announcement_service import get_live_announcement_service
from app.core.socketio import sio

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/generate", response_model=LiveAnnouncementResponse)
async def generate_live_announcement(
    request: LiveAnnouncementRequest,
    db: AsyncSession = Depends(get_db)
) -> LiveAnnouncementResponse:
    """Generate a live ISL announcement"""
    try:
        # Get live announcement service
        service = get_live_announcement_service(db, sio)
        
        # Add announcement to queue
        announcement_id = await service.add_announcement(request)
        
        # Get the announcement details
        announcement = await service.get_announcement(announcement_id)
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create announcement"
            )
        
        return LiveAnnouncementResponse(
            announcement_id=announcement_id,
            status=announcement.status,
            message=announcement.message,
            received_at=announcement.received_at
        )
        
    except Exception as e:
        logger.error(f"Error generating live announcement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate live announcement: {str(e)}"
        )

@router.get("/list", response_model=List[LiveAnnouncementItem])
async def get_live_announcements(
    db: AsyncSession = Depends(get_db)
) -> List[LiveAnnouncementItem]:
    """Get all live announcements"""
    try:
        service = get_live_announcement_service(db, sio)
        announcements = await service.get_announcements()
        
        # Sort by received_at descending (newest first)
        announcements.sort(key=lambda x: x.received_at, reverse=True)
        
        return announcements
        
    except Exception as e:
        logger.error(f"Error getting live announcements: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get live announcements: {str(e)}"
        )

@router.get("/{announcement_id}", response_model=LiveAnnouncementItem)
async def get_live_announcement(
    announcement_id: str,
    db: AsyncSession = Depends(get_db)
) -> LiveAnnouncementItem:
    """Get a specific live announcement"""
    try:
        service = get_live_announcement_service(db, sio)
        announcement = await service.get_announcement(announcement_id)
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        return announcement
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting live announcement {announcement_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get live announcement: {str(e)}"
        )

@router.get("/status/{announcement_id}")
async def get_announcement_status(
    announcement_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get the status of a specific announcement"""
    try:
        service = get_live_announcement_service(db, sio)
        announcement = await service.get_announcement(announcement_id)
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        return {
            "announcement_id": announcement_id,
            "status": announcement.status,
            "message": announcement.message,
            "progress_percentage": announcement.progress_percentage,
            "video_url": announcement.video_url,
            "error_message": announcement.error_message,
            "updated_at": announcement.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting announcement status {announcement_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get announcement status: {str(e)}"
        )

@router.delete("/clear")
async def clear_live_announcements(
    db: AsyncSession = Depends(get_db)
):
    """Clear all live announcements"""
    try:
        service = get_live_announcement_service(db, sio)
        
        # Clear all announcements from database
        await service.clear_all_announcements()
        
        # Clear the processing queue
        while not service.processing_queue.empty():
            try:
                service.processing_queue.get_nowait()
            except:
                break
        
        logger.info("All live announcements cleared")
        
        return {
            "success": True,
            "message": "All live announcements cleared successfully"
        }
        
    except Exception as e:
        logger.error(f"Error clearing live announcements: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear live announcements: {str(e)}"
        )