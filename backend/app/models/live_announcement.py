from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float
from sqlalchemy.sql import func
from app.db.database import Base


class LiveAnnouncement(Base):
    __tablename__ = "live_announcements"

    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(String(36), unique=True, nullable=False, index=True)  # UUID
    train_number = Column(String(50), nullable=False, index=True)
    train_name = Column(String(255), nullable=False)
    from_station = Column(String(255), nullable=False, index=True)
    to_station = Column(String(255), nullable=False, index=True)
    platform_number = Column(Integer, nullable=False)
    announcement_category = Column(String(100), nullable=False, index=True)
    ai_avatar_model = Column(String(20), nullable=False, index=True)  # 'male' or 'female'
    status = Column(String(50), nullable=False, index=True)  # received, processing, generating_video, completed, error
    message = Column(Text, nullable=False)
    progress_percentage = Column(Integer, nullable=True)
    video_url = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)