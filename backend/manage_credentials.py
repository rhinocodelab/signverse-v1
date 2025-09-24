#!/usr/bin/env python3
"""
Credential management script for SignVerse Backend
"""

from app.core.config import settings
from app.utils.credentials import credential_manager
import sys
import os
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))


def main():
    """Main credential management interface"""
    print("🔐 SignVerse Credential Manager")
    print("=" * 40)

    while True:
        print("\nOptions:")
        print("1. List available credentials")
        print("2. Test a specific credential")
        print("3. Store API key")
        print("4. Store GCP credentials")
        print("5. Exit")

        choice = input("\nEnter your choice (1-5): ").strip()

        if choice == "1":
            list_credentials()
        elif choice == "2":
            test_credential()
        elif choice == "3":
            store_api_key()
        elif choice == "4":
            store_gcp_credentials()
        elif choice == "5":
            print("Goodbye! 👋")
            break
        else:
            print("Invalid choice. Please try again.")


def list_credentials():
    """List all available credentials"""
    print("\n📋 Available Credentials:")
    print("-" * 30)

    available = credential_manager.list_available_credentials()

    for credential, is_available in available.items():
        status = "✅ Available" if is_available else "❌ Not found"
        print(f"{credential}: {status}")


def test_credential():
    """Test a specific credential"""
    print("\n🧪 Test Credential:")
    print("-" * 20)

    service = input(
        "Enter service name (e.g., openai, anthropic, gcp): ").strip().lower()

    if service == "gcp":
        credentials = credential_manager.get_gcp_credentials()
        if credentials:
            print(f"✅ GCP credentials found")
            print(f"   Project ID: {credentials.get('project_id', 'unknown')}")
            print(
                f"   Client Email: {credentials.get('client_email', 'unknown')}")
        else:
            print("❌ GCP credentials not found")
    else:
        api_key = credential_manager.get_api_key(service)
        if api_key:
            print(f"✅ {service} API key found")
            print(f"   Key preview: {api_key[:8]}...{api_key[-4:]}")
        else:
            print(f"❌ {service} API key not found")


def store_api_key():
    """Store an API key"""
    print("\n💾 Store API Key:")
    print("-" * 20)

    service = input(
        "Enter service name (e.g., openai, anthropic): ").strip().lower()
    api_key = input(f"Enter {service} API key: ").strip()

    if not api_key:
        print("❌ API key cannot be empty")
        return

    success = credential_manager.store_api_key(service, api_key)
    if success:
        print(f"✅ {service} API key stored successfully")
    else:
        print(f"❌ Failed to store {service} API key")


def store_gcp_credentials():
    """Store GCP credentials"""
    print("\n💾 Store GCP Credentials:")
    print("-" * 25)

    print("Enter GCP service account JSON (paste the entire JSON):")
    print("(Press Ctrl+D when done)")

    try:
        json_input = ""
        while True:
            line = input()
            json_input += line + "\n"
    except EOFError:
        pass

    if not json_input.strip():
        print("❌ JSON cannot be empty")
        return

    try:
        import json
        credentials = json.loads(json_input)
        success = credential_manager.store_gcp_credentials(credentials)
        if success:
            print("✅ GCP credentials stored successfully")
        else:
            print("❌ Failed to store GCP credentials")
    except json.JSONDecodeError:
        print("❌ Invalid JSON format")


if __name__ == "__main__":
    main()
