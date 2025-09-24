"""
Speech to ISL API endpoints
Handles speech-to-ISL conversion pipeline: Language Detection → Transcription → Translation → ISL Video Generation
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import os
import tempfile
import google.generativeai as genai
from pathlib import Path
import logging
import uuid
import shutil
import requests
import json

from app.db.database import get_db
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


def normalize_mime_type(content_type: str) -> str:
    """Normalize MIME type to handle codecs and other parameters"""
    if not content_type:
        return "audio/wav"  # Default fallback

    # Remove codecs and other parameters
    base_type = content_type.split(';')[0].strip()

    # Handle common variations
    if base_type == "audio/webm":
        return "audio/webm"
    elif base_type == "audio/ogg":
        return "audio/ogg"
    elif base_type == "audio/wav":
        return "audio/wav"
    elif base_type == "audio/mp4":
        return "audio/mp4"
    elif base_type == "audio/m4a":
        return "audio/m4a"

    return content_type  # Return original if no match


def convert_webm_to_wav(input_path: str, output_path: str) -> bool:
    """Convert WebM audio file to WAV format for better compatibility"""
    try:
        from pydub import AudioSegment

        logger.info(f"Converting WebM to WAV: {input_path} -> {output_path}")

        # Load WebM file
        audio = AudioSegment.from_file(input_path, format="webm")

        # Convert to WAV format (16-bit, mono, 16kHz for optimal speech processing)
        audio = audio.set_channels(1)  # Convert to mono
        audio = audio.set_frame_rate(16000)  # Set to 16kHz
        audio = audio.set_sample_width(2)  # 16-bit

        # Export as WAV
        audio.export(output_path, format="wav")

        logger.info(f"Successfully converted WebM to WAV: {output_path}")
        return True

    except Exception as e:
        logger.error(f"Failed to convert WebM to WAV: {e}")
        return False


def load_audio_with_pydub(file_path: str) -> tuple:
    """Load audio file using pydub (cleaner than librosa for WAV files)"""
    try:
        from pydub import AudioSegment
        import numpy as np

        logger.info(f"Loading audio with pydub: {file_path}")

        # Load audio file
        audio = AudioSegment.from_file(str(file_path))

        # Get audio properties
        sample_rate = audio.frame_rate
        # pydub duration is in milliseconds
        duration_seconds = len(audio) / 1000.0

        # Convert to numpy array for compatibility with existing code
        audio_data = np.array(audio.get_array_of_samples())

        # If stereo, convert to mono (take left channel)
        if audio.channels > 1:
            audio_data = audio_data[::audio.channels]

        logger.info(
            f"Audio loaded: {len(audio_data)} samples, {sample_rate}Hz, {duration_seconds:.2f}s")

        return audio_data, sample_rate

    except Exception as e:
        logger.error(f"Failed to load audio with pydub: {e}")
        raise Exception(f"Could not load audio file: {e}")


def detect_audio_format(file_path: str) -> str:
    """Detect the actual audio format of a file using file command or file header"""
    try:
        import subprocess
        result = subprocess.run(['file', file_path],
                                capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            output = result.stdout.lower()
            if 'webm' in output:
                return 'webm'
            elif 'wav' in output:
                return 'wav'
            elif 'ogg' in output:
                return 'ogg'
            elif 'mp4' in output:
                return 'mp4'
            elif 'm4a' in output:
                return 'm4a'
            elif 'mp3' in output:
                return 'mp3'
            elif 'flac' in output:
                return 'flac'
    except Exception as e:
        logger.warning(
            f"Could not detect file format using 'file' command: {e}")

    # Fallback: try to detect by reading file header
    try:
        with open(file_path, 'rb') as f:
            header = f.read(12)
            if header.startswith(b'RIFF') and b'WAVE' in header:
                return 'wav'
            elif header.startswith(b'OggS'):
                return 'ogg'
            elif header.startswith(b'\x1a\x45\xdf\xa3'):  # WebM/Matroska
                return 'webm'
            elif header.startswith(b'\xff\xfb') or header.startswith(b'ID3'):
                return 'mp3'
            elif header.startswith(b'fLaC'):
                return 'flac'
    except Exception as e:
        logger.warning(f"Could not detect file format by header: {e}")

    # Default fallback
    return 'wav'

# Configure Gemini API


def configure_gemini():
    """Configure Gemini API with the API key"""
    if not settings.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not set. Please set it in your environment variables.")
    genai.configure(api_key=settings.GEMINI_API_KEY)


# Supported audio formats for recorded audio
SUPPORTED_RECORDING_FORMATS = {
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "audio/webm;codecs=opus": ".webm",  # Browser WebM with Opus codec
    "audio/webm;codecs=\"opus\"": ".webm",  # Browser WebM with quoted Opus codec
    "audio/ogg": ".ogg",
    "audio/ogg;codecs=opus": ".ogg",  # OGG with Opus codec
    "audio/mp4": ".mp4",
    "audio/m4a": ".m4a"
}

# Temporary audio storage directory
TEMP_AUDIO_DIR = Path("frontend/public/temp/speech-to-isl")
TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def detect_language_with_fallback(audio_path: str) -> dict:
    """Detect language with fallback mechanism for better accuracy"""
    try:
        # Primary detection using Gemini
        result = detect_language_from_recorded_audio(audio_path)

        # If confidence is low, try alternative approach
        if result["confidence"] < 0.8:
            logger.info(
                f"Low confidence detection ({result['confidence']}), attempting fallback analysis")

            # Try with a different prompt for low confidence cases
            fallback_result = detect_language_with_alternative_prompt(
                audio_path)

            # Use fallback if it has higher confidence
            if fallback_result["confidence"] > result["confidence"]:
                logger.info(
                    f"Using fallback result: {fallback_result['detected_language']} (confidence: {fallback_result['confidence']})")
                return fallback_result

        return result

    except Exception as e:
        logger.error(f"Fallback detection failed: {e}")
        # Return a safe default
        return {
            "detected_language": "english",
            "confidence": 0.5,
            "debug_info": {
                "raw_gemini_response": "fallback_error",
                "normalized_response": "english",
                "confidence_factors": {
                    "is_exact_match": False,
                    "was_normalized": False,
                    "was_fallback": True
                },
                "processing_steps": {
                    "raw_response_length": 0,
                    "supported_language": True,
                    "confidence_category": "low"
                }
            }
        }


def detect_language_with_alternative_prompt(audio_path: str) -> dict:
    """Alternative language detection with different prompt"""
    audio_file = Path(audio_path)
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file {audio_path} not found.")

    # Alternative prompt focused on Indian languages
    alternative_prompt = """Listen to this audio and identify if the speaker is speaking in:
