"""
GCP Cloud Translation Service
Handles multilingual text translation using Google Cloud Translation API
"""

import os
from typing import List, Dict, Any
from pathlib import Path
from google.cloud import translate_v3
from google.oauth2 import service_account
from app.utils.logger import get_logger

logger = get_logger(__name__)


class TranslationService:
    def __init__(self):
        self.project_id = "aipower-467603"  # From the credentials file
        # Get the absolute path to the credentials file
        current_dir = Path(__file__).parent
        project_root = current_dir.parent.parent.parent  # Go up to project root
        self.credentials_path = project_root / "backend" / \
            "credentials" / "secrets" / "isl.json"
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the Google Cloud Translation client"""
        try:
            # Convert Path object to string for environment variable
            credentials_path_str = str(self.credentials_path)

            # Set the credentials file path
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path_str

            # Create credentials from service account file
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path_str,
                scopes=["https://www.googleapis.com/auth/cloud-translation"]
            )

            # Initialize the client
            self.client = translate_v3.TranslationServiceClient(
                credentials=credentials)
            logger.info(
                "Google Cloud Translation client initialized successfully")

        except Exception as e:
            logger.error(
                f"Failed to initialize Google Cloud Translation client: {str(e)}")
            raise

    def translate_text(
        self,
        text: str,
        source_language_code: str,
        target_language_codes: List[str]
    ) -> Dict[str, Any]:
        """
        Translate text from source language to multiple target languages

        Args:
            text: The text to translate
            source_language_code: Source language code (e.g., 'en', 'hi', 'mr', 'gu')
            target_language_codes: List of target language codes (e.g., ['hi', 'mr', 'gu'])

        Returns:
            Dictionary containing translations for each target language
        """
        try:
            if not self.client:
                raise Exception("Translation client not initialized")

            parent = f"projects/{self.project_id}/locations/global"
            mime_type = "text/plain"

            # Prepare the response structure
            translations = {}

            # Translate to each target language
            for target_lang in target_language_codes:
                try:
                    response = self.client.translate_text(
                        contents=[text],
                        parent=parent,
                        mime_type=mime_type,
                        source_language_code=source_language_code,
                        target_language_code=target_lang,
                    )

                    # Extract the translated text
                    if response.translations:
                        translated_text = response.translations[0].translated_text
                        translations[target_lang] = {
                            "translated_text": translated_text,
                            "detected_language": response.translations[0].detected_language_code,
                            "confidence": getattr(response.translations[0], 'confidence', None)
                        }
                    else:
                        translations[target_lang] = {
                            "translated_text": text,  # Fallback to original text
                            "error": "No translation returned"
                        }

                except Exception as e:
                    logger.error(
                        f"Error translating to {target_lang}: {str(e)}")
                    translations[target_lang] = {
                        "translated_text": text,  # Fallback to original text
                        "error": f"Translation failed: {str(e)}"
                    }

            return {
                "source_text": text,
                "source_language": source_language_code,
                "target_languages": target_language_codes,
                "translations": translations,
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Translation service error: {str(e)}")
            return {
                "source_text": text,
                "source_language": source_language_code,
                "target_languages": target_language_codes,
                "translations": {},
                "status": "error",
                "error": str(e)
            }

    def get_supported_languages(self) -> List[Dict[str, str]]:
        """
        Get list of supported languages

        Returns:
            List of dictionaries containing language codes and names
        """
        try:
            if not self.client:
                raise Exception("Translation client not initialized")

            parent = f"projects/{self.project_id}/locations/global"

            response = self.client.get_supported_languages(parent=parent)

            languages = []
            for language in response.languages:
                languages.append({
                    "language_code": language.language_code,
                    "display_name": language.display_name,
                    "support_source": language.support_source,
                    "support_target": language.support_target
                })

            return languages

        except Exception as e:
            logger.error(f"Error getting supported languages: {str(e)}")
            return []


# Create a singleton instance
translation_service = TranslationService()
