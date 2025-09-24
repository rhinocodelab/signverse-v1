import os
import json
from pathlib import Path
from typing import Optional, Dict, Any
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CredentialManager:
    """Secure credential management utility"""

    def __init__(self):
        self.credentials_dir = Path(settings.CREDENTIALS_DIR)
        self.secrets_dir = Path(settings.SECRETS_DIR)
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """Ensure credential directories exist"""
        self.credentials_dir.mkdir(
            exist_ok=True, mode=0o700)  # Read/write/execute for owner only
        self.secrets_dir.mkdir(exist_ok=True, mode=0o700)

    def get_api_key(self, service_name: str) -> Optional[str]:
        """
        Get API key for a service from environment variable or credential file

        Priority:
        1. Environment variable (e.g., OPENAI_API_KEY)
        2. Credential file (credentials/secrets/{service_name}_api_key.txt)
        """
        # Try environment variable first
        env_var_name = f"{service_name.upper()}_API_KEY"
        api_key = os.getenv(env_var_name)

        if api_key:
            logger.debug(
                f"Loaded {service_name} API key from environment variable")
            return api_key

        # Try credential file
        credential_file = self.secrets_dir / f"{service_name}_api_key.txt"
        if credential_file.exists():
            try:
                with open(credential_file, 'r') as f:
                    api_key = f.read().strip()
                logger.debug(
                    f"Loaded {service_name} API key from credential file")
                return api_key
            except Exception as e:
                logger.error(
                    f"Failed to read {service_name} API key from file: {e}")

        logger.warning(f"No API key found for {service_name}")
        return None

    def get_gcp_credentials(self) -> Optional[Dict[str, Any]]:
        """
        Get GCP credentials from environment variable or credential file

        Priority:
        1. Environment variable GOOGLE_APPLICATION_CREDENTIALS (file path)
        2. Environment variable GCP_SERVICE_ACCOUNT_KEY (JSON string)
        3. Credential file credentials/secrets/gcp_service_account.json
        """
        # Try GOOGLE_APPLICATION_CREDENTIALS environment variable
        gcp_creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if gcp_creds_path and Path(gcp_creds_path).exists():
            try:
                with open(gcp_creds_path, 'r') as f:
                    credentials = json.load(f)
                logger.debug(
                    "Loaded GCP credentials from GOOGLE_APPLICATION_CREDENTIALS")
                return credentials
            except Exception as e:
                logger.error(
                    f"Failed to read GCP credentials from GOOGLE_APPLICATION_CREDENTIALS: {e}")

        # Try GCP_SERVICE_ACCOUNT_KEY environment variable (JSON string)
        gcp_key_json = os.getenv('GCP_SERVICE_ACCOUNT_KEY')
        if gcp_key_json:
            try:
                credentials = json.loads(gcp_key_json)
                logger.debug(
                    "Loaded GCP credentials from GCP_SERVICE_ACCOUNT_KEY environment variable")
                return credentials
            except json.JSONDecodeError as e:
                logger.error(
                    f"Failed to parse GCP credentials from environment variable: {e}")

        # Try credential files (check multiple possible names)
        credential_files = [
            self.secrets_dir / "gcp_service_account.json",
            self.secrets_dir / "isl.json",  # Your existing file
            self.secrets_dir / "service_account.json"
        ]

        for credential_file in credential_files:
            if credential_file.exists():
                try:
                    with open(credential_file, 'r') as f:
                        credentials = json.load(f)
                    logger.debug(
                        f"Loaded GCP credentials from {credential_file.name}")
                    return credentials
                except Exception as e:
                    logger.error(
                        f"Failed to read GCP credentials from {credential_file.name}: {e}")
                    continue

        logger.warning("No GCP credentials found")
        return None

    def store_api_key(self, service_name: str, api_key: str) -> bool:
        """
        Store API key in credential file (for development/testing only)
        """
        try:
            credential_file = self.secrets_dir / f"{service_name}_api_key.txt"
            with open(credential_file, 'w') as f:
                f.write(api_key)
            # Set restrictive permissions
            os.chmod(credential_file, 0o600)  # Read/write for owner only
            logger.info(f"Stored {service_name} API key in credential file")
            return True
        except Exception as e:
            logger.error(f"Failed to store {service_name} API key: {e}")
            return False

    def store_gcp_credentials(self, credentials: Dict[str, Any]) -> bool:
        """
        Store GCP credentials in credential file (for development/testing only)
        """
        try:
            credential_file = self.secrets_dir / "gcp_service_account.json"
            with open(credential_file, 'w') as f:
                json.dump(credentials, f, indent=2)
            # Set restrictive permissions
            os.chmod(credential_file, 0o600)  # Read/write for owner only
            logger.info("Stored GCP credentials in credential file")
            return True
        except Exception as e:
            logger.error(f"Failed to store GCP credentials: {e}")
            return False

    def list_available_credentials(self) -> Dict[str, bool]:
        """List which credentials are available"""
        available = {}

        # Check API keys
        services = ['openai', 'anthropic', 'google',
                    'stripe', 'sendgrid', 'twilio']
        for service in services:
            available[f"{service}_api_key"] = self.get_api_key(
                service) is not None

        # Check GCP credentials
        available['gcp_credentials'] = self.get_gcp_credentials() is not None

        return available


# Global credential manager instance
credential_manager = CredentialManager()