1. English (if speaking in English language)
2. Hindi (if speaking in Hindi language) 
3. Marathi (if speaking in Marathi language)
4. Gujarati (if speaking in Gujarati language)

Respond with only the number (1, 2, 3, or 4) followed by the language name.
Example: "1 English" or "2 Hindi" """

    try:
        configure_gemini()
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        audio_data = genai.upload_file(audio_file)
        response = model.generate_content([audio_data, alternative_prompt])

        if not response or not response.text:
            raise Exception(
                "No response received from alternative language detection")

        raw_response = response.text.strip()
        logger.info(f"Alternative prompt response: {raw_response}")

        # Parse the response
        response_parts = raw_response.split()
        if len(response_parts) >= 2:
            try:
                number = int(response_parts[0])
                language_name = response_parts[1].lower()

                # Map numbers to languages
                number_mapping = {
                    1: "english",
                    2: "hindi",
                    3: "marathi",
                    4: "gujarati"
                }

                detected_language = number_mapping.get(number, language_name)
                confidence = 0.90  # High confidence for structured response

                return {
                    "detected_language": detected_language,
                    "confidence": confidence,
                    "debug_info": {
                        "raw_gemini_response": raw_response,
                        "normalized_response": detected_language,
                        "confidence_factors": {
                            "is_exact_match": True,
                            "was_normalized": False,
                            "was_fallback": True
                        },
                        "processing_steps": {
                            "raw_response_length": len(raw_response),
                            "supported_language": True,
                            "confidence_category": "high"
                        }
                    }
                }

            except (ValueError, IndexError):
                # Fallback to text parsing
                detected_language = response_parts[1].lower() if len(
                    response_parts) > 1 else "english"
                confidence = 0.75
        else:
            detected_language = "english"
            confidence = 0.60

        return {
            "detected_language": detected_language,
            "confidence": confidence,
            "debug_info": {
                "raw_gemini_response": raw_response,
                "normalized_response": detected_language,
                "confidence_factors": {
                    "is_exact_match": False,
                    "was_normalized": False,
                    "was_fallback": True
                },
                "processing_steps": {
                    "raw_response_length": len(raw_response),
                    "supported_language": True,
                    "confidence_category": "medium"
                }
            }
        }

    except Exception as e:
        logger.error(f"Alternative prompt detection failed: {e}")
        raise e


def detect_language_from_recorded_audio(audio_path: str) -> dict:
    """Detect language from recorded audio file using Google Gemini API"""
    audio_file = Path(audio_path)
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file {audio_path} not found.")

    # Prompt to ask for language detection with specific context
    user_prompt = """Detect the spoken language in this audio. 
    
    This audio is from an Indian railway announcement system. The possible languages are:
    - English (if spoken in English)
    - Hindi (if spoken in Hindi) 
    - Marathi (if spoken in Marathi)
    - Gujarati (if spoken in Gujarati)
    
    Listen carefully and respond with ONLY the language name (English, Hindi, Marathi, or Gujarati)."""

    try:
        configure_gemini()
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
        raw_response = response.text.strip()
        detected_language = raw_response.lower()

        # Normalize and validate the detected language
        language_mapping = {
            'english': 'english',
            'hindi': 'hindi',
            'marathi': 'marathi',
            'gujarati': 'gujarati',
            'inglish': 'english',  # Common misspelling
            'angrezi': 'english',  # Hindi word for English
            'हिंदी': 'hindi',      # Hindi in Devanagari
            'मराठी': 'marathi',    # Marathi in Devanagari
            'ગુજરાતી': 'gujarati'  # Gujarati in Gujarati script
        }

        # Normalize the detected language
        normalized_language = language_mapping.get(
            detected_language, detected_language)

        # Validate that we got a supported language
        supported_languages = ['english', 'hindi', 'marathi', 'gujarati']
        was_normalized = detected_language in language_mapping
        is_exact_match = detected_language == normalized_language

        if normalized_language not in supported_languages:
            logger.warning(
                f"Unsupported language detected: {detected_language} -> {normalized_language}")
            # Default to English if unsupported language detected
            normalized_language = 'english'
            was_fallback = True
        else:
            was_fallback = False

        # Calculate confidence based on response quality and normalization
        if is_exact_match and not was_fallback:
            confidence = 0.95  # High confidence for exact match
        elif was_normalized and not was_fallback:
            confidence = 0.85  # Medium confidence for normalized match
        elif was_fallback:
            confidence = 0.60  # Lower confidence for fallback
        else:
            confidence = 0.70  # Default confidence

        detected_language = normalized_language

        # Log detailed detection info
        logger.info(
            f"Language detection details: raw='{raw_response}', normalized='{normalized_language}', confidence={confidence}, was_normalized={was_normalized}, was_fallback={was_fallback}")

        return {
            "detected_language": detected_language,
            "confidence": confidence,
            "debug_info": {
                "raw_gemini_response": raw_response,
                "normalized_response": normalized_language,
                "confidence_factors": {
                    "is_exact_match": is_exact_match,
                    "was_normalized": was_normalized,
                    "was_fallback": was_fallback
                },
                "processing_steps": {
                    "raw_response_length": len(raw_response),
                    "supported_language": normalized_language in supported_languages,
                    "confidence_category": "high" if confidence >= 0.9 else "medium" if confidence >= 0.8 else "low"
                }
            }
        }

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


@router.post("/save-temp")
async def save_audio_to_temp(
    audio_blob: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Save recorded audio to temporary location"""

    logger.info(
        f"Saving audio blob: {audio_blob.filename}, content_type: {audio_blob.content_type}")

    # Validate file type (normalize MIME type to handle codecs)
    normalized_content_type = normalize_mime_type(audio_blob.content_type)
    logger.info(f"Normalized content type: {normalized_content_type}")

    if normalized_content_type not in SUPPORTED_RECORDING_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {audio_blob.content_type}. Supported formats: {list(SUPPORTED_RECORDING_FORMATS.keys())}"
        )

    # Validate file size (max 10MB for recordings)
    file_size = 0
    content = await audio_blob.read()
    file_size = len(content)

    if file_size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=400,
            detail="Recording too large. Maximum size is 10MB."
        )

    # Validate minimum file size (at least 5KB for better detection)
    if file_size < 5 * 1024:  # 5KB minimum
        raise HTTPException(
            status_code=400,
            detail="Recording too short. Please record for at least 3-5 seconds for better language detection."
        )

    # Generate unique temp audio ID
    temp_audio_id = str(uuid.uuid4())
    file_extension = SUPPORTED_RECORDING_FORMATS[normalized_content_type]
    temp_file_path = TEMP_AUDIO_DIR / f"{temp_audio_id}{file_extension}"

    try:
        # Save file to temp location
        with open(temp_file_path, "wb") as f:
            f.write(content)

        logger.info(f"Saved temporary audio file: {temp_file_path}")

        # Convert WebM to WAV if needed for better compatibility
        final_file_path = temp_file_path
        if normalized_content_type == "audio/webm":
            wav_file_path = TEMP_AUDIO_DIR / f"{temp_audio_id}.wav"
            if convert_webm_to_wav(str(temp_file_path), str(wav_file_path)):
                # Remove original WebM file and use WAV
                temp_file_path.unlink()
                final_file_path = wav_file_path
                logger.info(f"Converted WebM to WAV: {final_file_path}")
            else:
                logger.warning(
                    "WebM to WAV conversion failed, keeping original file")

        # Calculate estimated duration
        # Assuming 16kHz, 16-bit audio
        estimated_duration = file_size / (16000 * 2)

        return {
            "message": "Audio saved to temporary location successfully",
            "temp_audio_id": temp_audio_id,
            "file_size": file_size,
            "content_type": audio_blob.content_type,
            "estimated_duration": round(estimated_duration, 2),
            "file_path": str(final_file_path),
            "converted_to_wav": normalized_content_type == "audio/webm"
        }

    except Exception as e:
        logger.error(f"Failed to save temporary audio: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to save audio: {str(e)}")


