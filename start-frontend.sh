#!/bin/bash

# Frontend Server Startup Script
echo -e "\033[1;34m=== Starting Frontend Server ===\033[0m"

# Kill any existing process on port 5176
if lsof -ti:5176 > /dev/null 2>&1; then
    echo "Stopping existing frontend server..."
    lsof -ti:5176 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Navigate to frontend directory
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com/frontend

# Start frontend server
echo "Starting frontend server on port 5176..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Quick check if process started
sleep 2
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "\033[0;32m✓ Frontend server started successfully (PID: $FRONTEND_PID)\033[0m"
    echo "Server URL: http://localhost:5176"
    echo "Log file: frontend/frontend.log"
else
    echo -e "\033[0;31m✗ Failed to start frontend server\033[0m"
    echo "Check frontend/frontend.log for errors"
    exit 1
fi