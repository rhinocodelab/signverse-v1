from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class ISLVideoBase(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    video_path: str = Field(..., min_length=1, max_length=500)
    file_size: int = Field(..., gt=0)
    duration_seconds: Optional[float] = Field(None, ge=0)
    width: Optional[int] = Field(None, gt=0)
    height: Optional[int] = Field(None, gt=0)
    model_type: str = Field(..., pattern="^(male|female)$")
    mime_type: str = Field(default="video/mp4", max_length=100)
    file_extension: str = Field(default="mp4", max_length=10)
    description: Optional[str] = None
    tags: Optional[str] = None
    content_type: Optional[str] = Field(None, max_length=100)
    is_active: bool = Field(default=True)


class ISLVideoCreate(ISLVideoBase):
    pass


class ISLVideoUpdate(BaseModel):
    filename: Optional[str] = Field(None, min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    video_path: Optional[str] = Field(None, min_length=1, max_length=500)
    file_size: Optional[int] = Field(None, gt=0)
    duration_seconds: Optional[float] = Field(None, ge=0)
    width: Optional[int] = Field(None, gt=0)
    height: Optional[int] = Field(None, gt=0)
    model_type: Optional[str] = Field(None, pattern="^(male|female)$")
    mime_type: Optional[str] = Field(None, max_length=100)
    file_extension: Optional[str] = Field(None, max_length=10)
    description: Optional[str] = None
    tags: Optional[str] = None
    content_type: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class ISLVideo(ISLVideoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ISLVideoSearch(BaseModel):
    model_type: Optional[str] = Field(None, pattern="^(male|female)$")
    search_text: Optional[str] = None
    is_active: Optional[bool] = True
    limit: int = Field(12, ge=1, le=100)
    offset: int = Field(0, ge=0)


class ISLVideoListResponse(BaseModel):
    videos: List[ISLVideo]
    total: int
    page: int
    limit: int
    total_pages: int


class ISLVideoStatistics(BaseModel):
    total_videos: int
    male_videos: int
    female_videos: int
    total_size_bytes: int
    average_duration_seconds: Optional[float] = None
    active_videos: int
    inactive_videos: int


class DuplicateCheckRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    model_type: str = Field(..., pattern="^(male|female)$")
    file_size: Optional[int] = Field(None, gt=0)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    # 'exact_match' or 'display_name_match'
    duplicate_type: Optional[str] = None
    duplicate_video: Optional[ISLVideo] = None


class UploadResponse(BaseModel):
    message: str
    video_id: int
    processing_status: str
    duplicate_warnings: Optional[List[dict]] = None
    file_replaced: bool = False


class SyncRequest(BaseModel):
    model_type: str = Field(..., pattern="^(male|female)$")
    force_reprocess: bool = Field(default=False)


class SyncResponse(BaseModel):
    success: bool
    message: str
    processed: int
    errors: List[str]
    total_folders: Optional[int] = None
