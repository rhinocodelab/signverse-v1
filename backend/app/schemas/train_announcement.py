from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TrainAnnouncementRequest(BaseModel):
    train_number: str = Field(..., min_length=5, max_length=5, description="5-digit train number")
    train_name: str = Field(..., description="Name of the train")
    from_station_name: str = Field(..., description="Name of the departure station")
    to_station_name: str = Field(..., description="Name of the destination station")
    platform: int = Field(..., ge=1, le=20, description="Platform number (1-20)")
    announcement_category: str = Field(..., description="Announcement category (e.g., Arriving, Departure)")
    model: str = Field(..., pattern="^(male|female)$", description="AI model type (male or female)")
    user_id: int = Field(..., description="User ID for tracking")


class TrainAnnouncementResponse(BaseModel):
    success: bool
    announcement_id: Optional[int] = None
    announcement_name: Optional[str] = None
    generated_text: Optional[str] = None
    generated_text_hindi: Optional[str] = None
    generated_text_marathi: Optional[str] = None
    generated_text_gujarati: Optional[str] = None
    video_url: Optional[str] = None
    temp_video_id: Optional[str] = None
    preview_url: Optional[str] = None
    error: Optional[str] = None
    signs_used: Optional[list] = None
    signs_skipped: Optional[list] = None


class TemplateSubstitutionRequest(BaseModel):
    template_text: str = Field(..., description="Template text with placeholders")
    train_number: str = Field(..., description="Train number")
    train_name: str = Field(..., description="Train name")
    from_station_name: str = Field(..., description="Departure station name")
    to_station_name: str = Field(..., description="Destination station name")
    platform: int = Field(..., description="Platform number")


class TemplateSubstitutionResponse(BaseModel):
    success: bool
    original_text: str
    substituted_text: str
    placeholders_found: list
    placeholders_substituted: list
    error: Optional[str] = None