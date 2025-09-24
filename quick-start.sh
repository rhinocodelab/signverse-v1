#!/bin/bash

# SignVerse Quick Start Script
# Simple script to quickly start both services for development

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Use localhost for development
IP="localhost"

echo "=========================================="
echo "    SignVerse Quick Start"
echo "=========================================="
echo ""

# Function to stop existing services
stop_services() {
    print_info "Stopping existing services..."
    
    # Stop backend (port 5001)
    BACKEND_PID=$(lsof -ti:5001 2>/dev/null || echo "")
    if [ ! -z "$BACKEND_PID" ]; then
        print_info "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        sleep 1
    fi
    
    # Stop frontend (port 9002)
    FRONTEND_PID=$(lsof -ti:9002 2>/dev/null || echo "")
    if [ ! -z "$FRONTEND_PID" ]; then
        print_info "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 1
    fi
    
    # Kill any remaining processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    print_success "Existing services stopped"
    echo ""
}

# Function to cleanup on exit
cleanup() {
    echo ""
    print_info "Stopping services..."
    jobs -p | xargs -r kill
    print_success "Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Stop existing services first
stop_services

# Wait a moment to ensure ports are free
sleep 2

# Build frontend first
print_info "Building frontend..."
cd frontend
npm run build
print_success "Frontend build completed"
cd ..

# Start backend
print_info "Starting backend server..."
cd backend
source venv/bin/activate
python run_https.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
print_info "Starting frontend server..."
cd frontend
npm run dev:https &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

echo ""
echo "=========================================="
print_success "SignVerse Started Successfully!"
echo "=========================================="
echo ""
print_info "Access URLs:"
echo "  • Frontend: https://$IP:9002"
echo "  • Backend:  https://$IP:5001"
echo "  • API Docs: https://$IP:5001/docs"
echo ""
print_warning "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
wait
