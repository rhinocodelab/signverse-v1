from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class SimpleHTMLGenerationRequest(BaseModel):
    """Simple request schema for HTML generation with video path and playback speed"""
    video_path: str  # Absolute path to the temporary ISL video file
    playback_speed: float = Field(default=1.0, ge=0.25, le=4.0, description="Playback speed multiplier (0.25x to 4.0x)")
    show_text: bool = Field(default=True, description="Whether to show text messages in HTML")
    text_messages: Optional[List[Dict[str, str]]] = Field(default=None, description="List of text messages in different languages")


class HTMLGenerationResponse(BaseModel):
    """Response schema for HTML generation"""
    success: bool
    html_path: Optional[str] = None
    video_path: Optional[str] = None
    message: str
    error: Optional[str] = None