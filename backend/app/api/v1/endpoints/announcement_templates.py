from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.database import get_db
from app.schemas.announcement_template import (
    AnnouncementTemplate,
    AnnouncementTemplateCreate,
    AnnouncementTemplateUpdate,
    AnnouncementTemplateSearch,
    AnnouncementTemplateListResponse,
    AnnouncementTemplateStatistics
)
from app.services.announcement_template_service import get_announcement_template_service, AnnouncementTemplateService

router = APIRouter()


@router.get("/", response_model=AnnouncementTemplateListResponse)
async def get_announcement_templates(
    template_category: Optional[str] = Query(None, description="Filter by template category"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get all announcement templates with optional filtering and pagination"""
    try:
        announcement_template_service = get_announcement_template_service(db)
        
        # Create search parameters
        search_params = AnnouncementTemplateSearch(
            search_text=search,
            template_category=template_category,
            page=page,
            limit=limit
        )
        
        # Get templates
        templates = await announcement_template_service.search_templates(search_params)
        
        # Get total count for pagination
        total_count = await announcement_template_service.count_templates(search_params)
        
        return AnnouncementTemplateListResponse(
            templates=templates,
            total_count=total_count,
            page=page,
            limit=limit
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{template_id}", response_model=AnnouncementTemplate)
async def get_announcement_template(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific announcement template by ID"""
    try:
        announcement_template_service = get_announcement_template_service(db)
        template = await announcement_template_service.get_template(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return template
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/", response_model=AnnouncementTemplate)
async def create_announcement_template(
    template_data: AnnouncementTemplateCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new announcement template"""
    try:
        announcement_template_service = get_announcement_template_service(db)
        template = await announcement_template_service.create_template(template_data)
        
        return template
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create template: {str(e)}")


@router.put("/{template_id}", response_model=AnnouncementTemplate)
async def update_announcement_template(
    template_id: int,
    template_update: AnnouncementTemplateUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an announcement template"""
    try:
        announcement_template_service = get_announcement_template_service(db)
        template = await announcement_template_service.update_template(template_id, template_update)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return template
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update template: {str(e)}")


@router.delete("/{template_id}")
async def delete_announcement_template(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an announcement template (hard delete)"""
    try:
        announcement_template_service = get_announcement_template_service(db)
        success = await announcement_template_service.delete_template(template_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {"message": "Template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete template: {str(e)}")




@router.get("/statistics/overview", response_model=AnnouncementTemplateStatistics)
async def get_announcement_template_statistics(
    db: AsyncSession = Depends(get_db)
):
    """Get announcement template statistics"""
    try:
        announcement_template_service = get_announcement_template_service(db)
        statistics = await announcement_template_service.get_template_statistics()
        
        return AnnouncementTemplateStatistics(**statistics)
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/categories/list")
async def get_template_categories(
    db: AsyncSession = Depends(get_db)
):
    """Get all unique template categories"""
    try:
        announcement_template_service = get_announcement_template_service(db)
        categories = await announcement_template_service.get_categories()
        
        return {"categories": categories}
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")