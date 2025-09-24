import os
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func, select
from typing import List, Optional
from app.models.general_announcement import GeneralAnnouncement as GeneralAnnouncementModel
from app.schemas.general_announcement import (
    GeneralAnnouncementCreate, 
    GeneralAnnouncementUpdate, 
    GeneralAnnouncementSearch,
    GeneralAnnouncementStatistics
)


class GeneralAnnouncementService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.logger = logging.getLogger(__name__)

    async def create_announcement(self, announcement_data: GeneralAnnouncementCreate) -> GeneralAnnouncementModel:
        """Create a new general announcement record"""
        db_announcement = GeneralAnnouncementModel(**announcement_data.dict())
        self.db.add(db_announcement)
        await self.db.commit()
        await self.db.refresh(db_announcement)
        return db_announcement

    async def get_announcement(self, announcement_id: int) -> Optional[GeneralAnnouncementModel]:
        """Get announcement by ID"""
        result = await self.db.execute(
            select(GeneralAnnouncementModel).where(GeneralAnnouncementModel.id == announcement_id)
        )
        return result.scalar_one_or_none()

    async def get_announcements(self, skip: int = 0, limit: int = 100) -> List[GeneralAnnouncementModel]:
        """Get all announcements with pagination"""
        result = await self.db.execute(
            select(GeneralAnnouncementModel)
            .offset(skip)
            .limit(limit)
            .order_by(GeneralAnnouncementModel.created_at.desc())
        )
        return result.scalars().all()

    async def search_announcements(self, search_params: GeneralAnnouncementSearch) -> List[GeneralAnnouncementModel]:
        """Search announcements with filters"""
        query = select(GeneralAnnouncementModel)

        # Filter by category
        if search_params.category:
            query = query.where(GeneralAnnouncementModel.category == search_params.category)

        # Filter by model
        if search_params.model:
            query = query.where(GeneralAnnouncementModel.model == search_params.model)

        # Search by text
        if search_params.search_text:
            search_term = f"%{search_params.search_text}%"
            query = query.where(
                or_(
                    GeneralAnnouncementModel.announcement_name.ilike(search_term),
                    GeneralAnnouncementModel.announcement_text_english.ilike(search_term),
                    GeneralAnnouncementModel.announcement_text_hindi.ilike(search_term),
                    GeneralAnnouncementModel.announcement_text_gujarati.ilike(search_term),
                    GeneralAnnouncementModel.announcement_text_marathi.ilike(search_term)
                )
            )

        # Order by creation date (newest first)
        query = query.order_by(GeneralAnnouncementModel.created_at.desc())

        # Apply pagination
        offset = (search_params.page - 1) * search_params.limit
        query = query.offset(offset).limit(search_params.limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_announcements(self, search_params: GeneralAnnouncementSearch) -> int:
        """Count announcements with filters (without pagination)"""
        query = select(func.count(GeneralAnnouncementModel.id))

        # Filter by category
        if search_params.category:
            query = query.where(GeneralAnnouncementModel.category == search_params.category)

        # Filter by model
        if search_params.model:
            query = query.where(GeneralAnnouncementModel.model == search_params.model)

        # Search by text
        if search_params.search_text:
            search_term = f"%{search_params.search_text}%"
            query = query.where(
                or_(
                    GeneralAnnouncementModel.announcement_name.ilike(search_term),
                    GeneralAnnouncementModel.announcement_text_english.ilike(search_term),
                    GeneralAnnouncementModel.announcement_text_hindi.ilike(search_term),
                    GeneralAnnouncementModel.announcement_text_gujarati.ilike(search_term),
                    GeneralAnnouncementModel.announcement_text_marathi.ilike(search_term)
                )
            )

        result = await self.db.execute(query)
        return result.scalar()

    async def update_announcement(self, announcement_id: int, announcement_update: GeneralAnnouncementUpdate) -> Optional[GeneralAnnouncementModel]:
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
        if db_announcement.isl_video_path:
            video_deleted = self._delete_video_file(db_announcement.isl_video_path)
            if not video_deleted:
                self.logger.warning(f"Failed to delete video file for announcement {announcement_id}, but continuing with database deletion")

        # Delete the database record
        await self.db.delete(db_announcement)
        await self.db.commit()
        
        self.logger.info(f"Successfully deleted announcement {announcement_id} and its associated video file")
        return True

    async def get_announcement_statistics(self) -> GeneralAnnouncementStatistics:
        """Get announcement statistics"""
        # Total announcements
        total_result = await self.db.execute(select(func.count(GeneralAnnouncementModel.id)))
        total_announcements = total_result.scalar()

        # Announcements by category
        category_result = await self.db.execute(
            select(GeneralAnnouncementModel.category, func.count(GeneralAnnouncementModel.id))
            .group_by(GeneralAnnouncementModel.category)
        )
        announcements_by_category = {row[0]: row[1] for row in category_result.fetchall()}

        # Announcements by model
        model_result = await self.db.execute(
            select(GeneralAnnouncementModel.model, func.count(GeneralAnnouncementModel.id))
            .group_by(GeneralAnnouncementModel.model)
        )
        announcements_by_model = {row[0]: row[1] for row in model_result.fetchall()}

        return GeneralAnnouncementStatistics(
            total_announcements=total_announcements,
            active_announcements=total_announcements,  # All announcements are considered active
            inactive_announcements=0,  # No inactive announcements
            announcements_by_category=announcements_by_category,
            announcements_by_model=announcements_by_model
        )

    async def update_video_path(self, announcement_id: int, video_path: str) -> Optional[GeneralAnnouncementModel]:
        """Update the ISL video path for an announcement"""
        db_announcement = await self.get_announcement(announcement_id)
        if not db_announcement:
            return None

        db_announcement.isl_video_path = video_path
        await self.db.commit()
        await self.db.refresh(db_announcement)
        return db_announcement


def get_general_announcement_service(db: AsyncSession) -> GeneralAnnouncementService:
    """Get general announcement service instance"""
    return GeneralAnnouncementService(db)