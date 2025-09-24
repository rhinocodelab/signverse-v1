from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os
from pathlib import Path

from app.db.database import get_db
from app.schemas.general_announcement import (
    GeneralAnnouncement, 
    GeneralAnnouncementCreate, 
    GeneralAnnouncementUpdate, 
    GeneralAnnouncementListResponse,
    GeneralAnnouncementSearch,
    GeneralAnnouncementStatistics
)
from app.services.general_announcement_service import get_general_announcement_service, GeneralAnnouncementService

router = APIRouter()


@router.get("/", response_model=GeneralAnnouncementListResponse)
async def get_announcements(
    category: Optional[str] = Query(None, description="Filter by category"),
    model: Optional[str] = Query(None, description="Filter by model (male/female)"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get all general announcements with optional filtering and pagination"""
    try:
        announcement_service = get_general_announcement_service(db)
        
        # Create search parameters
        search_params = GeneralAnnouncementSearch(
            search_text=search,
            category=category,
            model=model,
            page=page,
            limit=limit
        )
        
        # Get announcements
        announcements = await announcement_service.search_announcements(search_params)
        
        # Get total count for pagination
        total_count = await announcement_service.count_announcements(search_params)
        
        return GeneralAnnouncementListResponse(
            announcements=announcements,
            total_count=total_count,
            page=page,
            limit=limit
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{announcement_id}", response_model=GeneralAnnouncement)
async def get_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific announcement by ID"""
    try:
        announcement_service = get_general_announcement_service(db)
        announcement = await announcement_service.get_announcement(announcement_id)
        
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        return announcement
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/", response_model=GeneralAnnouncement)
async def create_announcement(
    announcement_data: GeneralAnnouncementCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new general announcement"""
    try:
        announcement_service = get_general_announcement_service(db)
        announcement = await announcement_service.create_announcement(announcement_data)
        
        return announcement
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create announcement: {str(e)}")


@router.put("/{announcement_id}", response_model=GeneralAnnouncement)
async def update_announcement(
    announcement_id: int,
    announcement_update: GeneralAnnouncementUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing announcement"""
    try:
        announcement_service = get_general_announcement_service(db)
        announcement = await announcement_service.update_announcement(announcement_id, announcement_update)
        
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        return announcement
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update announcement: {str(e)}")


@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete an announcement"""
    try:
        announcement_service = get_general_announcement_service(db)
        success = await announcement_service.hard_delete_announcement(announcement_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        return {"message": "Announcement deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete announcement: {str(e)}")


@router.delete("/{announcement_id}/permanent")
async def permanent_delete_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete an announcement"""
    try:
        announcement_service = get_general_announcement_service(db)
        success = await announcement_service.hard_delete_announcement(announcement_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        return {"message": "Announcement permanently deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to permanently delete announcement: {str(e)}")


@router.get("/statistics/overview", response_model=GeneralAnnouncementStatistics)
async def get_announcement_statistics(
    db: AsyncSession = Depends(get_db)
):
    """Get announcement statistics"""
    try:
        announcement_service = get_general_announcement_service(db)
        statistics = await announcement_service.get_announcement_statistics()
        
        return statistics
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get statistics: {str(e)}")


@router.put("/{announcement_id}/video-path")
async def update_video_path(
    announcement_id: int,
    request: dict,
    db: AsyncSession = Depends(get_db)
):
    """Update the ISL video path for an announcement"""
    try:
        # Extract video path from request body
        video_path = request.get('isl_video_path')
        if not video_path:
            raise HTTPException(status_code=400, detail="isl_video_path is required")
        
        announcement_service = get_general_announcement_service(db)
        announcement = await announcement_service.update_video_path(announcement_id, video_path)
        
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        return {"message": "Video path updated successfully", "video_path": video_path}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update video path: {str(e)}")


@router.get("/categories/list")
async def get_categories(
    db: AsyncSession = Depends(get_db)
):
    """Get list of all unique categories"""
    try:
        announcement_service = get_general_announcement_service(db)
        
        # Get all announcements to extract unique categories
        announcements = await announcement_service.get_announcements(limit=1000)
        categories = list(set([ann.category for ann in announcements if ann.category]))
        
        return {"categories": sorted(categories)}
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get categories: {str(e)}")


@router.get("/{announcement_id}/video/stream")
async def stream_announcement_video(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Stream the ISL video for a general announcement"""
    try:
        # Get the announcement using the service
        service = get_general_announcement_service(db)
        announcement = await service.get_announcement(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        if not announcement.isl_video_path:
            raise HTTPException(status_code=404, detail="No video available for this announcement")
        
        # Construct the full path to the video file
        # Handle different path formats dynamically
        video_path_str = announcement.isl_video_path
        
        # If it's an API endpoint URL, extract the filename and construct the file path
        if video_path_str.startswith('/api/v1/isl-videos/serve/'):
            # Extract filename from API endpoint URL
            # Format: /api/v1/isl-videos/serve/1/filename.mp4
            filename = video_path_str.split('/')[-1]
            video_path = Path(f"uploads/isl-videos/user_1/{filename}")
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
                raise
        
        return StreamingResponse(
            iterfile(),
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Content-Disposition": f"inline; filename={video_path.name}",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in stream_announcement_video: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")