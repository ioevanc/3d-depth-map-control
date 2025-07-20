#!/bin/bash

# Simple Server Restart Script
echo -e "\033[1;33m=== Restarting All Servers ===\033[0m"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Stop all servers first
echo "Stopping existing servers..."
"$SCRIPT_DIR/stop-servers.sh"
sleep 1

echo -e "\nStarting servers..."

# Start backend
"$SCRIPT_DIR/start-backend.sh"
if [ $? -ne 0 ]; then
    echo -e "\033[0;31mBackend failed to start\033[0m"
    exit 1
fi

# Start frontend
"$SCRIPT_DIR/start-frontend.sh"
if [ $? -ne 0 ]; then
    echo -e "\033[0;31mFrontend failed to start\033[0m"
    exit 1
fi

echo -e "\n\033[0;32m=== All servers running! ===\033[0m"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5176"