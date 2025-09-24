from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import logging

from app.db.database import get_db
from app.schemas.isl_announcement import (
    ISLAnnouncementCreate,
    ISLAnnouncementUpdate,
    ISLAnnouncementVideoUpdate,
    ISLAnnouncementResponse,
    ISLAnnouncementListResponse,
    ISLAnnouncementSearch,
    ISLAnnouncementStatistics,
    ISLAnnouncementVideoGenerationRequest,
    ISLAnnouncementVideoGenerationResponse,
    ISLAnnouncementVideoSaveRequest,
    ISLAnnouncementVideoSaveResponse
)
from app.services.isl_announcement_service import get_isl_announcement_service
from app.api.v1.endpoints.isl_video_generation import generate_isl_video, save_isl_video

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=ISLAnnouncementResponse)
async def create_isl_announcement(
    announcement_data: ISLAnnouncementCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new ISL announcement"""
    try:
        service = get_isl_announcement_service(db)
        announcement = await service.create_announcement(announcement_data)
        return announcement
    except Exception as e:
        logger.error(f"Error creating ISL announcement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create announcement: {str(e)}"
        )


@router.get("/{announcement_id}", response_model=ISLAnnouncementResponse)
async def get_isl_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific ISL announcement by ID"""
    try:
        service = get_isl_announcement_service(db)
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
        logger.error(f"Error getting ISL announcement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get announcement: {str(e)}"
        )


@router.get("/", response_model=ISLAnnouncementListResponse)
async def get_isl_announcements(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search_text: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    video_generation_status: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_saved: Optional[bool] = Query(None),
    user_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get ISL announcements with filtering and pagination"""
    try:
        service = get_isl_announcement_service(db)
        
        # Create search parameters
        search_params = ISLAnnouncementSearch(
            page=page,
            limit=limit,
            search_text=search_text,
            category=category,
            model=model,
            video_generation_status=video_generation_status,
            is_active=is_active,
            is_saved=is_saved,
            user_id=user_id
        )
        
        # Get announcements and total count
        announcements = await service.search_announcements(search_params)
        total_count = await service.count_announcements(search_params)
        
        # Calculate total pages
        total_pages = (total_count + limit - 1) // limit
        
        return ISLAnnouncementListResponse(
            announcements=announcements,
            total_count=total_count,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Error getting ISL announcements: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get announcements: {str(e)}"
        )


@router.put("/{announcement_id}", response_model=ISLAnnouncementResponse)
async def update_isl_announcement(
    announcement_id: int,
    announcement_update: ISLAnnouncementUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an ISL announcement"""
    try:
        service = get_isl_announcement_service(db)
        announcement = await service.update_announcement(announcement_id, announcement_update)
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        return announcement
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ISL announcement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update announcement: {str(e)}"
        )


@router.put("/{announcement_id}/video", response_model=ISLAnnouncementResponse)
async def update_isl_announcement_video(
    announcement_id: int,
    video_update: ISLAnnouncementVideoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update video information for an ISL announcement"""
    try:
        service = get_isl_announcement_service(db)
        announcement = await service.update_video_info(announcement_id, video_update)
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        return announcement
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ISL announcement video: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update announcement video: {str(e)}"
        )


@router.post("/{announcement_id}/generate-video", response_model=ISLAnnouncementVideoGenerationResponse)
async def generate_isl_announcement_video(
    announcement_id: int,
    video_request: ISLAnnouncementVideoGenerationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate ISL video for an announcement"""
    try:
        service = get_isl_announcement_service(db)
        
        # Check if announcement exists
        announcement = await service.get_announcement(announcement_id)
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        # Update status to generating
        await service.update_video_info(
            announcement_id,
            ISLAnnouncementVideoUpdate(video_generation_status="generating")
        )
        
        # Generate video
        from app.api.v1.endpoints.isl_video_generation import VideoGenerationRequest
        video_generation_request = VideoGenerationRequest(
            text=video_request.text,
            model=video_request.model,
            user_id=video_request.user_id
        )
        
        video_response = await generate_isl_video(video_generation_request)
        
        if video_response.success:
            # Update announcement with video info
            await service.update_video_info(
                announcement_id,
                ISLAnnouncementVideoUpdate(
                    temp_video_id=video_response.temp_video_id,
                    preview_url=video_response.preview_url,
                    video_duration=video_response.video_duration,
                    signs_used=video_response.signs_used,
                    signs_skipped=video_response.signs_skipped,
                    video_generation_status="completed"
                )
            )
            
            return ISLAnnouncementVideoGenerationResponse(
                success=True,
                temp_video_id=video_response.temp_video_id,
                preview_url=video_response.preview_url,
                video_duration=video_response.video_duration,
                signs_used=video_response.signs_used,
                signs_skipped=video_response.signs_skipped
            )
        else:
            # Update status to failed
            await service.update_video_info(
                announcement_id,
                ISLAnnouncementVideoUpdate(video_generation_status="failed")
            )
            
            return ISLAnnouncementVideoGenerationResponse(
                success=False,
                error=video_response.error
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating ISL announcement video: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate video: {str(e)}"
        )


@router.post("/{announcement_id}/save-video", response_model=ISLAnnouncementVideoSaveResponse)
async def save_isl_announcement_video(
    announcement_id: int,
    save_request: ISLAnnouncementVideoSaveRequest,
    db: AsyncSession = Depends(get_db)
):
    """Save temporary ISL video to permanent location"""
    try:
        service = get_isl_announcement_service(db)
        
        # Check if announcement exists
        announcement = await service.get_announcement(announcement_id)
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        # Save video
        from app.api.v1.endpoints.isl_video_generation import VideoSaveRequest
        video_save_request = VideoSaveRequest(
            temp_video_id=save_request.temp_video_id,
            user_id=save_request.user_id
        )
        
        save_response = await save_isl_video(video_save_request)
        
        if save_response.success:
            # Update announcement with final video info
            await service.update_video_info(
                announcement_id,
                ISLAnnouncementVideoUpdate(
                    final_video_path=save_response.final_video_url,
                    final_video_url=save_response.final_video_url,
                    is_saved=True
                )
            )
            
            return ISLAnnouncementVideoSaveResponse(
                success=True,
                final_video_path=save_response.final_video_url,
                final_video_url=save_response.final_video_url
            )
        else:
            return ISLAnnouncementVideoSaveResponse(
                success=False,
                error=save_response.error
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving ISL announcement video: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save video: {str(e)}"
        )


@router.delete("/{announcement_id}")
async def delete_isl_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an ISL announcement"""
    try:
        service = get_isl_announcement_service(db)
        success = await service.hard_delete_announcement(announcement_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        return {"message": "Announcement deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting ISL announcement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete announcement: {str(e)}"
        )


@router.get("/statistics/overview", response_model=ISLAnnouncementStatistics)
async def get_isl_announcement_statistics(
    db: AsyncSession = Depends(get_db)
):
    """Get ISL announcement statistics"""
    try:
        service = get_isl_announcement_service(db)
        statistics = await service.get_announcement_statistics()
        return statistics
    except Exception as e:
        logger.error(f"Error getting ISL announcement statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )


@router.get("/categories/list")
async def get_isl_announcement_categories():
    """Get list of available categories for ISL announcements"""
    categories = [
        'Safety Announcement',
        'Schedule Information',
        'General Information',
        'Emergency Notice',
        'Service Update',
        'Platform Information',
        'Train Information',
        'Other'
    ]
    return {"categories": categories}


@router.get("/user/{user_id}", response_model=List[ISLAnnouncementResponse])
async def get_user_isl_announcements(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get ISL announcements for a specific user"""
    try:
        service = get_isl_announcement_service(db)
        announcements = await service.get_user_announcements(user_id, skip, limit)
        return announcements
    except Exception as e:
        logger.error(f"Error getting user ISL announcements: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user announcements: {str(e)}"
        )


@router.get("/{announcement_id}/video/stream")
async def stream_isl_announcement_video(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Stream the ISL video for an ISL announcement"""
    try:
        # Get the announcement using the service
        service = get_isl_announcement_service(db)
        announcement = await service.get_announcement(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        if not announcement.final_video_path and not announcement.preview_url:
            raise HTTPException(status_code=404, detail="No video available for this announcement")
        
        # Use final video path if available, otherwise use preview URL
        video_path_str = announcement.final_video_path or announcement.preview_url
        
        # Construct the full path to the video file
        # Handle different path formats dynamically
        import os
        from pathlib import Path
        
        # If it's an API endpoint URL, extract the filename and construct the file path
        if video_path_str.startswith('/api/v1/isl-videos/serve/'):
            # Extract filename from API endpoint URL
            # Format: /api/v1/isl-videos/serve/1/filename.mp4
            filename = video_path_str.split('/')[-1]
            video_path = Path(f"uploads/isl-videos/user_1/{filename}")
        # If it's a preview URL, construct temp video path
        elif video_path_str.startswith('/isl-video-generation/preview/'):
            # Extract temp video ID from preview URL
            temp_video_id = video_path_str.split('/')[-1]
            video_path = Path(f"frontend/public/temp/videos/{temp_video_id}.mp4")
        # If it's an absolute path, use it directly
        elif os.path.isabs(video_path_str):
            video_path = Path(video_path_str)
        # If it starts with 'backend/', remove it since we're already in the backend directory
        elif video_path_str.startswith('backend/'):
            video_path = Path(video_path_str[8:])  # Remove 'backend/' prefix
        # If it's a relative path, use it as is
        else:
            video_path = Path(video_path_str)
        
        # Check if the video file exists
        if not video_path.exists():
            raise HTTPException(
                status_code=404, 
                detail=f"Video file not found at: {video_path}"
            )
        
        def iterfile():
            try:
                with open(video_path, mode="rb") as file_like:
                    yield from file_like
            except Exception as e:
                print(f"Error reading video file: {e}")
                raise HTTPException(status_code=500, detail="Error reading video file")
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(iterfile(), media_type="video/mp4")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming ISL announcement video: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stream video: {str(e)}"
        )
