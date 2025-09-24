from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float
from sqlalchemy.sql import func
from app.db.database import Base


class ISLAnnouncement(Base):
    __tablename__ = "isl_announcements"

    id = Column(Integer, primary_key=True, index=True)
    announcement_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    model = Column(String(20), nullable=False, index=True)  # 'male' or 'female'
    
    # Text content
    announcement_text_english = Column(Text, nullable=False)
    announcement_text_hindi = Column(Text, nullable=True)
    announcement_text_gujarati = Column(Text, nullable=True)
    announcement_text_marathi = Column(Text, nullable=True)
    
    # Video information
    temp_video_id = Column(String(100), nullable=True, index=True)  # Temporary video ID
    preview_url = Column(String(500), nullable=True)  # Preview URL for temporary video
    final_video_path = Column(String(500), nullable=True)  # Final saved video path
    final_video_url = Column(String(500), nullable=True)  # Final video URL
    
    # Video generation details
    video_duration = Column(Float, nullable=True)  # Video duration in seconds
    signs_used = Column(Text, nullable=True)  # JSON string of signs used
    signs_skipped = Column(Text, nullable=True)  # JSON string of signs skipped
    video_generation_status = Column(String(50), nullable=False, default='pending', index=True)  # pending, generating, completed, failed
    
    # User information
    user_id = Column(Integer, nullable=False, index=True)
    
    # Status and metadata
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    is_saved = Column(Boolean, nullable=False, default=False, index=True)  # Whether video is saved permanently
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
