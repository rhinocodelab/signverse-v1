"""
Translation API endpoints
Handles multilingual text translation using Google Cloud Translation
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.schemas.translation import (
    TranslationRequest,
    MultilingualTranslationResponse,
    SupportedLanguagesResponse,
    SupportedLanguage
)
from app.services.translation_service import translation_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "/translate",
    response_model=MultilingualTranslationResponse,
    status_code=status.HTTP_200_OK,
    summary="Translate text to multiple languages",
    description="Translate source text to multiple target languages using Google Cloud Translation"
)
async def translate_text(request: TranslationRequest) -> MultilingualTranslationResponse:
    """
    Translate text from source language to multiple target languages
    
    Args:
        request: Translation request containing source text, source language, and target languages
    
    Returns:
        MultilingualTranslationResponse with translations for each target language
    """
    try:
        logger.info(f"Translation request: {request.source_language_code} -> {request.target_language_codes}")
        
        # Call the translation service
        result = translation_service.translate_text(
            text=request.source_text,
            source_language_code=request.source_language_code,
            target_language_codes=request.target_language_codes
        )
        
        # Check if translation was successful
        if result["status"] == "error":
            logger.error(f"Translation failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Translation failed: {result.get('error', 'Unknown error')}"
            )
        
        logger.info(f"Translation completed successfully for {len(result['translations'])} languages")
        return MultilingualTranslationResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in translation endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/supported-languages",
    response_model=SupportedLanguagesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get supported languages",
    description="Get list of all supported languages for translation"
)
async def get_supported_languages() -> SupportedLanguagesResponse:
    """
    Get list of all supported languages for translation
    
    Returns:
        SupportedLanguagesResponse with list of supported languages
    """
    try:
        logger.info("Fetching supported languages")
        
        # Get supported languages from the service
        languages_data = translation_service.get_supported_languages()
        
        if not languages_data:
            logger.warning("No supported languages returned from service")
            return SupportedLanguagesResponse(
                languages=[],
                total_count=0
            )
        
        # Convert to SupportedLanguage objects
        languages = [
            SupportedLanguage(**lang_data) for lang_data in languages_data
        ]
        
        logger.info(f"Retrieved {len(languages)} supported languages")
        return SupportedLanguagesResponse(
            languages=languages,
            total_count=len(languages)
        )
        
    except Exception as e:
        logger.error(f"Error fetching supported languages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch supported languages: {str(e)}"
        )


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Translation service health check",
    description="Check if the translation service is working properly"
)
async def translation_health_check():
    """
    Health check for the translation service
    
    Returns:
        Status of the translation service
    """
    try:
        # Try to get supported languages as a health check
        languages = translation_service.get_supported_languages()
        
        if languages:
            return {
                "status": "healthy",
                "message": "Translation service is working properly",
                "supported_languages_count": len(languages)
            }
        else:
            return {
                "status": "warning",
                "message": "Translation service is running but no languages returned",
                "supported_languages_count": 0
            }
            
    except Exception as e:
        logger.error(f"Translation service health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "message": f"Translation service error: {str(e)}",
            "supported_languages_count": 0
        }
