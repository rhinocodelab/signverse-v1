from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.core.config import settings
from app.utils.credentials import credential_manager
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/status", response_model=Dict[str, Any])
async def get_credentials_status() -> Dict[str, Any]:
    """
    Get status of available credentials (development only)
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Credential status endpoint not available in production"
        )

    available_credentials = credential_manager.list_available_credentials()

    return {
        "status": "success",
        "available_credentials": available_credentials,
        "environment": settings.ENVIRONMENT,
        "note": "This endpoint is only available in development"
    }


@router.post("/test/{service_name}")
async def test_credential(service_name: str) -> Dict[str, Any]:
    """
    Test if a specific service credential is available (development only)
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Credential testing endpoint not available in production"
        )

    if service_name == "gcp":
        credential = credential_manager.get_gcp_credentials()
        if credential:
            return {
                "status": "success",
                "service": service_name,
                "message": "GCP credentials found",
                "project_id": credential.get("project_id", "unknown")
            }
        else:
            return {
                "status": "error",
                "service": service_name,
                "message": "GCP credentials not found"
            }
    else:
        api_key = credential_manager.get_api_key(service_name)
        if api_key:
            return {
                "status": "success",
                "service": service_name,
                "message": f"{service_name} API key found",
                "key_preview": f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
            }
        else:
            return {
                "status": "error",
                "service": service_name,
                "message": f"{service_name} API key not found"
            }
