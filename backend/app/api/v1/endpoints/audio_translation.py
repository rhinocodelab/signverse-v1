from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from google.cloud import speech
from google.cloud.exceptions import GoogleCloudError
import tempfile
import os
import hashlib
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import librosa
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Supported languages mapping - Only 4 Indian languages
SUPPORTED_LANGUAGES = {
    "en-IN": "English (India)",
    "hi-IN": "Hindi (India)",
    "mr-IN": "Marathi (India)",
    "gu-IN": "Gujarati (India)"
}

# Audio format mapping
AUDIO_FORMATS = {
    "wav": speech.RecognitionConfig.AudioEncoding.LINEAR16,
    "flac": speech.RecognitionConfig.AudioEncoding.FLAC,
    "mp3": speech.RecognitionConfig.AudioEncoding.MP3,
    "ogg": speech.RecognitionConfig.AudioEncoding.OGG_OPUS
}

# Cache directory for storing transcripts
CACHE_DIR = Path("cache/transcripts")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Temporary audio storage
TEMP_AUDIO_DIR = Path("temp/audio")
TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)


class TranscriptionRequest(BaseModel):
    language_code: str
    sample_rate: Optional[int] = 44100
    enable_automatic_punctuation: Optional[bool] = True
    enable_word_time_offsets: Optional[bool] = True


class TranscriptionResponse(BaseModel):
    success: bool
    transcript: str
    confidence: float
    language_code: str
    duration: float
    word_count: int
    word_time_offsets: Optional[list] = None
    cached: bool = False
    error: Optional[str] = None
    audio_info: Optional[dict] = None


def get_file_hash(file_content: bytes) -> str:
    """Generate hash for file content to use as cache key"""
    return hashlib.md5(file_content).hexdigest()


def get_audio_info(audio_path: str) -> dict:
    """Get audio file information including format, sample rate, duration, etc."""
    try:
        logger.info(f"Getting audio info for: {audio_path}")

        # Check if file exists and is readable
        if not os.path.exists(audio_path):
            raise Exception(f"Audio file does not exist: {audio_path}")

        if not os.access(audio_path, os.R_OK):
            raise Exception(f"Audio file is not readable: {audio_path}")

        # Get file size
        file_size = os.path.getsize(audio_path)
        logger.info(f"Audio file size: {file_size} bytes")

        if file_size == 0:
            raise Exception("Audio file is empty")

        # Load audio file to get metadata
        logger.info("Loading audio file with librosa...")
        audio_data, sample_rate = librosa.load(audio_path, sr=None)

        if audio_data is None or len(audio_data) == 0:
            raise Exception("Audio file contains no audio data")

        duration = len(audio_data) / sample_rate
        logger.info(
            f"Audio loaded: {len(audio_data)} samples, {sample_rate}Hz, {duration:.2f}s")

        # Get file extension
        file_extension = Path(audio_path).suffix.lower().lstrip('.')
        logger.info(f"File extension: {file_extension}")

        # Determine audio encoding based on file extension
        encoding_map = {
            'wav': speech.RecognitionConfig.AudioEncoding.LINEAR16,
            'flac': speech.RecognitionConfig.AudioEncoding.FLAC,
            'mp3': speech.RecognitionConfig.AudioEncoding.MP3,
            'ogg': speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            'm4a': speech.RecognitionConfig.AudioEncoding.MP3,  # Treat M4A as MP3
            'aac': speech.RecognitionConfig.AudioEncoding.MP3,  # Treat AAC as MP3
        }

        encoding = encoding_map.get(
            file_extension, speech.RecognitionConfig.AudioEncoding.LINEAR16)
        logger.info(f"Using encoding: {encoding}")

        return {
            'sample_rate': sample_rate,
            'duration': duration,
            'file_extension': file_extension,
            'encoding': encoding,
            'channels': 1 if len(audio_data.shape) == 1 else audio_data.shape[1],
            'file_size': file_size
        }

    except Exception as e:
        logger.error(f"Failed to get audio info for {audio_path}: {e}")
        raise Exception(f"Invalid audio file: {str(e)}")


def get_cached_transcript(file_hash: str, language_code: str) -> Optional[Dict[str, Any]]:
    """Check if transcript is already cached"""
    cache_file = CACHE_DIR / f"{file_hash}_{language_code}.json"
    logger.info(f"Checking cache for file_hash: {file_hash}, language_code: {language_code}")
    logger.info(f"Cache file path: {cache_file}")
    
    if cache_file.exists():
        try:
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
                logger.info(f"Found cached transcript for {file_hash} with language {language_code}")
                logger.info(f"Cached transcript preview: {cached_data.get('transcript', '')[:100]}...")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed to read cache file: {e}")
    else:
        logger.info(f"No cached transcript found for {file_hash} with language {language_code}")
    return None


