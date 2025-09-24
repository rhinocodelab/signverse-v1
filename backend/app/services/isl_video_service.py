from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func, select
from typing import List, Optional
from app.models.isl_video import ISLVideo as ISLVideoModel
from app.schemas.isl_video import ISLVideoCreate, ISLVideoUpdate, ISLVideoSearch, ISLVideoStatistics


class ISLVideoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_isl_video(self, video_data: ISLVideoCreate) -> ISLVideoModel:
        """Create a new ISL video record"""
        db_video = ISLVideoModel(**video_data.dict())
        self.db.add(db_video)
        await self.db.commit()
        await self.db.refresh(db_video)
        return db_video

    async def get_isl_video(self, video_id: int) -> Optional[ISLVideoModel]:
        """Get ISL video by ID"""
        result = await self.db.execute(
            select(ISLVideoModel).where(ISLVideoModel.id == video_id)
        )
        return result.scalar_one_or_none()

    async def get_isl_videos(self, skip: int = 0, limit: int = 100) -> List[ISLVideoModel]:
        """Get all ISL videos with pagination"""
        result = await self.db.execute(
            select(ISLVideoModel).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def search_isl_videos(self, search_params: ISLVideoSearch) -> List[ISLVideoModel]:
        """Search ISL videos with filters"""
        query = select(ISLVideoModel)

        # Filter by model type
        if search_params.model_type:
            query = query.where(ISLVideoModel.model_type ==
                                search_params.model_type)

        # All videos are considered active (no inactive filtering)

        # Search by text
        if search_params.search_text:
            search_term = f"%{search_params.search_text}%"
            query = query.where(
                or_(
                    ISLVideoModel.display_name.ilike(search_term),
                    ISLVideoModel.filename.ilike(search_term),
                    ISLVideoModel.description.ilike(search_term),
                    ISLVideoModel.tags.ilike(search_term)
                )
            )

        # Order by creation date (newest first)
        query = query.order_by(ISLVideoModel.created_at.desc())

        # Apply pagination
        query = query.offset(search_params.offset).limit(search_params.limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_isl_video(self, video_id: int, video_update: ISLVideoUpdate) -> Optional[ISLVideoModel]:
        """Update ISL video"""
        db_video = await self.get_isl_video(video_id)
        if not db_video:
            return None

        update_data = video_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_video, field, value)

        await self.db.commit()
        await self.db.refresh(db_video)
        return db_video

    async def delete_isl_video(self, video_id: int) -> bool:
        """Soft delete ISL video (mark as inactive)"""
        db_video = await self.get_isl_video(video_id)
        if not db_video:
            return False

        db_video.is_active = False
        await self.db.commit()
        return True

    async def hard_delete_isl_video(self, video_id: int) -> bool:
        """Permanently delete ISL video"""
        db_video = await self.get_isl_video(video_id)
        if not db_video:
            return False

        # Delete the physical video file
        try:
            import os
            if os.path.exists(db_video.video_path):
                os.remove(db_video.video_path)
                print(f"✅ Deleted video file: {db_video.video_path}")
        except Exception as e:
            print(
                f"⚠️ Warning: Could not delete video file {db_video.video_path}: {e}")

        # Delete the database record
        await self.db.delete(db_video)
        await self.db.commit()
        return True

    async def check_duplicate_video(self, filename: str, model_type: str, file_size: int) -> Optional[ISLVideoModel]:
        """Check for exact duplicate video (same filename, model type, and file size)"""
        result = await self.db.execute(
            select(ISLVideoModel).where(
                and_(
                    ISLVideoModel.filename == filename,
                    ISLVideoModel.model_type == model_type,
                    ISLVideoModel.file_size == file_size
                )
            )
        )
        return result.scalar_one_or_none()

    async def check_duplicate_by_display_name(self, display_name: str, model_type: str) -> Optional[ISLVideoModel]:
        """Check for duplicate by display name and model type"""
        result = await self.db.execute(
            select(ISLVideoModel).where(
                and_(
                    ISLVideoModel.display_name == display_name,
                    ISLVideoModel.model_type == model_type
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_video_statistics(self) -> ISLVideoStatistics:
        """Get ISL video statistics"""
        # Total videos
        total_result = await self.db.execute(select(func.count(ISLVideoModel.id)))
        total_videos = total_result.scalar()

        # Male videos
        male_result = await self.db.execute(
            select(func.count(ISLVideoModel.id)).where(
                ISLVideoModel.model_type == 'male')
        )
        male_videos = male_result.scalar()

        # Female videos
        female_result = await self.db.execute(
            select(func.count(ISLVideoModel.id)).where(
                ISLVideoModel.model_type == 'female')
        )
        female_videos = female_result.scalar()

        # All videos are considered active (no inactive tracking)
        active_videos = total_videos
        inactive_videos = 0

        # Get total file size
        total_size_result = await self.db.execute(select(func.sum(ISLVideoModel.file_size)))
        total_size_bytes = total_size_result.scalar() or 0

        # Get average duration
        avg_duration_result = await self.db.execute(
            select(func.avg(ISLVideoModel.duration_seconds)).where(
                ISLVideoModel.duration_seconds.isnot(None)
            )
        )
        average_duration_seconds = avg_duration_result.scalar()
        if average_duration_seconds:
            average_duration_seconds = float(average_duration_seconds)

        return ISLVideoStatistics(
            total_videos=total_videos,
            male_videos=male_videos,
            female_videos=female_videos,
            total_size_bytes=total_size_bytes,
            average_duration_seconds=average_duration_seconds,
            active_videos=active_videos,
            inactive_videos=inactive_videos
        )

    async def get_videos_by_model_type(self, model_type: str) -> List[ISLVideoModel]:
        """Get all videos by model type"""
        result = await self.db.execute(
            select(ISLVideoModel).where(
                ISLVideoModel.model_type == model_type
            ).order_by(ISLVideoModel.created_at.desc())
        )
        return result.scalars().all()

    async def get_video_by_path(self, video_path: str) -> Optional[ISLVideoModel]:
        """Get video by file path"""
        result = await self.db.execute(
            select(ISLVideoModel).where(ISLVideoModel.video_path == video_path)
        )
        return result.scalar_one_or_none()


def get_isl_video_service(db: AsyncSession) -> ISLVideoService:
    """Dependency to get ISL video service"""
    return ISLVideoService(db)
