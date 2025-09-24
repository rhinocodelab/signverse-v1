from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from app.models.announcement_template import AnnouncementTemplateModel
from app.schemas.announcement_template import (
    AnnouncementTemplateCreate,
    AnnouncementTemplateUpdate,
    AnnouncementTemplateSearch
)


class AnnouncementTemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_template(self, template_id: int) -> Optional[AnnouncementTemplateModel]:
        """Get a specific template by ID"""
        result = await self.db.execute(
            select(AnnouncementTemplateModel).where(AnnouncementTemplateModel.id == template_id)
        )
        return result.scalar_one_or_none()

    async def get_all_templates(self) -> List[AnnouncementTemplateModel]:
        """Get all templates"""
        result = await self.db.execute(
            select(AnnouncementTemplateModel).order_by(AnnouncementTemplateModel.created_at.desc())
        )
        return result.scalars().all()

    async def search_templates(self, search_params: AnnouncementTemplateSearch) -> List[AnnouncementTemplateModel]:
        """Search templates with filters"""
        query = select(AnnouncementTemplateModel)

        # Filter by category
        if search_params.template_category:
            query = query.where(AnnouncementTemplateModel.template_category == search_params.template_category)


        # Search by text
        if search_params.search_text:
            search_term = f"%{search_params.search_text}%"
            query = query.where(
                or_(
                    AnnouncementTemplateModel.template_category.ilike(search_term),
                    AnnouncementTemplateModel.template_text_english.ilike(search_term),
                    AnnouncementTemplateModel.template_text_hindi.ilike(search_term),
                    AnnouncementTemplateModel.template_text_gujarati.ilike(search_term),
                    AnnouncementTemplateModel.template_text_marathi.ilike(search_term)
                )
            )

        # Order by creation date (newest first)
        query = query.order_by(AnnouncementTemplateModel.created_at.desc())

        # Apply pagination
        offset = (search_params.page - 1) * search_params.limit
        query = query.offset(offset).limit(search_params.limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_templates(self, search_params: AnnouncementTemplateSearch) -> int:
        """Count templates with filters (without pagination)"""
        query = select(func.count(AnnouncementTemplateModel.id))

        # Filter by category
        if search_params.template_category:
            query = query.where(AnnouncementTemplateModel.template_category == search_params.template_category)


        # Search by text
        if search_params.search_text:
            search_term = f"%{search_params.search_text}%"
            query = query.where(
                or_(
                    AnnouncementTemplateModel.template_category.ilike(search_term),
                    AnnouncementTemplateModel.template_text_english.ilike(search_term),
                    AnnouncementTemplateModel.template_text_hindi.ilike(search_term),
                    AnnouncementTemplateModel.template_text_gujarati.ilike(search_term),
                    AnnouncementTemplateModel.template_text_marathi.ilike(search_term)
                )
            )

        result = await self.db.execute(query)
        return result.scalar()

    async def create_template(self, template_data: AnnouncementTemplateCreate) -> AnnouncementTemplateModel:
        """Create a new template"""
        db_template = AnnouncementTemplateModel(**template_data.dict())
        self.db.add(db_template)
        await self.db.commit()
        await self.db.refresh(db_template)
        return db_template

    async def update_template(self, template_id: int, template_update: AnnouncementTemplateUpdate) -> Optional[AnnouncementTemplateModel]:
        """Update template"""
        db_template = await self.get_template(template_id)
        if not db_template:
            return None

        update_data = template_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_template, field, value)

        await self.db.commit()
        await self.db.refresh(db_template)
        return db_template

    async def delete_template(self, template_id: int) -> bool:
        """Hard delete template (permanently remove)"""
        db_template = await self.get_template(template_id)
        if not db_template:
            return False

        await self.db.delete(db_template)
        await self.db.commit()
        return True


    async def get_template_statistics(self) -> dict:
        """Get template statistics"""
        # Total templates
        total_result = await self.db.execute(select(func.count(AnnouncementTemplateModel.id)))
        total_templates = total_result.scalar()

        # Templates by category
        category_result = await self.db.execute(
            select(
                AnnouncementTemplateModel.template_category,
                func.count(AnnouncementTemplateModel.id)
            ).group_by(AnnouncementTemplateModel.template_category)
        )
        templates_by_category = dict(category_result.fetchall())

        return {
            "total_templates": total_templates,
            "templates_by_category": templates_by_category
        }

    async def get_categories(self) -> List[str]:
        """Get all unique categories"""
        result = await self.db.execute(
            select(AnnouncementTemplateModel.template_category).distinct()
        )
        return [row[0] for row in result.fetchall()]


def get_announcement_template_service(db: AsyncSession) -> AnnouncementTemplateService:
    """Dependency to get announcement template service"""
    return AnnouncementTemplateService(db)