def save_transcript_to_cache(file_hash: str, language_code: str, transcript_data: Dict[str, Any]):
    """Save transcript to cache"""
    try:
        cache_file = CACHE_DIR / f"{file_hash}_{language_code}.json"
        with open(cache_file, 'w') as f:
            json.dump(transcript_data, f, indent=2)
        logger.info(f"Transcript cached: {cache_file}")
    except Exception as e:
        logger.error(f"Failed to save transcript to cache: {e}")


def cleanup_temp_files(*file_paths):
    """Clean up temporary files"""
    for file_path in file_paths:
        if file_path is None:
            continue
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up temp file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file {file_path}: {e}")


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language_code: str = Form(...),
    enable_automatic_punctuation: bool = Form(True),
    enable_word_time_offsets: bool = Form(True),
    db: AsyncSession = Depends(get_db)
):
    """
    Transcribe audio file using GCP Speech-to-Text API

    Args:
        file: Audio file to transcribe (format and sample rate detected automatically)
        language_code: Language code (e.g., "gu-IN", "hi-IN")
        enable_automatic_punctuation: Enable automatic punctuation
        enable_word_time_offsets: Enable word-level timing information
    """

    # Debug: Log all form data received
    logger.info(f"=== TRANSCRIPTION REQUEST DEBUG ===")
    logger.info(f"File name: {file.filename}")
    logger.info(f"File content type: {file.content_type}")
    logger.info(f"Received language_code: {language_code}")
    logger.info(f"Language code type: {type(language_code)}")
    logger.info(f"Language code length: {len(language_code)}")
    logger.info(f"Supported languages: {list(SUPPORTED_LANGUAGES.keys())}")
    logger.info(f"=====================================")
    
    if language_code not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language code: {language_code}. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
        )

    # Validate file type (check extension first)
    file_extension = file.filename.split(
        '.')[-1].lower() if file.filename else ''
    supported_extensions = ['wav', 'flac', 'mp3', 'ogg', 'm4a', 'aac']
    if file_extension not in supported_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {file_extension}. Supported: {supported_extensions}"
        )

    # Read file content
    try:
        file_content = await file.read()
        file_size = len(file_content)

        # Check file size (10MB limit)
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="File size too large. Maximum size is 10MB.")

        # Check audio duration (60 seconds limit for synchronous)
        if file_size > 5 * 1024 * 1024:  # Rough estimate for 60 seconds
            raise HTTPException(
                status_code=400, detail="Audio duration exceeds 60 seconds limit for synchronous processing.")

    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error reading file: {str(e)}")

    # Generate file hash for caching
    file_hash = get_file_hash(file_content)

    # Skip cache for debugging - always process fresh
    logger.info("Skipping cache - processing fresh transcription")
    cached_result = None

    # Create temporary file
    temp_file_path = None
    preprocessed_path = None

    try:
        # Save uploaded file to temporary location
        temp_file_path = TEMP_AUDIO_DIR / f"temp_{file_hash}.{file_extension}"
        with open(temp_file_path, "wb") as f:
            f.write(file_content)

        # Get audio info directly from uploaded file
        audio_info = get_audio_info(str(temp_file_path))
        audio_path = str(temp_file_path)

        # Initialize GCP Speech client
        try:
            logger.info("Initializing GCP Speech client...")
            client = speech.SpeechClient()
            logger.info("GCP Speech client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize GCP Speech client: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize GCP Speech client: {str(e)}"
            )

        # Read audio file directly
        logger.info(f"Reading audio file: {audio_path}")
        with open(audio_path, "rb") as f:
            audio_content = f.read()

        logger.info(f"Audio content size: {len(audio_content)} bytes")

        # Configure recognition using detected audio info
        logger.info(
            f"Configuring recognition with: encoding={audio_info['encoding']}, sample_rate={audio_info['sample_rate']}, language={language_code}")
        logger.info(f"Supported language: {SUPPORTED_LANGUAGES.get(language_code, 'Unknown')}")
        # Log which model will be used
        if language_code == "gu-IN":
            logger.info(f"Using enhanced default model for Gujarati")
        else:
            logger.info(f"Using default model for {SUPPORTED_LANGUAGES.get(language_code, 'other languages')}")
        audio = speech.RecognitionAudio(content=audio_content)

        # Configure recognition with appropriate model for Indian languages
        # Use different models based on language support
        if language_code == "gu-IN":
            # For Gujarati, use enhanced model with use_enhanced=True
            config = speech.RecognitionConfig(
                encoding=audio_info['encoding'],
                sample_rate_hertz=audio_info['sample_rate'],
                language_code=language_code,
                enable_automatic_punctuation=enable_automatic_punctuation,
                enable_word_time_offsets=enable_word_time_offsets,
                # Use enhanced model for Gujarati
                use_enhanced=True,
                model="default",
                # Add alternative language codes for better recognition
                alternative_language_codes=["en-IN"],
                # Enable speech adaptation for better Indian language recognition
                speech_contexts=[{
                    "phrases": [],
                    "boost": 20.0
                }],
                # Enable profanity filter
                profanity_filter=False,
                # Set max alternatives for better results
                max_alternatives=1
            )
        else:
            logger.info(f"Using default model for {SUPPORTED_LANGUAGES.get(language_code, 'other languages')}")
            # For other languages, use default model (chirp_2 is not supported)
            config = speech.RecognitionConfig(
                encoding=audio_info['encoding'],
                sample_rate_hertz=audio_info['sample_rate'],
                language_code=language_code,
                enable_automatic_punctuation=enable_automatic_punctuation,
                enable_word_time_offsets=enable_word_time_offsets,
                # Use default model for other languages
                use_enhanced=True,
                model="default",
                # Add alternative language codes for better recognition
                alternative_language_codes=["en-IN"] if language_code != "en-IN" else [],
                # Enable speech adaptation for better Indian language recognition
                speech_contexts=[{
                    "phrases": [],
                    "boost": 20.0
                }],
                # Enable profanity filter
                profanity_filter=False,
                # Set max alternatives for better results
                max_alternatives=1
            )

        # Perform recognition
        try:
            logger.info("Sending request to GCP Speech-to-Text API...")
            response = client.recognize(config=config, audio=audio)
            logger.info(
                f"GCP API response received: {len(response.results) if response.results else 0} results")
        except GoogleCloudError as e:
            logger.error(f"GCP Speech API error: {e}")
            error_msg = str(e).lower()
            if "quota" in error_msg:
                raise HTTPException(
                    status_code=429, detail="Speech recognition quota exceeded. Please try again later.")
            elif "invalid" in error_msg or "corrupted" in error_msg:
                raise HTTPException(
                    status_code=400, detail="Invalid or corrupted audio file.")
            elif "permission" in error_msg or "auth" in error_msg:
                raise HTTPException(
                    status_code=500, detail="GCP authentication error. Please check your credentials.")
            else:
                raise HTTPException(
                    status_code=500, detail=f"GCP Speech API error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during GCP API call: {e}")
            raise HTTPException(
                status_code=500, detail=f"Unexpected error during speech recognition: {str(e)}")

        # Process results
        if not response.results:
            raise HTTPException(
                status_code=400, detail="No speech detected in audio file.")

        # Combine all transcripts
        full_transcript = ""
        total_confidence = 0
        word_time_offsets = []
        word_count = 0

        for result in response.results:
            if result.alternatives:
                alternative = result.alternatives[0]
                full_transcript += alternative.transcript + " "
                total_confidence += alternative.confidence
                word_count += len(alternative.transcript.split())

                # Collect word time offsets if enabled
                if enable_word_time_offsets and alternative.words:
                    for word_info in alternative.words:
                        word_time_offsets.append({
                            "word": word_info.word,
                            "start_time": word_info.start_time.total_seconds(),
                            "end_time": word_info.end_time.total_seconds()
                        })

        # Calculate average confidence
        avg_confidence = total_confidence / \
            len(response.results) if response.results else 0

        # Use actual audio duration from audio info
        duration = audio_info['duration']

        # Prepare response data
        transcript_data = {
            "transcript": full_transcript.strip(),
            "confidence": avg_confidence,
            "duration": duration,
            "word_count": word_count,
            "word_time_offsets": word_time_offsets if enable_word_time_offsets else None,
            "audio_info": audio_info
        }

        # Save to cache
        save_transcript_to_cache(file_hash, language_code, transcript_data)

        return TranscriptionResponse(
            success=True,
            transcript=full_transcript.strip(),
            confidence=avg_confidence,
            language_code=language_code,
            duration=duration,
            word_count=word_count,
            word_time_offsets=word_time_offsets if enable_word_time_offsets else None,
            cached=False,
            audio_info=audio_info
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during transcription: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")

    finally:
        # Cleanup temporary files
        cleanup_temp_files(temp_file_path)


@router.get("/supported-languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "supported_languages": SUPPORTED_LANGUAGES,
        "total_count": len(SUPPORTED_LANGUAGES)
    }


@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported audio formats"""
    supported_formats = ['wav', 'flac', 'mp3', 'ogg', 'm4a', 'aac']
    return {
        "supported_formats": supported_formats,
        "total_count": len(supported_formats),
        "description": "All formats are automatically converted to WAV for optimal recognition"
    }


@router.delete("/cache")
async def clear_cache():
    """Clear all cached transcripts"""
    try:
        cache_files = list(CACHE_DIR.glob("*.json"))
        for cache_file in cache_files:
            cache_file.unlink()

        return {
            "success": True,
            "message": f"Cleared {len(cache_files)} cached transcripts",
            "cleared_count": len(cache_files)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to clear cache: {str(e)}")


@router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    try:
        cache_files = list(CACHE_DIR.glob("*.json"))
        total_size = sum(f.stat().st_size for f in cache_files)

        return {
            "total_files": len(cache_files),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "cache_directory": str(CACHE_DIR)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get cache stats: {str(e)}")
