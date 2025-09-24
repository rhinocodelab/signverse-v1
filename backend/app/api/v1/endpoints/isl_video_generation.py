"""
ISL Video Generation API endpoints
Handles text-to-ISL video generation by stitching individual sign videos
"""

from fastapi import APIRouter, HTTPException, Depends, Form
from fastapi.responses import FileResponse
import os
import subprocess
import uuid
import shutil
import logging
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Directory paths
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent.parent
FRONTEND_VIDEOS_DIR = PROJECT_ROOT / "frontend" / "public" / "videos" / "isl"
TEMP_VIDEOS_DIR = PROJECT_ROOT / "frontend" / "public" / "temp" / "videos"
FINAL_VIDEOS_DIR = PROJECT_ROOT / "backend" / "uploads" / "isl-videos"

# Ensure directories exist
TEMP_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
FINAL_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

# Supported models
SUPPORTED_MODELS = ["male", "female"]


class VideoGenerationRequest(BaseModel):
    text: str
    model: str  # "male" or "female"
    user_id: int


class VideoGenerationResponse(BaseModel):
    success: bool
    temp_video_id: str
    preview_url: str
    video_duration: Optional[float] = None
    signs_used: List[str]
    signs_skipped: List[str]
    error: Optional[str] = None


class VideoSaveRequest(BaseModel):
    temp_video_id: str
    user_id: int


class VideoSaveResponse(BaseModel):
    success: bool
    final_video_url: str
    video_id: str
    filename: str
    error: Optional[str] = None


def parse_text_to_signs(text: str) -> List[str]:
    """Parse text into individual words/signs, removing punctuation and normalizing"""
    import re

    # Clean and normalize text
    text = text.strip().lower()

    # Remove punctuation except spaces
    text = re.sub(r'[^\w\s]', '', text)

    # Split into words and filter out empty strings
    words = [word.strip() for word in text.split() if word.strip()]

    # Process each word to split multi-digit numbers into individual digits
    processed_words = []
    for word in words:
        # Check if word contains only digits
        if word.isdigit():
            # If it's a multi-digit number, split into individual digits
            if len(word) > 1:
                digits = list(word)
                processed_words.extend(digits)
                logger.info(
                    f"Split multi-digit number '{word}' into individual digits: {digits}")
            else:
                # Single digit, keep as is
                processed_words.append(word)
        else:
            # Not a number, keep as is
            processed_words.append(word)

    logger.info(
        f"Parsed text '{text}' into {len(processed_words)} signs: {processed_words}")
    return processed_words


def get_video_files_for_signs(signs: List[str], model: str) -> tuple[List[str], List[str]]:
    """Get video file paths for signs, return (found_signs, missing_signs)"""
    if model not in SUPPORTED_MODELS:
        raise ValueError(
            f"Unsupported model: {model}. Supported: {SUPPORTED_MODELS}")

    model_dir = FRONTEND_VIDEOS_DIR / f"{model}-model"
    if not model_dir.exists():
        raise FileNotFoundError(f"Model directory not found: {model_dir}")

    found_videos = []
    missing_signs = []

    for sign in signs:
        # Try different possible file paths and formats
        possible_files = [
            # Direct file in model directory
            model_dir / f"{sign}.mp4",
            model_dir / f"{sign}.MP4",
            model_dir / f"{sign}.avi",
            model_dir / f"{sign}.mov",
            # File in subdirectory (sign/sign.mp4)
            model_dir / sign / f"{sign}.mp4",
            model_dir / sign / f"{sign}.MP4",
            model_dir / sign / f"{sign}.avi",
            model_dir / sign / f"{sign}.mov"
        ]

        video_found = False
        for video_file in possible_files:
            if video_file.exists():
                found_videos.append(str(video_file))
                video_found = True
                logger.info(f"Found video for sign '{sign}': {video_file}")
                break

        if not video_found:
            missing_signs.append(sign)
            logger.warning(f"No video found for sign: {sign}")

    logger.info(
        f"Found {len(found_videos)} videos, missing {len(missing_signs)} signs")
    return found_videos, missing_signs


def create_ffmpeg_concat_command(video_files: List[str], output_path: str) -> List[str]:
    """Create FFmpeg command for concatenating videos"""
    if not video_files:
        raise ValueError("No video files provided for concatenation")

    # Create a temporary file list for FFmpeg
    file_list_path = output_path.replace('.mp4', '_filelist.txt')

    with open(file_list_path, 'w') as f:
        for video_file in video_files:
            # Escape single quotes and write file path
            escaped_path = video_file.replace("'", "'\"'\"'")
            f.write(f"file '{escaped_path}'\n")

    # FFmpeg command for concatenation
    cmd = [
        'ffmpeg',
        '-f', 'concat',
        '-safe', '0',
        '-i', file_list_path,
        '-c', 'copy',  # Copy streams without re-encoding
        '-y',  # Overwrite output file
        output_path
    ]

    logger.info(f"FFmpeg command: {' '.join(cmd)}")
    return cmd, file_list_path


