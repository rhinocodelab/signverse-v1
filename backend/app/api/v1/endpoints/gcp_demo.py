from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List
from app.utils.gcp_client import gcp_client_manager
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/storage/buckets", response_model=Dict[str, Any])
async def list_storage_buckets() -> Dict[str, Any]:
    """
    List Google Cloud Storage buckets (demo endpoint)
    """
    try:
        storage_client = gcp_client_manager.get_storage_client()
        if not storage_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GCP Storage client not available"
            )

        buckets = list(storage_client.list_buckets())
        bucket_names = [bucket.name for bucket in buckets]

        return {
            "status": "success",
            "project": storage_client.project,
            "buckets": bucket_names,
            "count": len(bucket_names)
        }
    except Exception as e:
        logger.error(f"Failed to list storage buckets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list storage buckets: {str(e)}"
        )


@router.post("/translate", response_model=Dict[str, Any])
async def translate_text(
    text: str,
    target_language: str = "en",
    source_language: str = "auto"
) -> Dict[str, Any]:
    """
    Translate text using Google Cloud Translation API
    """
    try:
        translate_client = gcp_client_manager.get_translate_client()
        if not translate_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GCP Translation client not available"
            )

        result = translate_client.translate(
            text,
            target_language=target_language,
            source_language=source_language
        )

        return {
            "status": "success",
            "original_text": text,
            "translated_text": result['translatedText'],
            "source_language": result.get('detectedSourceLanguage', source_language),
            "target_language": target_language
        }
    except Exception as e:
        logger.error(f"Failed to translate text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )


@router.get("/project-info", response_model=Dict[str, Any])
async def get_project_info() -> Dict[str, Any]:
    """
    Get GCP project information
    """
    try:
        from app.utils.credentials import credential_manager

        gcp_creds = credential_manager.get_gcp_credentials()
        if not gcp_creds:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GCP credentials not available"
            )

        return {
            "status": "success",
            "project_id": gcp_creds.get("project_id"),
            "client_email": gcp_creds.get("client_email"),
            "service_account_type": gcp_creds.get("type"),
            "available_services": {
                "storage": gcp_client_manager.get_storage_client() is not None,
                "translate": gcp_client_manager.get_translate_client() is not None,
                "vision": gcp_client_manager.get_vision_client() is not None,
                "text_to_speech": gcp_client_manager.get_text_to_speech_client() is not None
            }
        }
    except Exception as e:
        logger.error(f"Failed to get project info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project info: {str(e)}"
        )
