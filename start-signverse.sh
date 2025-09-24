#!/bin/bash

# SignVerse Startup Script
# This script starts both the frontend and backend services
# Usage: ./start-signverse.sh [options]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=9002
BACKEND_PORT=5001
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
VENV_DIR="backend/venv"

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

print_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Start SignVerse frontend and backend services"
    echo ""
    echo "Options:"
    echo "  --frontend-only    Start only the frontend"
    echo "  --backend-only     Start only the backend"
    echo "  --https            Start frontend with HTTPS (default)"
    echo "  --http             Start frontend with HTTP"
    echo "  --build            Build frontend before starting (default)"
    echo "  --no-build         Skip frontend build"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Start both with HTTPS and build"
    echo "  $0 --http          # Start both with HTTP"
    echo "  $0 --frontend-only # Start only frontend"
    echo "  $0 --backend-only  # Start only backend"
    echo "  $0 --no-build      # Start without building frontend"
    echo ""
}

# Function to check if required directories exist
check_directories() {
    print_step "Checking project structure..."
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    if [ ! -d "$VENV_DIR" ]; then
        print_error "Virtual environment not found: $VENV_DIR"
        print_info "Please create the virtual environment first:"
        print_info "  cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
        exit 1
    fi
    
    print_success "Project structure verified"
}

# Function to check if ports are available
check_ports() {
    print_step "Checking port availability..."
    
    # Check frontend port
    if netstat -tlnp 2>/dev/null | grep -q ":$FRONTEND_PORT "; then
        print_warning "Port $FRONTEND_PORT is already in use"
        print_info "You may need to stop the existing service or use a different port"
    else
        print_success "Port $FRONTEND_PORT is available"
    fi
    
    # Check backend port
    if netstat -tlnp 2>/dev/null | grep -q ":$BACKEND_PORT "; then
        print_warning "Port $BACKEND_PORT is already in use"
        print_info "You may need to stop the existing service or use a different port"
    else
        print_success "Port $BACKEND_PORT is available"
    fi
}

# Function to check SSL certificates for HTTPS
check_ssl_certificates() {
    if [ "$USE_HTTPS" = true ]; then
        print_step "Checking SSL certificates..."
        
        if [ ! -f "certs/server.key" ] || [ ! -f "certs/server.crt" ]; then
            print_warning "SSL certificates not found"
            print_info "Generating SSL certificates..."
            
            # Get current IP address
            local ip=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null)
            if [ -z "$ip" ]; then
                ip="192.168.1.8"  # Default fallback
            fi
            
            if [ -f "scripts/generate-ssl-cert.sh" ]; then
                ./scripts/generate-ssl-cert.sh "$ip"
                print_success "SSL certificates generated"
            else
                print_error "SSL certificate generation script not found"
                print_info "Please run: ./scripts/generate-ssl-cert.sh <IP_ADDRESS>"
                exit 1
            fi
        else
            print_success "SSL certificates found"
        fi
    fi
}

# Function to build frontend
build_frontend() {
    if [ "$BUILD_FRONTEND" = true ]; then
        print_step "Building frontend..."
        
        cd "$FRONTEND_DIR"
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            print_info "Installing frontend dependencies..."
            npm install
        fi
        
        # Build the frontend
        print_info "Building Next.js application..."
        npm run build
        
        cd ..
        print_success "Frontend build completed"
    else
        print_info "Skipping frontend build"
    fi
}

# Function to start backend
start_backend() {
    if [ "$START_BACKEND" = true ]; then
        print_step "Starting backend server..."
        
        cd "$BACKEND_DIR"
        
        # Activate virtual environment
        print_info "Activating virtual environment..."
        source venv/bin/activate
        
        # Check if requirements are installed
        if ! python -c "import fastapi" 2>/dev/null; then
            print_info "Installing backend dependencies..."
            pip install -r requirements.txt
        fi
        
        # Start the backend server
        print_info "Starting FastAPI server on port $BACKEND_PORT..."
        print_success "Backend server starting..."
        
        # Start backend in background
        python run.py &
        BACKEND_PID=$!
        
        cd ..
        
        # Wait a moment for backend to start
        sleep 3
        
        # Check if backend is running
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_success "Backend server started successfully (PID: $BACKEND_PID)"
        else
            print_error "Backend server failed to start"
            exit 1
        fi
    fi
}

