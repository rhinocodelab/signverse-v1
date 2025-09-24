from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GeneralAnnouncementBase(BaseModel):
    announcement_name: str = Field(..., min_length=1, max_length=255, description="Name of the announcement")
    category: str = Field(..., min_length=1, max_length=100, description="Category of the announcement")
    model: str = Field(..., pattern="^(male|female)$", description="AI model type (male or female)")
    announcement_text_english: str = Field(..., min_length=1, description="Announcement text in English")
    announcement_text_hindi: Optional[str] = Field(None, description="Announcement text in Hindi")
    announcement_text_gujarati: Optional[str] = Field(None, description="Announcement text in Gujarati")
    announcement_text_marathi: Optional[str] = Field(None, description="Announcement text in Marathi")


class GeneralAnnouncementCreate(GeneralAnnouncementBase):
    pass


class GeneralAnnouncementUpdate(BaseModel):
    announcement_name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, pattern="^(male|female)$")
    announcement_text_english: Optional[str] = Field(None, min_length=1)
    announcement_text_hindi: Optional[str] = None
    announcement_text_gujarati: Optional[str] = None
    announcement_text_marathi: Optional[str] = None
    is_active: Optional[bool] = None


class GeneralAnnouncement(GeneralAnnouncementBase):
    id: int
    isl_video_path: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GeneralAnnouncementListResponse(BaseModel):
    announcements: list[GeneralAnnouncement]
    total_count: int
    page: int
    limit: int


class GeneralAnnouncementSearch(BaseModel):
    search_text: Optional[str] = None
    category: Optional[str] = None
    model: Optional[str] = None
    page: int = Field(1, ge=1)
    limit: int = Field(10, ge=1, le=100)


class GeneralAnnouncementStatistics(BaseModel):
    total_announcements: int
    active_announcements: int
    inactive_announcements: int
    announcements_by_category: dict[str, int]
    announcements_by_model: dict[str, int]