def stitch_videos_with_ffmpeg(video_files: List[str], output_path: str) -> float:
    """Stitch videos using FFmpeg and return duration"""
    if not video_files:
        raise ValueError("No video files to stitch")

    if len(video_files) == 1:
        # Single video, just copy it
        shutil.copy2(video_files[0], output_path)
        logger.info(f"Copied single video to: {output_path}")

        # Get duration of single video
        duration = get_video_duration(video_files[0])
        return duration

    # Multiple videos, use FFmpeg concatenation
    cmd, file_list_path = create_ffmpeg_concat_command(
        video_files, output_path)

    try:
        logger.info("Starting FFmpeg video concatenation...")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg failed with return code {result.returncode}")
            logger.error(f"FFmpeg stderr: {result.stderr}")
            raise RuntimeError(f"FFmpeg concatenation failed: {result.stderr}")

        logger.info("FFmpeg concatenation completed successfully")

        # Clean up temporary file list
        if os.path.exists(file_list_path):
            os.remove(file_list_path)

        # Get duration of final video
        duration = get_video_duration(output_path)
        return duration

    except subprocess.TimeoutExpired:
        logger.error("FFmpeg process timed out")
        raise RuntimeError("Video processing timed out")
    except Exception as e:
        logger.error(f"FFmpeg error: {e}")
        raise RuntimeError(f"Video processing failed: {str(e)}")


def get_video_duration(video_path: str) -> float:
    """Get video duration using FFprobe"""
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            video_path
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30)

        if result.returncode == 0:
            duration = float(result.stdout.strip())
            logger.info(f"Video duration: {duration:.2f} seconds")
            return duration
        else:
            logger.warning(f"Could not get video duration: {result.stderr}")
            return 0.0

    except Exception as e:
        logger.warning(f"Error getting video duration: {e}")
        return 0.0


def cleanup_temp_video(temp_video_id: str):
    """Clean up temporary video file"""
    temp_file = TEMP_VIDEOS_DIR / f"{temp_video_id}.mp4"
    if temp_file.exists():
        try:
            temp_file.unlink()
            logger.info(f"Cleaned up temporary video: {temp_file}")
        except Exception as e:
            logger.warning(
                f"Failed to cleanup temp video {temp_video_id}: {e}")


@router.post("/generate", response_model=VideoGenerationResponse)
async def generate_isl_video(request: VideoGenerationRequest):
    """
    Generate ISL video by stitching individual sign videos

    Args:
        request: VideoGenerationRequest containing text, model, and user_id

    Returns:
        VideoGenerationResponse with temp video ID and preview URL
    """
    try:
        logger.info(
            f"Generating ISL video for text: '{request.text}', model: {request.model}")

        # Validate model
        if request.model not in SUPPORTED_MODELS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported model: {request.model}. Supported: {SUPPORTED_MODELS}"
            )

        # Validate text
        if not request.text or not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="Text cannot be empty"
            )

        # Parse text into signs
        signs = parse_text_to_signs(request.text)
        if not signs:
            raise HTTPException(
                status_code=400,
                detail="No valid signs found in text"
            )

        # Get video files for signs
        video_files, missing_signs = get_video_files_for_signs(
            signs, request.model)

        if not video_files:
            raise HTTPException(
                status_code=400,
                detail=f"No video files found for any signs. Missing: {missing_signs}"
            )

        # Generate unique temporary video ID
        temp_video_id = str(uuid.uuid4())
        temp_output_path = TEMP_VIDEOS_DIR / f"{temp_video_id}.mp4"

        # Stitch videos using FFmpeg
        logger.info(f"Stitching {len(video_files)} videos...")
        duration = stitch_videos_with_ffmpeg(
            video_files, str(temp_output_path))

        # Create preview URL
        preview_url = f"/isl-video-generation/preview/{temp_video_id}"

        logger.info(f"ISL video generated successfully: {temp_video_id}")

        return VideoGenerationResponse(
            success=True,
            temp_video_id=temp_video_id,
            preview_url=preview_url,
            video_duration=duration,
            signs_used=[Path(f).stem for f in video_files],
            signs_skipped=missing_signs
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Video generation failed: {str(e)}"
        )


@router.post("/generate-form", response_model=VideoGenerationResponse)
async def generate_isl_video_form(
    text: str = Form(...),
    model_type: str = Form(...),
    user_id: str = Form(...)
):
    """
    Generate ISL video by stitching individual sign videos (FormData version)

    Args:
        text: Text to convert to ISL video
        model_type: AI model type ("male" or "female")
        user_id: User ID for tracking

    Returns:
        VideoGenerationResponse with temp video ID and preview URL
    """
    try:
        logger.info(
            f"Form data received - text: '{text}', model_type: '{model_type}', user_id: '{user_id}'")

        # Validate model_type
        if model_type not in SUPPORTED_MODELS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model_type: '{model_type}'. Supported models: {SUPPORTED_MODELS}"
            )

        # Convert user_id to int
        try:
            user_id_int = int(user_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid user_id format"
            )

        # Create VideoGenerationRequest object
        request = VideoGenerationRequest(
            text=text,
            model=model_type,
            user_id=user_id_int
        )

        # Call the existing generate function
        return await generate_isl_video(request)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Form video generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Video generation failed: {str(e)}"
        )


