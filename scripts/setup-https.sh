#!/bin/bash

# SignVerse HTTPS Setup Script
# This script sets up HTTPS for the SignVerse frontend
# Usage: ./setup-https.sh <IPv4_ADDRESS>

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get the current IP address
get_current_ip() {
    # Try to get the primary IP address
    local ip=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null)
    if [ -z "$ip" ]; then
        # Fallback to hostname -I
        ip=$(hostname -I | awk '{print $1}' 2>/dev/null)
    fi
    if [ -z "$ip" ]; then
        # Fallback to ifconfig
        ip=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    fi
    echo "$ip"
}

# Function to validate IPv4 address
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        local IFS='.'
        local -a ip_parts=($ip)
        for part in "${ip_parts[@]}"; do
            if ((part > 255)); then
                return 1
            fi
        done
        return 0
    else
        return 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [IPv4_ADDRESS]"
    echo ""
    echo "This script sets up HTTPS for the SignVerse frontend."
    echo ""
    echo "Arguments:"
    echo "  IPv4_ADDRESS    (Optional) The IPv4 address where the frontend will be accessed"
    echo "                  If not provided, will attempt to auto-detect the current IP"
    echo ""
    echo "Examples:"
    echo "  $0                    # Auto-detect IP address"
    echo "  $0 192.168.1.100     # Use specific IP address"
    echo "  $0 10.0.0.5          # Use specific IP address"
    echo ""
    echo "After running this script:"
    echo "  1. SSL certificates will be generated"
    echo "  2. Frontend will be configured for HTTPS"
    echo "  3. You can start the frontend with: npm run dev:https"
    echo "  4. Access the frontend at: https://<IP>:9002"
}

# Main function
main() {
    echo "=========================================="
    echo "    SignVerse HTTPS Setup"
    echo "=========================================="
    echo ""
    
    local ip_address=""
    
    # Get IP address
    if [ $# -eq 0 ]; then
        print_info "No IP address provided, attempting to auto-detect..."
        ip_address=$(get_current_ip)
        if [ -z "$ip_address" ]; then
            print_error "Could not auto-detect IP address"
            echo ""
            show_usage
            exit 1
        fi
        print_success "Auto-detected IP address: $ip_address"
    else
        ip_address=$1
        if ! validate_ip "$ip_address"; then
            print_error "Invalid IPv4 address: $ip_address"
            echo ""
            show_usage
            exit 1
        fi
        print_success "Using provided IP address: $ip_address"
    fi
    
    # Check if we're in the right directory
    if [ ! -d "frontend" ] || [ ! -d "scripts" ]; then
        print_error "Please run this script from the SignVerse project root directory"
        exit 1
    fi
    
    # Generate SSL certificates
    print_info "Generating SSL certificates..."
    if ! ./scripts/generate-ssl-cert.sh "$ip_address"; then
        print_error "Failed to generate SSL certificates"
        exit 1
    fi
    
    # Check if certificates were created
    if [ ! -f "certs/server.key" ] || [ ! -f "certs/server.crt" ]; then
        print_error "SSL certificates were not created successfully"
        exit 1
    fi
    
    print_success "SSL certificates generated successfully"
    
    # Update frontend environment for HTTPS
    print_info "Configuring frontend for HTTPS..."
    
    # Create or update .env.local for HTTPS
    local env_file="frontend/.env.local"
    if [ -f "$env_file" ]; then
        # Backup existing file
        cp "$env_file" "$env_file.backup"
        print_info "Backed up existing .env.local to .env.local.backup"
    fi
    
    # Create new .env.local with HTTPS configuration
    cat > "$env_file" << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1

# HTTPS Configuration
HOSTNAME=$ip_address
PORT=9002
EOF
    
    print_success "Frontend environment configured for HTTPS"
    
    echo ""
    echo "=========================================="
    print_success "HTTPS Setup Complete!"
    echo "=========================================="
    echo ""
    print_info "Next steps:"
    echo "1. Navigate to the frontend directory:"
    echo "   cd frontend"
    echo ""
    echo "2. Start the frontend with HTTPS:"
    echo "   npm run dev:https"
    echo ""
    echo "3. Access your application at:"
    echo "   https://$ip_address:9002"
    echo ""
    print_warning "Important notes:"
    echo "• You may need to accept the self-signed certificate in your browser"
    echo "• Some browsers may show security warnings for self-signed certificates"
    echo "• The backend API should also be configured for HTTPS in production"
    echo "• For production, use proper SSL certificates from a trusted CA"
    echo ""
    print_info "To stop the HTTPS server, press Ctrl+C"
    echo ""
}

# Run main function with all arguments
main "$@"
