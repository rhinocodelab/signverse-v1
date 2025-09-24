from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base


class AnnouncementTemplateModel(Base):
    __tablename__ = "announcement_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_category = Column(String(100), nullable=False, index=True)
    template_text_english = Column(Text, nullable=False)
    template_text_hindi = Column(Text, nullable=True)
    template_text_marathi = Column(Text, nullable=True)
    template_text_gujarati = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)