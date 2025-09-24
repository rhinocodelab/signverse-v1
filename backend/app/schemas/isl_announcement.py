from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ISLAnnouncementBase(BaseModel):
    announcement_name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., pattern="^(male|female)$")
    announcement_text_english: str = Field(..., min_length=1)
    announcement_text_hindi: Optional[str] = None
    announcement_text_gujarati: Optional[str] = None
    announcement_text_marathi: Optional[str] = None
    user_id: int = Field(..., gt=0)


class ISLAnnouncementCreate(ISLAnnouncementBase):
    """Schema for creating a new ISL announcement"""
    pass


class ISLAnnouncementUpdate(BaseModel):
    """Schema for updating an ISL announcement"""
    announcement_name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, pattern="^(male|female)$")
    announcement_text_english: Optional[str] = Field(None, min_length=1)
    announcement_text_hindi: Optional[str] = None
    announcement_text_gujarati: Optional[str] = None
    announcement_text_marathi: Optional[str] = None
    is_active: Optional[bool] = None


class ISLAnnouncementVideoUpdate(BaseModel):
    """Schema for updating video-related fields"""
    temp_video_id: Optional[str] = None
    preview_url: Optional[str] = None
    final_video_path: Optional[str] = None
    final_video_url: Optional[str] = None
    video_duration: Optional[float] = None
    signs_used: Optional[List[str]] = None
    signs_skipped: Optional[List[str]] = None
    video_generation_status: Optional[str] = Field(None, pattern="^(pending|generating|completed|failed)$")
    is_saved: Optional[bool] = None


class ISLAnnouncementResponse(ISLAnnouncementBase):
    """Schema for ISL announcement response"""
    id: int
    temp_video_id: Optional[str] = None
    preview_url: Optional[str] = None
    final_video_path: Optional[str] = None
    final_video_url: Optional[str] = None
    video_duration: Optional[float] = None
    signs_used: Optional[List[str]] = None
    signs_skipped: Optional[List[str]] = None
    video_generation_status: str
    is_active: bool
    is_saved: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ISLAnnouncementListResponse(BaseModel):
    """Schema for paginated ISL announcement list response"""
    announcements: List[ISLAnnouncementResponse]
    total_count: int
    page: int
    limit: int
    total_pages: int


class ISLAnnouncementSearch(BaseModel):
    """Schema for searching ISL announcements"""
    page: int = Field(1, ge=1)
    limit: int = Field(10, ge=1, le=100)
    search_text: Optional[str] = None
    category: Optional[str] = None
    model: Optional[str] = None
    video_generation_status: Optional[str] = None
    is_active: Optional[bool] = None
    is_saved: Optional[bool] = None
    user_id: Optional[int] = None


class ISLAnnouncementStatistics(BaseModel):
    """Schema for ISL announcement statistics"""
    total_announcements: int
    active_announcements: int
    inactive_announcements: int
    saved_announcements: int
    unsaved_announcements: int
    announcements_by_category: Dict[str, int]
    announcements_by_model: Dict[str, int]
    announcements_by_status: Dict[str, int]
    announcements_by_user: Dict[str, int]


class ISLAnnouncementVideoGenerationRequest(BaseModel):
    """Schema for video generation request"""
    announcement_id: int
    text: str = Field(..., min_length=1)
    model: str = Field(..., pattern="^(male|female)$")
    user_id: int = Field(..., gt=0)


class ISLAnnouncementVideoGenerationResponse(BaseModel):
    """Schema for video generation response"""
    success: bool
    temp_video_id: Optional[str] = None
    preview_url: Optional[str] = None
    video_duration: Optional[float] = None
    signs_used: Optional[List[str]] = None
    signs_skipped: Optional[List[str]] = None
    error: Optional[str] = None


class ISLAnnouncementVideoSaveRequest(BaseModel):
    """Schema for video save request"""
    announcement_id: int
    temp_video_id: str = Field(..., min_length=1)
    user_id: int = Field(..., gt=0)


class ISLAnnouncementVideoSaveResponse(BaseModel):
    """Schema for video save response"""
    success: bool
    final_video_path: Optional[str] = None
    final_video_url: Optional[str] = None
    error: Optional[str] = None
