# Credentials Management

This directory contains credential files and API keys for the SignVerse backend application.

## Directory Structure

```
credentials/
├── secrets/                    # Actual credential files (gitignored)
│   ├── openai_api_key.txt     # OpenAI API key
│   ├── anthropic_api_key.txt  # Anthropic API key
│   ├── google_api_key.txt     # Google API key
│   ├── stripe_secret_key.txt  # Stripe secret key
│   ├── sendgrid_api_key.txt   # SendGrid API key
│   ├── twilio_account_sid.txt # Twilio Account SID
│   ├── twilio_auth_token.txt  # Twilio Auth Token
│   ├── gcp_service_account.json # GCP Service Account JSON
│   └── isl.json               # GCP Service Account JSON (alternative name)
├── examples/                   # Example files (safe to commit)
│   ├── gcp_service_account_example.json
│   └── api_keys_example.txt
└── README.md                   # This file
```

## Security Best Practices

### 🔒 **NEVER commit actual credentials to git**
- All files in `secrets/` directory are gitignored
- Use environment variables in production
- Rotate credentials regularly

### 📁 **File Permissions**
- Credential files are automatically set to `600` (owner read/write only)
- Directories are set to `700` (owner read/write/execute only)

## Setup Instructions

### 1. Environment Variables (Recommended for Production)

Set these environment variables:

```bash
# API Keys
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
export STRIPE_SECRET_KEY="your-stripe-secret-key"
export SENDGRID_API_KEY="your-sendgrid-api-key"
export TWILIO_ACCOUNT_SID="your-twilio-account-sid"
export TWILIO_AUTH_TOKEN="your-twilio-auth-token"

# GCP Credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
# OR
export GCP_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "..."}'
```

### 2. Credential Files (Development Only)

For local development, you can store credentials in files:

```bash
# Create the secrets directory
mkdir -p credentials/secrets

# Store API keys
echo "your-openai-api-key" > credentials/secrets/openai_api_key.txt
echo "your-anthropic-api-key" > credentials/secrets/anthropic_api_key.txt

# Store GCP service account JSON (any of these names work)
cp /path/to/your/service-account.json credentials/secrets/gcp_service_account.json
# OR
cp /path/to/your/service-account.json credentials/secrets/isl.json
# OR
cp /path/to/your/service-account.json credentials/secrets/service_account.json
```

## GCP Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "IAM & Admin" > "Service Accounts"
4. Create a new service account or use existing one
5. Download the JSON key file
6. Store it as `credentials/secrets/gcp_service_account.json`

### Required GCP APIs
Enable these APIs in your GCP project:
- Cloud Storage API
- Cloud Translation API
- Cloud Vision API
- Cloud Text-to-Speech API

## Usage in Code

```python
from app.utils.credentials import credential_manager
from app.utils.gcp_client import gcp_client_manager

# Get API keys
openai_key = credential_manager.get_api_key('openai')
anthropic_key = credential_manager.get_api_key('anthropic')

# Get GCP clients
storage_client = gcp_client_manager.get_storage_client()
translate_client = gcp_client_manager.get_translate_client()
vision_client = gcp_client_manager.get_vision_client()
```

## Credential Priority

The system checks for credentials in this order:

1. **Environment Variables** (highest priority)
2. **Credential Files** (fallback for development)

## Troubleshooting

### Common Issues

1. **"No API key found"**: Check if the credential file exists and has correct permissions
2. **"GCP credentials not found"**: Verify the service account JSON file is valid
3. **Permission denied**: Ensure credential files have correct permissions (600)

### Check Available Credentials

```python
from app.utils.credentials import credential_manager

available = credential_manager.list_available_credentials()
print(available)
```

## Production Deployment

For production, always use environment variables or a secure secret management system like:
- AWS Secrets Manager
- Google Secret Manager
- Azure Key Vault
- HashiCorp Vault

Never store credentials in files in production environments.
