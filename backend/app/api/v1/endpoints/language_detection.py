from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import os
import tempfile
import google.generativeai as genai
from pathlib import Path

from app.db.database import get_db
from app.core.config import settings

router = APIRouter()

# Configure Gemini API (will be configured when needed)


def configure_gemini():
    """Configure Gemini API with the API key"""
    if not settings.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not set. Please set it in your environment variables.")
    genai.configure(api_key=settings.GEMINI_API_KEY)


# Supported audio formats
SUPPORTED_AUDIO_FORMATS = {
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/wave": ".wav",
    "audio/mp3": ".mp3",
    "audio/mpeg": ".mp3",
    "audio/aiff": ".aiff",
    "audio/aac": ".aac",
    "audio/ogg": ".ogg",
    "audio/flac": ".flac"
}


def detect_language_from_audio(audio_path: str) -> str:
    """Detect language from audio file using Google Gemini API"""
    # Configure Gemini API
    configure_gemini()

    audio_file = Path(audio_path)
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file {audio_path} not found.")

    # Prompt to ask for language detection
    user_prompt = "Detect the spoken language in this audio. Reply only with the language name."

    try:
        # Use the correct API for current version of google-generativeai
        model = genai.GenerativeModel("gemini-2.0-flash-exp")

        # Upload the audio file
        audio_data = genai.upload_file(audio_file)

        # Generate content with the audio and prompt
        response = model.generate_content([audio_data, user_prompt])

        # Check if response is valid
        if not response or not response.text:
            raise Exception("No response received from language detection API")

        # Response.text should contain the language name
        detected_language = response.text.strip()

        # Validate that we got a reasonable response
        if len(detected_language) < 2 or len(detected_language) > 50:
            raise Exception(
                f"Invalid language detection result: {detected_language}")

        return detected_language

    except Exception as e:
        # Provide more specific error information
        error_msg = str(e)
        if "API key" in error_msg.lower():
            raise Exception("Invalid or missing Google Gemini API key")
        elif "quota" in error_msg.lower() or "limit" in error_msg.lower():
            raise Exception("API quota exceeded. Please try again later")
        elif "file" in error_msg.lower():
            raise Exception("Error processing audio file")
        else:
            raise Exception(f"Error detecting language: {error_msg}")


@router.post("/detect-language")
async def detect_language(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Detect language from uploaded audio file"""

    # Validate file type - check both MIME type and file extension
    allowed_extensions = ['.wav', '.mp3', '.aiff', '.aac', '.ogg', '.flac']
    
    # Get file extension
    file_extension = ''
    if file.filename:
        file_extension = '.' + file.filename.lower().split('.')[-1]
    
    # Check both MIME type and extension
    is_valid_mime_type = file.content_type in SUPPORTED_AUDIO_FORMATS
    is_valid_extension = file_extension in allowed_extensions
    
    # Debug logging
    print(f"Language detection validation debug: filename={file.filename}, content_type={file.content_type}, extension={file_extension}, valid_mime={is_valid_mime_type}, valid_ext={is_valid_extension}")
    
    if not is_valid_mime_type and not is_valid_extension:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Content type: {file.content_type}, Extension: {file_extension}. Supported formats: {list(SUPPORTED_AUDIO_FORMATS.keys())}"
        )

    # Validate file size (max 10MB)
    file_size = 0
    content = await file.read()
    file_size = len(content)

    if file_size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=400,
            detail="File size too large. Maximum size is 10MB."
        )

    # Create temporary file
    temp_file = None
    try:
        # Create temporary file with proper extension
        if file.content_type in SUPPORTED_AUDIO_FORMATS:
            file_extension = SUPPORTED_AUDIO_FORMATS[file.content_type]
        else:
            # Fallback to file extension
            file_extension = file_extension if file_extension else '.wav'
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Detect language
        detected_language = detect_language_from_audio(temp_file_path)

        return {
            "message": "Language detected successfully",
            "filename": file.filename,
            "file_size": file_size,
            "content_type": file.content_type,
            "detected_language": detected_language
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Language detection failed: {str(e)}")
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


@router.get("/supported-formats")
def get_supported_formats():
    """Get list of supported audio formats"""
    return {
        "supported_formats": list(SUPPORTED_AUDIO_FORMATS.keys()),
        "max_file_size_mb": 10
    }
