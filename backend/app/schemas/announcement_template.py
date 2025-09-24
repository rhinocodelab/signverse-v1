from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AnnouncementTemplateBase(BaseModel):
    template_category: str = Field(..., min_length=1, max_length=100, description="Template category")
    template_text_english: str = Field(..., min_length=1, description="Template text in English")
    template_text_hindi: Optional[str] = Field(None, description="Template text in Hindi")
    template_text_marathi: Optional[str] = Field(None, description="Template text in Marathi")
    template_text_gujarati: Optional[str] = Field(None, description="Template text in Gujarati")


class AnnouncementTemplateCreate(AnnouncementTemplateBase):
    pass


class AnnouncementTemplateUpdate(BaseModel):
    template_category: Optional[str] = Field(None, min_length=1, max_length=100, description="Template category")
    template_text_english: Optional[str] = Field(None, min_length=1, description="Template text in English")
    template_text_hindi: Optional[str] = Field(None, description="Template text in Hindi")
    template_text_marathi: Optional[str] = Field(None, description="Template text in Marathi")
    template_text_gujarati: Optional[str] = Field(None, description="Template text in Gujarati")


class AnnouncementTemplate(AnnouncementTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnnouncementTemplateSearch(BaseModel):
    search_text: Optional[str] = None
    template_category: Optional[str] = None
    page: int = Field(1, ge=1)
    limit: int = Field(10, ge=1, le=100)


class AnnouncementTemplateListResponse(BaseModel):
    templates: list[AnnouncementTemplate]
    total_count: int
    page: int
    limit: int


class AnnouncementTemplateStatistics(BaseModel):
    total_templates: int
    templates_by_category: dict[str, int]