@router.get("/preview/{video_id}")
async def get_preview_video(video_id: str):
    """Serve temporary video file for preview"""
    try:
        temp_file = TEMP_VIDEOS_DIR / f"{video_id}.mp4"

        if not temp_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Preview video not found or expired"
            )

        return FileResponse(
            path=str(temp_file),
            media_type="video/mp4",
            filename=f"isl_preview_{video_id}.mp4"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview video error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to serve preview video: {str(e)}"
        )


@router.post("/save", response_model=VideoSaveResponse)
async def save_isl_video(request: VideoSaveRequest):
    """
    Save temporary ISL video to permanent location

    Args:
        request: VideoSaveRequest containing temp_video_id and user_id

    Returns:
        VideoSaveResponse with final video URL and details
    """
    try:
        logger.info(
            f"Saving ISL video: {request.temp_video_id} for user: {request.user_id}")

        # Check if temporary video exists
        temp_file = TEMP_VIDEOS_DIR / f"{request.temp_video_id}.mp4"
        if not temp_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Temporary video not found or expired"
            )

        # Create user directory
        user_dir = FINAL_VIDEOS_DIR / f"user_{request.user_id}"
        user_dir.mkdir(parents=True, exist_ok=True)

        # Generate final filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        final_filename = f"isl_video_{timestamp}_{request.temp_video_id[:8]}.mp4"
        final_path = user_dir / final_filename

        # Move temporary file to permanent location
        shutil.move(str(temp_file), str(final_path))

        # Generate final video URL
        final_video_url = f"/api/v1/isl-videos/serve/{request.user_id}/{final_filename}"

        logger.info(f"ISL video saved successfully: {final_path}")

        return VideoSaveResponse(
            success=True,
            final_video_url=final_video_url,
            video_id=request.temp_video_id,
            filename=final_filename
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video save error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save video: {str(e)}"
        )


@router.get("/supported-models")
async def get_supported_models():
    """Get list of supported AI models"""
    return {
        "supported_models": SUPPORTED_MODELS,
        "total_count": len(SUPPORTED_MODELS),
        "description": "Available AI models for ISL video generation"
    }


@router.delete("/cleanup/{temp_video_id}")
async def cleanup_temp_video_endpoint(temp_video_id: str):
    """
    Clean up temporary ISL video file

    Args:
        temp_video_id: The temporary video ID to clean up

    Returns:
        Success message
    """
    try:
        cleanup_temp_video(temp_video_id)
        return {
            "success": True,
            "message": f"Temporary video {temp_video_id} cleaned up successfully"
        }
    except Exception as e:
        logger.error(f"Failed to cleanup temp video {temp_video_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cleanup temporary video: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for ISL video generation service"""
    try:
        # Check if FFmpeg is available
        result = subprocess.run(['ffmpeg', '-version'],
                                capture_output=True, text=True, timeout=10)
        ffmpeg_available = result.returncode == 0

        # Check directories
        directories_ok = (
            FRONTEND_VIDEOS_DIR.exists() and
            TEMP_VIDEOS_DIR.exists() and
            FINAL_VIDEOS_DIR.exists()
        )

        return {
            "status": "healthy" if ffmpeg_available and directories_ok else "error",
            "service": "isl-video-generation",
            "ffmpeg_available": ffmpeg_available,
            "directories_ok": directories_ok,
            "supported_models": len(SUPPORTED_MODELS),
            "frontend_videos_dir": str(FRONTEND_VIDEOS_DIR),
            "temp_videos_dir": str(TEMP_VIDEOS_DIR),
            "final_videos_dir": str(FINAL_VIDEOS_DIR)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Service unhealthy: {str(e)}"
        }


@router.delete("/cleanup-temp-videos")
async def cleanup_temp_videos():
    """
    Delete all temporary ISL videos from the temp directory
    """
    try:
        if not TEMP_VIDEOS_DIR.exists():
            logger.warning(f"Temp videos directory does not exist: {TEMP_VIDEOS_DIR}")
            return {"message": "Temp videos directory does not exist", "deleted_count": 0}
        
        deleted_count = 0
        for video_file in TEMP_VIDEOS_DIR.glob("*.mp4"):
            try:
                video_file.unlink()  # Delete the file
                deleted_count += 1
                logger.info(f"Deleted temp video: {video_file.name}")
            except Exception as e:
                logger.error(f"Failed to delete {video_file.name}: {str(e)}")
        
        logger.info(f"Cleanup completed. Deleted {deleted_count} temp videos")
        return {
            "message": f"Successfully deleted {deleted_count} temporary videos",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error during temp videos cleanup: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cleanup temp videos: {str(e)}"
        )