# Function to start frontend
start_frontend() {
    if [ "$START_FRONTEND" = true ]; then
        print_step "Starting frontend server..."
        
        cd "$FRONTEND_DIR"
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            print_info "Installing frontend dependencies..."
            npm install
        fi
        
        # Start the frontend server
        if [ "$USE_HTTPS" = true ]; then
            print_info "Starting Next.js server with HTTPS on port $FRONTEND_PORT..."
            print_success "Frontend server starting with HTTPS..."
            npm run dev:https &
        else
            print_info "Starting Next.js server with HTTP on port $FRONTEND_PORT..."
            print_success "Frontend server starting with HTTP..."
            npm run dev &
        fi
        
        FRONTEND_PID=$!
        cd ..
        
        # Wait a moment for frontend to start
        sleep 3
        
        # Check if frontend is running
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_success "Frontend server started successfully (PID: $FRONTEND_PID)"
        else
            print_error "Frontend server failed to start"
            exit 1
        fi
    fi
}

# Function to display startup information
show_startup_info() {
    local ip=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null)
    if [ -z "$ip" ]; then
        ip="localhost"
    fi
    
    echo ""
    echo "=========================================="
    print_header "SignVerse Services Started Successfully!"
    echo "=========================================="
    echo ""
    
    if [ "$START_BACKEND" = true ]; then
        print_info "Backend API:"
        echo "  • URL: http://$ip:$BACKEND_PORT"
        echo "  • Docs: http://$ip:$BACKEND_PORT/docs"
        echo "  • PID: $BACKEND_PID"
        echo ""
    fi
    
    if [ "$START_FRONTEND" = true ]; then
        print_info "Frontend Application:"
        if [ "$USE_HTTPS" = true ]; then
            echo "  • URL: https://$ip:$FRONTEND_PORT"
            echo "  • HTTPS: Enabled (self-signed certificate)"
        else
            echo "  • URL: http://$ip:$FRONTEND_PORT"
            echo "  • HTTPS: Disabled"
        fi
        echo "  • PID: $FRONTEND_PID"
        echo ""
    fi
    
    print_info "Access Information:"
    echo "  • Local access: Use localhost or 127.0.0.1"
    echo "  • Remote access: Use $ip from other devices on the network"
    echo ""
    
    if [ "$USE_HTTPS" = true ]; then
        print_warning "HTTPS Notes:"
        echo "  • Accept the self-signed certificate in your browser"
        echo "  • Some browsers may show security warnings"
        echo ""
    fi
    
    print_info "To stop the services:"
    echo "  • Press Ctrl+C to stop this script"
    echo "  • Or run: kill $BACKEND_PID $FRONTEND_PID"
    echo ""
}

# Function to handle cleanup on exit
cleanup() {
    echo ""
    print_info "Shutting down services..."
    
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        print_info "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
    fi
    
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        print_info "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    fi
    
    print_success "All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Default values
START_FRONTEND=true
START_BACKEND=true
USE_HTTPS=true
BUILD_FRONTEND=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend-only)
            START_BACKEND=false
            shift
            ;;
        --backend-only)
            START_FRONTEND=false
            shift
            ;;
        --https)
            USE_HTTPS=true
            shift
            ;;
        --http)
            USE_HTTPS=false
            shift
            ;;
        --build)
            BUILD_FRONTEND=true
            shift
            ;;
        --no-build)
            BUILD_FRONTEND=false
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "=========================================="
    print_header "SignVerse Startup Script"
    echo "=========================================="
    echo ""
    
    # Check project structure
    check_directories
    
    # Check port availability
    check_ports
    
    # Check SSL certificates if using HTTPS
    check_ssl_certificates
    
    # Build frontend if requested
    build_frontend
    
    # Start backend
    start_backend
    
    # Start frontend
    start_frontend
    
    # Show startup information
    show_startup_info
    
    # Wait for user interrupt
    print_info "Services are running. Press Ctrl+C to stop all services..."
    
    # Keep script running and wait for interrupt
    while true; do
        sleep 1
        # Check if processes are still running
        if [ ! -z "$BACKEND_PID" ] && ! kill -0 $BACKEND_PID 2>/dev/null; then
            print_error "Backend server stopped unexpectedly"
            cleanup
        fi
        if [ ! -z "$FRONTEND_PID" ] && ! kill -0 $FRONTEND_PID 2>/dev/null; then
            print_error "Frontend server stopped unexpectedly"
            cleanup
        fi
    done
}

# Run main function
main "$@"
