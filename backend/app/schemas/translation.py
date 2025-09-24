"""
Pydantic schemas for translation API
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class TranslationRequest(BaseModel):
    """Request schema for text translation"""
    source_text: str = Field(..., min_length=1, max_length=5000, description="Text to translate")
    source_language_code: str = Field(..., min_length=2, max_length=10, description="Source language code (e.g., 'en', 'hi', 'mr', 'gu')")
    target_language_codes: List[str] = Field(..., min_items=1, max_items=10, description="List of target language codes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "source_text": "Hello, how are you?",
                "source_language_code": "en",
                "target_language_codes": ["hi", "mr", "gu"]
            }
        }


class TranslationResponse(BaseModel):
    """Response schema for individual language translation"""
    translated_text: str = Field(..., description="Translated text")
    detected_language: Optional[str] = Field(None, description="Detected source language code")
    confidence: Optional[float] = Field(None, description="Translation confidence score")
    error: Optional[str] = Field(None, description="Error message if translation failed")


class MultilingualTranslationResponse(BaseModel):
    """Response schema for multilingual translation"""
    source_text: str = Field(..., description="Original source text")
    source_language: str = Field(..., description="Source language code")
    target_languages: List[str] = Field(..., description="List of target language codes")
    translations: Dict[str, TranslationResponse] = Field(..., description="Translations for each target language")
    status: str = Field(..., description="Translation status (success/error)")
    error: Optional[str] = Field(None, description="Error message if translation failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "source_text": "Hello, how are you?",
                "source_language": "en",
                "target_languages": ["hi", "mr", "gu"],
                "translations": {
                    "hi": {
                        "translated_text": "नमस्ते, आप कैसे हैं?",
                        "detected_language": "en",
                        "confidence": 0.95
                    },
                    "mr": {
                        "translated_text": "नमस्कार, तुम कसे आहात?",
                        "detected_language": "en",
                        "confidence": 0.94
                    },
                    "gu": {
                        "translated_text": "નમસ્તે, તમે કેમ છો?",
                        "detected_language": "en",
                        "confidence": 0.93
                    }
                },
                "status": "success"
            }
        }


class SupportedLanguage(BaseModel):
    """Schema for supported language information"""
    language_code: str = Field(..., description="Language code (e.g., 'en', 'hi', 'mr', 'gu')")
    display_name: str = Field(..., description="Human-readable language name")
    support_source: bool = Field(..., description="Whether language is supported as source")
    support_target: bool = Field(..., description="Whether language is supported as target")


class SupportedLanguagesResponse(BaseModel):
    """Response schema for supported languages"""
    languages: List[SupportedLanguage] = Field(..., description="List of supported languages")
    total_count: int = Field(..., description="Total number of supported languages")
    
    class Config:
        json_schema_extra = {
            "example": {
                "languages": [
                    {
                        "language_code": "en",
                        "display_name": "English",
                        "support_source": True,
                        "support_target": True
                    },
                    {
                        "language_code": "hi",
                        "display_name": "Hindi",
                        "support_source": True,
                        "support_target": True
                    }
                ],
                "total_count": 2
            }
        }
