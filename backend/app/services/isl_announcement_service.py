import os
import json
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func, select
from typing import List, Optional, Dict, Any
from app.models.isl_announcement import ISLAnnouncement as ISLAnnouncementModel
from app.schemas.isl_announcement import (
    ISLAnnouncementCreate, 
    ISLAnnouncementUpdate, 
    ISLAnnouncementVideoUpdate,
    ISLAnnouncementSearch,
    ISLAnnouncementStatistics
)


class ISLAnnouncementService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.logger = logging.getLogger(__name__)

    async def create_announcement(self, announcement_data: ISLAnnouncementCreate) -> ISLAnnouncementModel:
        """Create a new ISL announcement record"""
        db_announcement = ISLAnnouncementModel(**announcement_data.dict())
        self.db.add(db_announcement)
        await self.db.commit()
        await self.db.refresh(db_announcement)
        return db_announcement

    async def get_announcement(self, announcement_id: int) -> Optional[ISLAnnouncementModel]:
        """Get announcement by ID"""
        result = await self.db.execute(
            select(ISLAnnouncementModel).where(ISLAnnouncementModel.id == announcement_id)
        )
        return result.scalar_one_or_none()

    async def get_announcements(self, skip: int = 0, limit: int = 100) -> List[ISLAnnouncementModel]:
        """Get all announcements with pagination"""
        result = await self.db.execute(
            select(ISLAnnouncementModel)
            .offset(skip)
            .limit(limit)
            .order_by(ISLAnnouncementModel.created_at.desc())
        )
        return result.scalars().all()

    async def search_announcements(self, search_params: ISLAnnouncementSearch) -> List[ISLAnnouncementModel]:
        """Search announcements with filters"""
        query = select(ISLAnnouncementModel)

        # Filter by category
        if search_params.category:
            query = query.where(ISLAnnouncementModel.category == search_params.category)

        # Filter by model
        if search_params.model:
            query = query.where(ISLAnnouncementModel.model == search_params.model)

        # Filter by video generation status
        if search_params.video_generation_status:
            query = query.where(ISLAnnouncementModel.video_generation_status == search_params.video_generation_status)

        # Filter by active status
        if search_params.is_active is not None:
            query = query.where(ISLAnnouncementModel.is_active == search_params.is_active)

        # Filter by saved status
        if search_params.is_saved is not None:
            query = query.where(ISLAnnouncementModel.is_saved == search_params.is_saved)

        # Filter by user
        if search_params.user_id:
            query = query.where(ISLAnnouncementModel.user_id == search_params.user_id)

        # Search by text
        if search_params.search_text:
            search_term = f"%{search_params.search_text}%"
            query = query.where(
                or_(
                    ISLAnnouncementModel.announcement_name.ilike(search_term),
                    ISLAnnouncementModel.announcement_text_english.ilike(search_term),
                    ISLAnnouncementModel.announcement_text_hindi.ilike(search_term),
                    ISLAnnouncementModel.announcement_text_gujarati.ilike(search_term),
                    ISLAnnouncementModel.announcement_text_marathi.ilike(search_term)
                )
            )

        # Order by creation date (newest first)
        query = query.order_by(ISLAnnouncementModel.created_at.desc())

        # Apply pagination
        offset = (search_params.page - 1) * search_params.limit
        query = query.offset(offset).limit(search_params.limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_announcements(self, search_params: ISLAnnouncementSearch) -> int:
        """Count announcements with filters (without pagination)"""
        query = select(func.count(ISLAnnouncementModel.id))

        # Apply same filters as search_announcements
        if search_params.category:
            query = query.where(ISLAnnouncementModel.category == search_params.category)

        if search_params.model:
            query = query.where(ISLAnnouncementModel.model == search_params.model)

        if search_params.video_generation_status:
            query = query.where(ISLAnnouncementModel.video_generation_status == search_params.video_generation_status)

        if search_params.is_active is not None:
            query = query.where(ISLAnnouncementModel.is_active == search_params.is_active)

        if search_params.is_saved is not None:
            query = query.where(ISLAnnouncementModel.is_saved == search_params.is_saved)

        if search_params.user_id:
            query = query.where(ISLAnnouncementModel.user_id == search_params.user_id)

        if search_params.search_text:
            search_term = f"%{search_params.search_text}%"
            query = query.where(
                or_(
                    ISLAnnouncementModel.announcement_name.ilike(search_term),
                    ISLAnnouncementModel.announcement_text_english.ilike(search_term),
                    ISLAnnouncementModel.announcement_text_hindi.ilike(search_term),
                    ISLAnnouncementModel.announcement_text_gujarati.ilike(search_term),
                    ISLAnnouncementModel.announcement_text_marathi.ilike(search_term)
                )
            )

        result = await self.db.execute(query)
        return result.scalar()

    async def update_announcement(self, announcement_id: int, announcement_update: ISLAnnouncementUpdate) -> Optional[ISLAnnouncementModel]:
        """Update announcement"""
        db_announcement = await self.get_announcement(announcement_id)
        if not db_announcement:
            return None

        update_data = announcement_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_announcement, field, value)

        await self.db.commit()
        await self.db.refresh(db_announcement)
        return db_announcement

    async def update_video_info(self, announcement_id: int, video_update: ISLAnnouncementVideoUpdate) -> Optional[ISLAnnouncementModel]:
        """Update video-related information"""
        db_announcement = await self.get_announcement(announcement_id)
        if not db_announcement:
            return None

        update_data = video_update.dict(exclude_unset=True)
        
        # Handle JSON fields
        if update_data.get('signs_used'):
            db_announcement.signs_used = json.dumps(update_data['signs_used'])
        if update_data.get('signs_skipped'):
            db_announcement.signs_skipped = json.dumps(update_data['signs_skipped'])
        
        # Update other fields
        for field, value in update_data.items():
            if field not in ['signs_used', 'signs_skipped']:
                setattr(db_announcement, field, value)

        await self.db.commit()
        await self.db.refresh(db_announcement)
        return db_announcement

    def _delete_video_file(self, video_path: str) -> bool:
        """Delete the video file associated with an announcement"""
        if not video_path:
            return True  # No video file to delete
        
        try:
            # Handle different path formats
            if video_path.startswith('/api/v1/isl-videos/serve/'):
                # Extract filename from API endpoint URL
                filename = video_path.split('/')[-1]
                file_path = Path(f"uploads/isl-videos/user_1/{filename}")
            elif video_path.startswith('backend/'):
                # Remove 'backend/' prefix
                file_path = Path(video_path[8:])
            else:
                # Use the path as is
                file_path = Path(video_path)
            
            # Check if file exists and delete it
            if file_path.exists():
                file_path.unlink()
                self.logger.info(f"Deleted video file: {file_path}")
                return True
            else:
                self.logger.warning(f"Video file not found: {file_path}")
                return True  # File doesn't exist, consider it deleted
                
        except Exception as e:
            self.logger.error(f"Failed to delete video file {video_path}: {str(e)}")
            return False

    async def hard_delete_announcement(self, announcement_id: int) -> bool:
        """Permanently delete announcement and its associated video file"""
        db_announcement = await self.get_announcement(announcement_id)
        if not db_announcement:
            return False

        # Delete the associated video file if it exists
        if db_announcement.final_video_path:
            video_deleted = self._delete_video_file(db_announcement.final_video_path)
            if not video_deleted:
                self.logger.warning(f"Failed to delete video file for announcement {announcement_id}, but continuing with database deletion")

        # Delete the database record
        await self.db.delete(db_announcement)
        await self.db.commit()
        
        self.logger.info(f"Successfully deleted ISL announcement {announcement_id} and its associated video file")
        return True

    async def get_announcement_statistics(self) -> ISLAnnouncementStatistics:
        """Get announcement statistics"""
        # Total announcements
        total_result = await self.db.execute(select(func.count(ISLAnnouncementModel.id)))
        total_announcements = total_result.scalar()

        # Active/Inactive announcements
        active_result = await self.db.execute(
            select(func.count(ISLAnnouncementModel.id)).where(ISLAnnouncementModel.is_active == True)
        )
        active_announcements = active_result.scalar()
        inactive_announcements = total_announcements - active_announcements

        # Saved/Unsaved announcements
        saved_result = await self.db.execute(
            select(func.count(ISLAnnouncementModel.id)).where(ISLAnnouncementModel.is_saved == True)
        )
        saved_announcements = saved_result.scalar()
        unsaved_announcements = total_announcements - saved_announcements

        # Announcements by category
        category_result = await self.db.execute(
            select(ISLAnnouncementModel.category, func.count(ISLAnnouncementModel.id))
            .group_by(ISLAnnouncementModel.category)
        )
        announcements_by_category = {row[0]: row[1] for row in category_result.fetchall()}

        # Announcements by model
        model_result = await self.db.execute(
            select(ISLAnnouncementModel.model, func.count(ISLAnnouncementModel.id))
            .group_by(ISLAnnouncementModel.model)
        )
        announcements_by_model = {row[0]: row[1] for row in model_result.fetchall()}

        # Announcements by status
        status_result = await self.db.execute(
            select(ISLAnnouncementModel.video_generation_status, func.count(ISLAnnouncementModel.id))
            .group_by(ISLAnnouncementModel.video_generation_status)
        )
        announcements_by_status = {row[0]: row[1] for row in status_result.fetchall()}

        # Announcements by user
        user_result = await self.db.execute(
            select(ISLAnnouncementModel.user_id, func.count(ISLAnnouncementModel.id))
            .group_by(ISLAnnouncementModel.user_id)
        )
        announcements_by_user = {str(row[0]): row[1] for row in user_result.fetchall()}

        return ISLAnnouncementStatistics(
            total_announcements=total_announcements,
            active_announcements=active_announcements,
            inactive_announcements=inactive_announcements,
            saved_announcements=saved_announcements,
            unsaved_announcements=unsaved_announcements,
            announcements_by_category=announcements_by_category,
            announcements_by_model=announcements_by_model,
            announcements_by_status=announcements_by_status,
            announcements_by_user=announcements_by_user
        )

    async def get_user_announcements(self, user_id: int, skip: int = 0, limit: int = 100) -> List[ISLAnnouncementModel]:
        """Get announcements for a specific user"""
        result = await self.db.execute(
            select(ISLAnnouncementModel)
            .where(ISLAnnouncementModel.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .order_by(ISLAnnouncementModel.created_at.desc())
        )
        return result.scalars().all()


def get_isl_announcement_service(db: AsyncSession) -> ISLAnnouncementService:
    """Get ISL announcement service instance"""
    return ISLAnnouncementService(db)