@router.post("/detect-language/{temp_audio_id}")
async def detect_language_from_temp_file(
    temp_audio_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Detect language from saved temporary audio file"""

    logger.info(f"Detecting language for temp audio ID: {temp_audio_id}")

    # Find the temp file (try different extensions)
    temp_file_path = None
    for ext in [".wav", ".webm", ".ogg", ".mp4", ".m4a"]:
        potential_path = TEMP_AUDIO_DIR / f"{temp_audio_id}{ext}"
        if potential_path.exists():
            temp_file_path = potential_path
            break

    if not temp_file_path or not temp_file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Temporary audio file not found for ID: {temp_audio_id}"
        )

    try:
        # Get file info
        file_size = temp_file_path.stat().st_size
        # Assuming 16kHz, 16-bit audio
        estimated_duration = file_size / (16000 * 2)

        # Detect language using hybrid approach with fallback
        detection_result = detect_language_with_fallback(str(temp_file_path))

        logger.info(
            f"Language detection completed for {temp_audio_id}: {detection_result['detected_language']} (confidence: {detection_result['confidence']})")

        return {
            "message": "Language detected successfully from temporary file",
            "temp_audio_id": temp_audio_id,
            "recording_duration": round(estimated_duration, 2),
            "file_size": file_size,
            "content_type": f"audio/{temp_file_path.suffix[1:]}",
            "detected_language": detection_result["detected_language"],
            "confidence": detection_result["confidence"],
            "debug_info": {
                "file_path": str(temp_file_path),
                "estimated_duration": round(estimated_duration, 2),
                "detection_details": detection_result.get("debug_info", {}),
                "audio_quality": {
                    "file_size_kb": round(file_size / 1024, 2),
                    "duration_seconds": round(estimated_duration, 2),
                    "quality_rating": "good" if file_size > 20 * 1024 and estimated_duration > 3 else "fair" if file_size > 10 * 1024 else "poor"
                }
            }
        }

    except Exception as e:
        logger.error(f"Language detection error for {temp_audio_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Language detection failed: {str(e)}")


@router.post("/transcribe-speech-isl/{temp_audio_id}")
async def transcribe_speech_isl_audio(
    temp_audio_id: str,
    language_code: str = Form(...),
    enable_automatic_punctuation: bool = Form(True),
    enable_word_time_offsets: bool = Form(True),
    db: AsyncSession = Depends(get_db)
):
    """Dedicated transcription endpoint for Speech to ISL workflow - optimized for WebM recordings"""

    logger.info(
        f"Speech-to-ISL transcription for temp audio ID: {temp_audio_id}, language: {language_code}")

    # Find the temp file (try different extensions - WAV first since WebM is converted to WAV)
    temp_file_path = None
    # WAV first since WebM files are converted to WAV
    for ext in [".wav", ".webm", ".ogg", ".mp4", ".m4a"]:
        potential_path = TEMP_AUDIO_DIR / f"{temp_audio_id}{ext}"
        if potential_path.exists():
            temp_file_path = potential_path
            break

    if not temp_file_path or not temp_file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Temporary audio file not found for ID: {temp_audio_id}"
        )

    try:
        # Import required modules for speech recognition
        from google.cloud import speech
        from google.cloud.exceptions import GoogleCloudError

        # Validate language code
        SUPPORTED_LANGUAGES = {
            "en-IN": "English (India)",
            "hi-IN": "Hindi (India)",
            "mr-IN": "Marathi (India)",
            "gu-IN": "Gujarati (India)"
        }

        if language_code not in SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language code: {language_code}. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
            )

        # Get audio info using pydub (cleaner for WAV files)
        logger.info(f"Getting audio info for Speech-to-ISL: {temp_file_path}")
        audio_data, sample_rate = load_audio_with_pydub(str(temp_file_path))

        if audio_data is None or len(audio_data) == 0:
            raise HTTPException(
                status_code=400, detail="Audio file contains no audio data")

        duration = len(audio_data) / sample_rate
        logger.info(
            f"Speech-to-ISL audio loaded: {len(audio_data)} samples, {sample_rate}Hz, {duration:.2f}s")

        # Detect actual file format (not just extension)
        actual_format = detect_audio_format(str(temp_file_path))
        logger.info(
            f"Speech-to-ISL detected format: {actual_format} (extension: {temp_file_path.suffix})")

        # Speech-to-ISL optimized encoding map (prioritizing WebM/Opus)
        encoding_map = {
            # Primary for browser recordings
            'webm': speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            'wav': speech.RecognitionConfig.AudioEncoding.LINEAR16,
            'ogg': speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            'mp4': speech.RecognitionConfig.AudioEncoding.MP3,
            'm4a': speech.RecognitionConfig.AudioEncoding.MP3,
            'mp3': speech.RecognitionConfig.AudioEncoding.MP3,
            'flac': speech.RecognitionConfig.AudioEncoding.FLAC,
        }

        # Use actual format if detected, otherwise fall back to extension
        file_extension = temp_file_path.suffix.lower().lstrip('.')
        format_to_use = actual_format if actual_format in encoding_map else file_extension
        # Default to Opus for WebM
        encoding = encoding_map.get(
            format_to_use, speech.RecognitionConfig.AudioEncoding.OGG_OPUS)
        logger.info(
            f"Speech-to-ISL using encoding: {encoding} for format: {format_to_use}")

        # Initialize GCP Speech client
        try:
            logger.info("Initializing GCP Speech client for Speech-to-ISL...")
            client = speech.SpeechClient()
            logger.info("GCP Speech client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize GCP Speech client: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize GCP Speech client: {str(e)}"
            )

        # Read audio file
        logger.info(f"Reading Speech-to-ISL audio file: {temp_file_path}")
        with open(temp_file_path, "rb") as f:
            audio_content = f.read()

        logger.info(
            f"Speech-to-ISL audio content size: {len(audio_content)} bytes")

        # Configure recognition with Speech-to-ISL optimizations
        logger.info(
            f"Configuring Speech-to-ISL recognition: encoding={encoding}, sample_rate={sample_rate}, language={language_code}")
        audio = speech.RecognitionAudio(content=audio_content)

        config = speech.RecognitionConfig(
            encoding=encoding,
            sample_rate_hertz=sample_rate,
            language_code=language_code,
            enable_automatic_punctuation=enable_automatic_punctuation,
            enable_word_time_offsets=enable_word_time_offsets,
            # Speech-to-ISL specific optimizations
            model="latest_long",  # Use latest model for better accuracy
            use_enhanced=True,    # Use enhanced model for better results
        )

        # Perform recognition with Speech-to-ISL specific error handling
        try:
            logger.info(
                "Sending Speech-to-ISL recognition request to GCP Speech API...")
            logger.info(
                f"Speech-to-ISL config: encoding={encoding}, sample_rate={sample_rate}, language={language_code}")

            response = client.recognize(config=config, audio=audio)
            logger.info(
                f"Speech-to-ISL recognition response: {len(response.results)} results")

            if not response.results:
                logger.warning(
                    "Speech-to-ISL: No speech detected with primary encoding - trying WebM-optimized fallbacks...")

                # Speech-to-ISL specific fallback encodings (prioritizing WebM/Opus)
                fallback_encodings = [
                    speech.RecognitionConfig.AudioEncoding.OGG_OPUS,  # Primary for WebM
                    speech.RecognitionConfig.AudioEncoding.LINEAR16,  # For WAV
                    speech.RecognitionConfig.AudioEncoding.MP3        # For other formats
                ]

                for fallback_encoding in fallback_encodings:
                    if fallback_encoding == encoding:
                        continue  # Skip if already tried

                    logger.info(
                        f"Speech-to-ISL trying fallback encoding: {fallback_encoding}")
                    fallback_config = speech.RecognitionConfig(
                        encoding=fallback_encoding,
                        sample_rate_hertz=sample_rate,
                        language_code=language_code,
                        enable_automatic_punctuation=enable_automatic_punctuation,
                        enable_word_time_offsets=enable_word_time_offsets,
                        model="latest_long",
                        use_enhanced=True,
                    )

                    try:
                        fallback_response = client.recognize(
                            config=fallback_config, audio=audio)
                        if fallback_response.results:
                            logger.info(
                                f"Speech-to-ISL success with fallback encoding: {fallback_encoding}")
                            response = fallback_response
                            break
                    except Exception as e:
                        logger.warning(
                            f"Speech-to-ISL fallback encoding {fallback_encoding} failed: {e}")
                        continue

                if not response.results:
                    logger.warning(
                        "Speech-to-ISL: No speech detected - possible causes:")
                    logger.warning(
                        "1. Audio is too quiet or has no speech content")
                    logger.warning(
                        "2. Wrong language code for the spoken language")
                    logger.warning("3. WebM/Opus encoding issues")
                    logger.warning("4. Audio format not properly supported")
                    raise HTTPException(
                        status_code=400, detail="No speech detected in audio")

            # Process results
            transcript_parts = []
            confidence_scores = []
            word_time_offsets = []

            for result in response.results:
                if result.alternatives:
                    alternative = result.alternatives[0]
                    transcript_parts.append(alternative.transcript)
                    if hasattr(alternative, 'confidence'):
                        confidence_scores.append(alternative.confidence)

                    # Extract word time offsets if available
                    if enable_word_time_offsets and hasattr(alternative, 'words'):
                        for word_info in alternative.words:
                            word_time_offsets.append({
                                "word": word_info.word,
                                "start_time": word_info.start_time.total_seconds() if word_info.start_time else 0,
                                "end_time": word_info.end_time.total_seconds() if word_info.end_time else 0
                            })

            final_transcript = " ".join(transcript_parts).strip()
            average_confidence = sum(
                confidence_scores) / len(confidence_scores) if confidence_scores else None

            if not final_transcript:
                raise HTTPException(
                    status_code=400, detail="No transcript generated from audio")

            # Return Speech-to-ISL specific response
            return {
                "transcription_result": {
                    "transcript": final_transcript,
                    "language_code": language_code,
                    "confidence": average_confidence,
                    "duration": duration,
                    "file_size": len(audio_content),
                    "format_detected": actual_format,
                    "encoding_used": str(encoding),
                    "word_time_offsets": word_time_offsets if enable_word_time_offsets else None
                },
                "speech_to_isl_metadata": {
                    "service": "speech-to-isl",
                    "optimized_for": "webm_recordings",
                    "model_used": "latest_long",
                    "enhanced_model": True
                }
            }

        except GoogleCloudError as e:
            logger.error(f"Speech-to-ISL GCP Speech API error: {e}")
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
            logger.error(f"Speech-to-ISL unexpected error: {e}")
            raise HTTPException(
                status_code=500, detail=f"Unexpected error during speech recognition: {str(e)}")

    except Exception as e:
        logger.error(f"Speech-to-ISL transcription error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Transcription failed: {str(e)}")


@router.delete("/cleanup/{temp_audio_id}")
async def cleanup_temp_audio(
    temp_audio_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Clean up temporary audio file"""

    logger.info(f"Cleaning up temp audio ID: {temp_audio_id}")

    # Find and delete the temp file (try different extensions)
    deleted_files = []
    for ext in [".wav", ".webm", ".ogg", ".mp4", ".m4a"]:
        potential_path = TEMP_AUDIO_DIR / f"{temp_audio_id}{ext}"
        if potential_path.exists():
            try:
                os.unlink(potential_path)
                deleted_files.append(str(potential_path))
                logger.info(f"Deleted temporary file: {potential_path}")
            except Exception as e:
                logger.warning(f"Failed to delete {potential_path}: {e}")

    if not deleted_files:
        raise HTTPException(
            status_code=404,
            detail=f"No temporary files found for ID: {temp_audio_id}"
        )

    return {
        "message": f"Temporary audio files cleaned up successfully",
        "temp_audio_id": temp_audio_id,
        "deleted_files": deleted_files
    }


@router.get("/supported-formats")
def get_supported_recording_formats():
    """Get list of supported recording formats"""
    return {
        "supported_formats": list(SUPPORTED_RECORDING_FORMATS.keys()),
        "description": "Supported audio formats for speech recording"
    }


@router.get("/health")
def health_check():
    """Health check endpoint for Speech to ISL service"""
    return {
        "status": "healthy",
        "service": "speech-to-isl",
        "supported_formats": len(SUPPORTED_RECORDING_FORMATS),
        "temp_dir": str(TEMP_AUDIO_DIR),
        "temp_dir_exists": TEMP_AUDIO_DIR.exists(),
        "available_endpoints": [
            "save-temp",
            "detect-language/{temp_audio_id}",
            "transcribe-speech-isl/{temp_audio_id}",
            "cleanup/{temp_audio_id}",
            "supported-formats",
            "health"
        ]
    }
