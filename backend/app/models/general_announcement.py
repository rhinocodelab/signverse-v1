from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.database import Base


class GeneralAnnouncement(Base):
    __tablename__ = "general_announcements"

    id = Column(Integer, primary_key=True, index=True)
    announcement_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    model = Column(String(20), nullable=False, index=True)  # 'male' or 'female'
    isl_video_path = Column(String(500), nullable=True)  # Path to generated ISL video
    announcement_text_english = Column(Text, nullable=False)
    announcement_text_hindi = Column(Text, nullable=True)
    announcement_text_gujarati = Column(Text, nullable=True)
    announcement_text_marathi = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)