from typing import Optional, Dict, Any
from google.cloud import storage, vision, texttospeech
from google.cloud import translate_v2 as translate
from google.oauth2 import service_account
from app.utils.credentials import credential_manager
from app.utils.logger import get_logger

logger = get_logger(__name__)


class GCPClientManager:
    """GCP client manager for various services"""

    def __init__(self):
        self._credentials = None
        self._project_id = None
        self._clients = {}

    def _get_credentials(self):
        """Get GCP credentials"""
        if self._credentials is None:
            self._credentials = credential_manager.get_gcp_credentials()
            if self._credentials:
                self._project_id = self._credentials.get('project_id')
        return self._credentials

    def get_storage_client(self) -> Optional[storage.Client]:
        """Get Google Cloud Storage client"""
        try:
            credentials = self._get_credentials()
            if not credentials:
                logger.warning(
                    "No GCP credentials available for Storage client")
                return None

            credentials_obj = service_account.Credentials.from_service_account_info(
                credentials)
            client = storage.Client(
                credentials=credentials_obj, project=self._project_id)
            logger.debug("Created GCP Storage client")
            return client
        except Exception as e:
            logger.error(f"Failed to create GCP Storage client: {e}")
            return None

    def get_translate_client(self) -> Optional[translate.Client]:
        """Get Google Cloud Translation client"""
        try:
            credentials = self._get_credentials()
            if not credentials:
                logger.warning(
                    "No GCP credentials available for Translation client")
                return None

            credentials_obj = service_account.Credentials.from_service_account_info(
                credentials)
            client = translate.Client(credentials=credentials_obj)
            logger.debug("Created GCP Translation client")
            return client
        except Exception as e:
            logger.error(f"Failed to create GCP Translation client: {e}")
            return None

    def get_vision_client(self) -> Optional[vision.ImageAnnotatorClient]:
        """Get Google Cloud Vision client"""
        try:
            credentials = self._get_credentials()
            if not credentials:
                logger.warning(
                    "No GCP credentials available for Vision client")
                return None

            credentials_obj = service_account.Credentials.from_service_account_info(
                credentials)
            client = vision.ImageAnnotatorClient(credentials=credentials_obj)
            logger.debug("Created GCP Vision client")
            return client
        except Exception as e:
            logger.error(f"Failed to create GCP Vision client: {e}")
            return None

    def get_text_to_speech_client(self) -> Optional[texttospeech.TextToSpeechClient]:
        """Get Google Cloud Text-to-Speech client"""
        try:
            credentials = self._get_credentials()
            if not credentials:
                logger.warning(
                    "No GCP credentials available for Text-to-Speech client")
                return None

            credentials_obj = service_account.Credentials.from_service_account_info(
                credentials)
            client = texttospeech.TextToSpeechClient(
                credentials=credentials_obj)
            logger.debug("Created GCP Text-to-Speech client")
            return client
        except Exception as e:
            logger.error(f"Failed to create GCP Text-to-Speech client: {e}")
            return None


# Global GCP client manager instance
gcp_client_manager = GCPClientManager()
