from typing import Optional
from pydantic import BaseModel


class SimpleHTMLGenerationRequest(BaseModel):
    """Simple request schema for HTML generation - just video path"""
    video_path: str  # Absolute path to the temporary ISL video file


class HTMLGenerationResponse(BaseModel):
    """Response schema for HTML generation"""
    success: bool
    html_path: Optional[str] = None
    video_path: Optional[str] = None
    message: str
    error: Optional[str] = None