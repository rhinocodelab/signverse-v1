import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import socketio
import logging

from app.schemas.live_announcement import (
    LiveAnnouncementRequest,
    LiveAnnouncementItem,
    AnnouncementStatus,
    LiveAnnouncementUpdate
)
from app.services.train_announcement_service import get_train_announcement_service
from app.schemas.train_announcement import TrainAnnouncementRequest
from app.models.live_announcement import LiveAnnouncement as LiveAnnouncementModel

logger = logging.getLogger(__name__)

class LiveAnnouncementService:
    def __init__(self, db: AsyncSession, sio: socketio.AsyncServer):
        self.db = db
        self.sio = sio
        self.processing_queue: asyncio.Queue = asyncio.Queue()
        self.is_processing = False

    async def add_announcement(self, request: LiveAnnouncementRequest) -> str:
        """Add a new live announcement to the queue (replaces any existing announcement)"""
        announcement_id = str(uuid.uuid4())
        
        # Clear any existing announcements (only one at a time)
        await self._clear_existing_announcements()
        
        # Clear the processing queue
        while not self.processing_queue.empty():
            try:
                self.processing_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        
        # Create database record
        db_announcement = LiveAnnouncementModel(
            announcement_id=announcement_id,
            train_number=request.train_number,
            train_name=request.train_name,
            from_station=request.from_station,
            to_station=request.to_station,
            platform_number=request.platform_number,
            announcement_category=request.announcement_category,
            ai_avatar_model=request.ai_avatar_model,
            status=AnnouncementStatus.RECEIVED.value,
            message="Announcement received and queued for processing"
        )
        
        # Save to database
        self.db.add(db_announcement)
        await self.db.commit()
        await self.db.refresh(db_announcement)
        
        # Add to processing queue
        await self.processing_queue.put(announcement_id)
        
        # Emit real-time update
        await self.sio.emit('announcement_received', {
            'announcement_id': announcement_id,
            'status': AnnouncementStatus.RECEIVED.value,
            'message': "Announcement received and queued for processing",
            'received_at': db_announcement.received_at.isoformat()
        })
        
        # Start processing if not already running
        if not self.is_processing:
            asyncio.create_task(self._process_queue())
        
        logger.info(f"Live announcement {announcement_id} added to queue")
        return announcement_id

    async def _clear_existing_announcements(self):
        """Clear all existing announcements from database"""
        try:
            # Mark all existing announcements as inactive
            await self.db.execute(
                delete(LiveAnnouncementModel).where(LiveAnnouncementModel.is_active == True)
            )
            await self.db.commit()
            logger.info("Cleared existing live announcements")
        except Exception as e:
            logger.error(f"Error clearing existing announcements: {str(e)}")
            await self.db.rollback()

    async def _process_queue(self):
        """Process the announcement queue"""
        self.is_processing = True
        
        try:
            while not self.processing_queue.empty():
                announcement_id = await self.processing_queue.get()
                await self._process_announcement(announcement_id)
        except Exception as e:
            logger.error(f"Error processing announcement queue: {str(e)}")
        finally:
            self.is_processing = False

    async def _process_announcement(self, announcement_id: str):
        """Process a single announcement"""
        # Get announcement from database
        result = await self.db.execute(
            select(LiveAnnouncementModel).where(LiveAnnouncementModel.announcement_id == announcement_id)
        )
        db_announcement = result.scalar_one_or_none()
        
        if not db_announcement:
            logger.warning(f"Announcement {announcement_id} not found in database")
            return
        
        try:
            # Update status to processing
            await self._update_status(
                announcement_id,
                AnnouncementStatus.PROCESSING,
                "Processing announcement...",
                10
            )
            
            # Create train announcement request
            train_request = TrainAnnouncementRequest(
                train_number=db_announcement.train_number,
                train_name=db_announcement.train_name,
                from_station_name=db_announcement.from_station,
                to_station_name=db_announcement.to_station,
                platform=db_announcement.platform_number,
                announcement_category=db_announcement.announcement_category,
                model=db_announcement.ai_avatar_model,
                user_id=1  # TODO: Get from auth context
            )
            
            # Update status to generating video
            await self._update_status(
                announcement_id,
                AnnouncementStatus.GENERATING_VIDEO,
                "Generating ISL video...",
                50
            )
            
            # Generate ISL announcement
            train_service = get_train_announcement_service(self.db)
            logger.info(f"Generating train announcement for {announcement_id} with request: {train_request.dict()}")
            
            try:
                response = await train_service.generate_train_announcement(train_request, save_to_general_announcements=False)
                logger.info(f"Train announcement response for {announcement_id}: success={response.success}, error={response.error}, preview_url={response.preview_url}")
                
                if response.success and response.preview_url:
                    # Update status to completed
                    await self._update_status(
                        announcement_id,
                        AnnouncementStatus.COMPLETED,
                        "ISL video generated successfully",
                        100,
                        video_url=response.preview_url
                    )
                    logger.info(f"Live announcement {announcement_id} completed successfully")
                else:
                    # Update status to error
                    error_msg = response.error or "Unknown error during ISL generation"
                    await self._update_status(
                        announcement_id,
                        AnnouncementStatus.ERROR,
                        "Failed to generate ISL video",
                        error_message=error_msg
                    )
                    logger.error(f"Live announcement {announcement_id} failed: {error_msg}")
            except Exception as e:
                logger.error(f"Exception during train announcement generation for {announcement_id}: {str(e)}")
                await self._update_status(
                    announcement_id,
                    AnnouncementStatus.ERROR,
                    "Exception during ISL generation",
                    error_message=str(e)
                )
                
        except Exception as e:
            # Update status to error
            await self._update_status(
                announcement_id,
                AnnouncementStatus.ERROR,
                "Error processing announcement",
                error_message=str(e)
            )
            logger.error(f"Error processing live announcement {announcement_id}: {str(e)}")

    async def _update_status(
        self,
        announcement_id: str,
        status: AnnouncementStatus,
        message: str,
        progress_percentage: Optional[int] = None,
        video_url: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Update announcement status and emit real-time update"""
        # Get announcement from database
        result = await self.db.execute(
            select(LiveAnnouncementModel).where(LiveAnnouncementModel.announcement_id == announcement_id)
        )
        db_announcement = result.scalar_one_or_none()
        
        if not db_announcement:
            logger.warning(f"Announcement {announcement_id} not found for status update")
            return
        
        # Update database record
        db_announcement.status = status.value
        db_announcement.message = message
        
        if progress_percentage is not None:
            db_announcement.progress_percentage = progress_percentage
        if video_url is not None:
            db_announcement.video_url = video_url
        if error_message is not None:
            db_announcement.error_message = error_message
        
        await self.db.commit()
        await self.db.refresh(db_announcement)
        
        # Emit real-time update
        update = LiveAnnouncementUpdate(
            announcement_id=announcement_id,
            status=status,
            message=message,
            progress_percentage=progress_percentage,
            video_url=video_url,
            error_message=error_message,
            updated_at=db_announcement.updated_at
        )
        
        # Convert datetime to ISO string for JSON serialization
        update_data = update.dict()
        update_data['updated_at'] = update_data['updated_at'].isoformat()
        await self.sio.emit('announcement_update', update_data)

    async def get_announcements(self) -> List[LiveAnnouncementItem]:
        """Get all active announcements"""
        result = await self.db.execute(
            select(LiveAnnouncementModel).where(LiveAnnouncementModel.is_active == True)
        )
        db_announcements = result.scalars().all()
        
        return [
            LiveAnnouncementItem(
                announcement_id=ann.announcement_id,
                train_number=ann.train_number,
                train_name=ann.train_name,
                from_station=ann.from_station,
                to_station=ann.to_station,
                platform_number=ann.platform_number,
                announcement_category=ann.announcement_category,
                ai_avatar_model=ann.ai_avatar_model,
                status=AnnouncementStatus(ann.status),
                message=ann.message,
                progress_percentage=ann.progress_percentage,
                video_url=ann.video_url,
                error_message=ann.error_message,
                received_at=ann.received_at,
                updated_at=ann.updated_at
            )
            for ann in db_announcements
        ]

    async def get_announcement(self, announcement_id: str) -> Optional[LiveAnnouncementItem]:
        """Get a specific announcement"""
        result = await self.db.execute(
            select(LiveAnnouncementModel).where(
                LiveAnnouncementModel.announcement_id == announcement_id,
                LiveAnnouncementModel.is_active == True
            )
        )
        db_announcement = result.scalar_one_or_none()
        
        if not db_announcement:
            return None
        
        return LiveAnnouncementItem(
            announcement_id=db_announcement.announcement_id,
            train_number=db_announcement.train_number,
            train_name=db_announcement.train_name,
            from_station=db_announcement.from_station,
            to_station=db_announcement.to_station,
            platform_number=db_announcement.platform_number,
            announcement_category=db_announcement.announcement_category,
            ai_avatar_model=db_announcement.ai_avatar_model,
            status=AnnouncementStatus(db_announcement.status),
            message=db_announcement.message,
            progress_percentage=db_announcement.progress_percentage,
            video_url=db_announcement.video_url,
            error_message=db_announcement.error_message,
            received_at=db_announcement.received_at,
            updated_at=db_announcement.updated_at
        )

    async def clear_all_announcements(self):
        """Clear all live announcements"""
        try:
            await self.db.execute(
                delete(LiveAnnouncementModel).where(LiveAnnouncementModel.is_active == True)
            )
            await self.db.commit()
            logger.info("Cleared all live announcements")
        except Exception as e:
            logger.error(f"Error clearing live announcements: {str(e)}")
            await self.db.rollback()

# Global service instance
_live_announcement_service: Optional[LiveAnnouncementService] = None

def get_live_announcement_service(db: AsyncSession, sio: socketio.AsyncServer) -> LiveAnnouncementService:
    """Get or create live announcement service instance"""
    global _live_announcement_service
    if _live_announcement_service is None:
        _live_announcement_service = LiveAnnouncementService(db, sio)
    return _live_announcement_service