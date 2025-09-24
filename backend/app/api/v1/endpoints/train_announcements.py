from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.database import get_db
from app.schemas.train_announcement import (
    TrainAnnouncementRequest,
    TrainAnnouncementResponse,
    TemplateSubstitutionRequest,
    TemplateSubstitutionResponse
)
from app.services.train_announcement_service import get_train_announcement_service
from app.api.v1.endpoints.isl_video_generation import generate_isl_video, VideoGenerationRequest

router = APIRouter()


@router.post("/generate", response_model=TrainAnnouncementResponse)
async def generate_train_announcement(
    request: TrainAnnouncementRequest,
    db: AsyncSession = Depends(get_db)
) -> TrainAnnouncementResponse:
    """
    Generate a complete train announcement with ISL video
    
    This endpoint:
    1. Fetches the appropriate announcement template
    2. Substitutes train-specific data into the template
    3. Creates a general announcement record
    4. Generates ISL video from the announcement text
    5. Updates the announcement with video path
    """
    try:
        # Get the train announcement service
        service = get_train_announcement_service(db)
        
        # Step 1: Generate the announcement text and create record
        announcement_response = await service.generate_train_announcement(request)
        
        if not announcement_response.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=announcement_response.error
            )

        # Step 2: Generate ISL video
        try:
            video_request = VideoGenerationRequest(
                text=announcement_response.generated_text,
                model=request.model,
                user_id=request.user_id
            )
            
            video_response = await generate_isl_video(video_request)
            
            if video_response.success:
                # Update the announcement response with video information
                announcement_response.temp_video_id = video_response.temp_video_id
                announcement_response.preview_url = video_response.preview_url
                announcement_response.signs_used = video_response.signs_used
                announcement_response.signs_skipped = video_response.signs_skipped
                
                # TODO: Save the final video and update announcement record with video path
                # This would require calling the save endpoint and updating the general announcement
                
            else:
                # Video generation failed, but announcement text was created
                announcement_response.error = f"Announcement created but video generation failed: {video_response.error}"
                
        except Exception as video_error:
            # Video generation failed, but announcement text was created
            announcement_response.error = f"Announcement created but video generation failed: {str(video_error)}"
        
        return announcement_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/substitute-template", response_model=TemplateSubstitutionResponse)
async def substitute_template_placeholders(
    request: TemplateSubstitutionRequest,
    db: AsyncSession = Depends(get_db)
) -> TemplateSubstitutionResponse:
    """
    Test template placeholder substitution without creating announcement
    """
    try:
        service = get_train_announcement_service(db)
        
        result = service._substitute_template_placeholders(
            request.template_text,
            request.train_number,
            request.train_name,
            request.from_station_name,
            request.to_station_name,
            request.platform
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Template substitution error: {str(e)}"
        )


@router.get("/categories")
async def get_available_categories(
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Get all available announcement categories for train announcements
    """
    try:
        service = get_train_announcement_service(db)
        categories = await service.get_available_categories()
        
        return {"categories": categories}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch categories: {str(e)}"
        )


@router.get("/supported-models")
async def get_supported_models() -> dict:
    """
    Get supported AI models for ISL video generation
    """
    return {
        "supported_models": ["male", "female"],
        "description": "AI models for ISL video generation"
    }