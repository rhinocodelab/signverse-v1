import os
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.html_generation import SimpleHTMLGenerationRequest, HTMLGenerationResponse
from app.services.html_generation_service import HTMLGenerationService, get_html_generation_service

router = APIRouter()


@router.post("/generate-simple-html", response_model=HTMLGenerationResponse)
async def generate_html_page_endpoint(
    request: SimpleHTMLGenerationRequest,
    service: HTMLGenerationService = Depends(get_html_generation_service)
):
    """
    Generates an HTML page with the ISL video.
    Copies the video file to /var/www/html/isl.mp4 and generates index.html.
    """
    try:
        # Validate that the source video file exists
        if not os.path.exists(request.video_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video file not found: {request.video_path}"
            )
        
        # Generate HTML page
        result = await service.generate_html_page(request)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error or "Failed to generate HTML page"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/html-status", response_model=HTMLGenerationResponse)
async def get_html_status_endpoint():
    """
    Checks if the HTML page and video file exist in the web root.
    """
    html_file_path = "/var/www/html/index.html"
    video_file_path = "/var/www/html/isl.mp4"
    
    html_exists = os.path.exists(html_file_path)
    video_exists = os.path.exists(video_file_path)
    
    if html_exists and video_exists:
        return HTMLGenerationResponse(
            success=True,
            html_path=html_file_path,
            video_path=video_file_path,
            message="HTML page and video file exist"
        )
    else:
        missing_files = []
        if not html_exists:
            missing_files.append("index.html")
        if not video_exists:
            missing_files.append("isl.mp4")
        
        return HTMLGenerationResponse(
            success=False,
            message=f"Missing files: {', '.join(missing_files)}",
            error="Files not found"
        )