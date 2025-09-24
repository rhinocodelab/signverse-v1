#!/bin/bash

# SignVerse SSL Certificate Generator
# This script generates self-signed SSL certificates for HTTPS access to the frontend
# Usage: ./generate-ssl-cert.sh <IPv4_ADDRESS>

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

# Function to check if required tools are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is not installed. Please install it first."
        print_info "Ubuntu/Debian: sudo apt-get install openssl"
        print_info "CentOS/RHEL: sudo yum install openssl"
        exit 1
    fi
    
    print_success "OpenSSL is available"
}

# Function to generate SSL certificate
generate_certificate() {
    local ip_address=$1
    local cert_dir="certs"
    local key_file="$cert_dir/server.key"
    local cert_file="$cert_dir/server.crt"
    local config_file="$cert_dir/openssl.conf"
    
    print_info "Generating SSL certificate for IP: $ip_address"
    
    # Create certificates directory
    mkdir -p "$cert_dir"
    
    # Create OpenSSL configuration file
    cat > "$config_file" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=State
L=City
O=SignVerse
OU=Development
CN=$ip_address

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = $ip_address
IP.2 = 127.0.0.1
IP.3 = ::1
DNS.1 = localhost
EOF

    print_info "Generating private key..."
    openssl genrsa -out "$key_file" 2048
    
    print_info "Generating certificate signing request..."
    openssl req -new -key "$key_file" -out "$cert_dir/server.csr" -config "$config_file"
    
    print_info "Generating self-signed certificate..."
    openssl x509 -req -in "$cert_dir/server.csr" -signkey "$key_file" -out "$cert_file" -days 365 -extensions v3_req -extfile "$config_file"
    
    # Clean up CSR file
    rm "$cert_dir/server.csr"
    
    print_success "SSL certificate generated successfully!"
    print_info "Certificate file: $cert_file"
    print_info "Private key file: $key_file"
    print_info "Valid for 365 days"
}

# Function to set proper permissions
set_permissions() {
    local cert_dir="certs"
    
    print_info "Setting proper file permissions..."
    chmod 600 "$cert_dir/server.key"
    chmod 644 "$cert_dir/server.crt"
    chmod 644 "$cert_dir/openssl.conf"
    
    print_success "File permissions set correctly"
}

# Function to display usage information
show_usage() {
    echo "Usage: $0 <IPv4_ADDRESS>"
    echo ""
    echo "This script generates self-signed SSL certificates for HTTPS access to the SignVerse frontend."
    echo ""
    echo "Arguments:"
    echo "  IPv4_ADDRESS    The IPv4 address where the frontend will be accessed"
    echo ""
    echo "Examples:"
    echo "  $0 192.168.1.100"
    echo "  $0 10.0.0.5"
    echo "  $0 172.16.0.10"
    echo ""
    echo "After running this script:"
    echo "  1. The certificates will be created in the 'certs' directory"
    echo "  2. Configure Next.js to use HTTPS with these certificates"
    echo "  3. Access the frontend at: https://$1:3000"
}

# Function to create Next.js HTTPS configuration
create_nextjs_config() {
    local ip_address=$1
    local config_file="frontend/next.config.https.js"
    
    print_info "Creating Next.js HTTPS configuration..."
    
    cat > "$config_file" << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable HTTPS in development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
EOF

    print_success "Next.js HTTPS configuration created: $config_file"
}

# Function to create package.json script for HTTPS
create_https_script() {
    local ip_address=$1
    local package_json="frontend/package.json"
    
    print_info "Adding HTTPS development script to package.json..."
    
    # Check if package.json exists
    if [ ! -f "$package_json" ]; then
        print_warning "package.json not found in frontend directory"
        return
    fi
    
    # Create a backup
    cp "$package_json" "$package_json.backup"
    
    # Add HTTPS script (this is a simplified approach - in practice, you'd use jq or similar)
    print_info "Please manually add this script to your package.json:"
    echo ""
    echo "  \"scripts\": {"
    echo "    \"dev:https\": \"next dev -H $ip_address -p 3000 --experimental-https --experimental-https-key ./certs/server.key --experimental-https-cert ./certs/server.crt\""
    echo "  }"
    echo ""
    print_warning "Note: Next.js experimental HTTPS flags may vary by version"
}

# Main function
main() {
    echo "=========================================="
    echo "    SignVerse SSL Certificate Generator"
    echo "=========================================="
    echo ""
    
    # Check if IP address is provided
    if [ $# -eq 0 ]; then
        print_error "No IP address provided"
        echo ""
        show_usage
        exit 1
    fi
    
    local ip_address=$1
    
    # Validate IP address
    if ! validate_ip "$ip_address"; then
        print_error "Invalid IPv4 address: $ip_address"
        echo ""
        show_usage
        exit 1
    fi
    
    print_success "Valid IPv4 address: $ip_address"
    
    # Check dependencies
    check_dependencies
    
    # Generate certificate
    generate_certificate "$ip_address"
    
    # Set permissions
    set_permissions
    
    # Create Next.js configuration
    create_nextjs_config "$ip_address"
    
    # Create HTTPS script info
    create_https_script "$ip_address"
    
    echo ""
    echo "=========================================="
    print_success "SSL Certificate Generation Complete!"
    echo "=========================================="
    echo ""
    print_info "Next steps:"
    echo "1. Certificates are ready in the 'certs' directory"
    echo "2. Configure Next.js to use HTTPS (see instructions above)"
    echo "3. Start the frontend with HTTPS enabled"
    echo "4. Access your application at: https://$ip_address:3000"
    echo ""
    print_warning "Note: You may need to accept the self-signed certificate in your browser"
    print_warning "Note: Some browsers may show security warnings for self-signed certificates"
    echo ""
}

# Run main function with all arguments
main "$@"
