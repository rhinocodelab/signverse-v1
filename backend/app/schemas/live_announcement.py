from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

class AnnouncementStatus(str, Enum):
    RECEIVED = "received"
    PROCESSING = "processing"
    GENERATING_VIDEO = "generating_video"
    COMPLETED = "completed"
    ERROR = "error"

class LiveAnnouncementRequest(BaseModel):
    train_number: str = Field(..., description="Train number")
    train_name: str = Field(..., description="Train name")
    from_station: str = Field(..., description="From station name")
    to_station: str = Field(..., description="To station name")
    platform_number: int = Field(..., ge=1, le=20, description="Platform number")
    announcement_category: str = Field(..., description="Announcement category")
    ai_avatar_model: Literal["male", "female"] = Field(..., description="AI Avatar Model (Male/Female)")

class LiveAnnouncementResponse(BaseModel):
    announcement_id: str = Field(..., description="Unique announcement ID")
    status: AnnouncementStatus = Field(..., description="Current status")
    message: str = Field(..., description="Status message")
    received_at: datetime = Field(..., description="When announcement was received")

class LiveAnnouncementUpdate(BaseModel):
    announcement_id: str = Field(..., description="Unique announcement ID")
    status: AnnouncementStatus = Field(..., description="Current status")
    message: str = Field(..., description="Status message")
    progress_percentage: Optional[int] = Field(None, ge=0, le=100, description="Progress percentage")
    video_url: Optional[str] = Field(None, description="Generated video URL")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    updated_at: datetime = Field(..., description="When status was updated")

class LiveAnnouncementItem(BaseModel):
    announcement_id: str
    train_number: str
    train_name: str
    from_station: str
    to_station: str
    platform_number: int
    announcement_category: str
    ai_avatar_model: str
    status: AnnouncementStatus
    message: str
    progress_percentage: Optional[int] = None
    video_url: Optional[str] = None
    error_message: Optional[str] = None
    received_at: datetime
    updated_at: datetime