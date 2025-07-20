#!/bin/bash

# Backend Server Startup Script
echo -e "\033[1;34m=== Starting Backend Server ===\033[0m"

# Kill any existing process on port 8000
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "Stopping existing backend server..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Navigate to backend directory
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend

# Activate virtual environment and start server
echo "Starting backend server on port 8000..."
source venv/bin/activate
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!

# Quick check if process started
sleep 2
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "\033[0;32m✓ Backend server started successfully (PID: $BACKEND_PID)\033[0m"
    echo "Server URL: http://localhost:8000"
    echo "Log file: backend/backend.log"
else
    echo -e "\033[0;31m✗ Failed to start backend server\033[0m"
    echo "Check backend/backend.log for errors"
    exit 1
fi