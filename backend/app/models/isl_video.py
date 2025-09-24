from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base


class ISLVideo(Base):
    __tablename__ = "isl_videos"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False, index=True)
    display_name = Column(String(255), nullable=False, index=True)
    video_path = Column(String(500), nullable=False, unique=True, index=True)
    file_size = Column(Integer, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    model_type = Column(String(20), nullable=False,
                        index=True)  # 'male' or 'female'
    mime_type = Column(String(100), nullable=False, default="video/mp4")
    file_extension = Column(String(10), nullable=False, default="mp4")
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)
    content_type = Column(String(100), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(
    ), onupdate=func.now(), nullable=False)
