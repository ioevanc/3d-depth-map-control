#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Crystal Etching Converter - Server Restart Script${NC}"
echo "================================================"

# Kill existing servers
echo -e "\n${RED}Stopping existing servers...${NC}"

# Kill backend server on port 8000
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Killing process on port 8000..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 1
else
    echo "No process found on port 8000"
fi

# Kill frontend server on port 5176
if lsof -Pi :5176 -sTCP:LISTEN -t >/dev/null ; then
    echo "Killing process on port 5176..."
    lsof -ti:5176 | xargs kill -9 2>/dev/null
    sleep 1
else
    echo "No process found on port 5176"
fi

# Also kill any uvicorn or vite processes that might be hanging
pkill -f "uvicorn.*main:app" 2>/dev/null
pkill -f "vite.*port 5176" 2>/dev/null

echo -e "${GREEN}Servers stopped.${NC}"

# Start backend server
echo -e "\n${YELLOW}Starting backend server...${NC}"
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend
source venv/bin/activate
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Waiting for backend to start..."
sleep 5

# Check if backend started successfully
for i in {1..10}; do
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓ Backend server started successfully on port 8000 (PID: $BACKEND_PID)${NC}"
        break
    else
        if [ $i -eq 10 ]; then
            echo -e "${RED}✗ Failed to start backend server${NC}"
            echo "Check backend.log for errors"
            tail -10 /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend/backend.log
            exit 1
        fi
        echo -n "."
        sleep 1
    fi
done

# Start frontend server
echo -e "\n${YELLOW}Starting frontend server...${NC}"
cd /home/glassogroup-3d/htdocs/3d.glassogroup.com/frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Waiting for frontend to start..."
sleep 5

# Check if frontend started successfully
for i in {1..15}; do
    if lsof -Pi :5176 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓ Frontend server started successfully on port 5176 (PID: $FRONTEND_PID)${NC}"
        break
    else
        if [ $i -eq 15 ]; then
            echo -e "${RED}✗ Failed to start frontend server${NC}"
            echo "Check frontend.log for errors"
            tail -10 /home/glassogroup-3d/htdocs/3d.glassogroup.com/frontend/frontend.log
            exit 1
        fi
        echo -n "."
        sleep 1
    fi
done

echo -e "\n${GREEN}Both servers are running!${NC}"
echo "================================================"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5176"
echo ""
echo "To check logs:"
echo "  Backend:  tail -f /home/glassogroup-3d/htdocs/3d.glassogroup.com/backend/backend.log"
echo "  Frontend: tail -f /home/glassogroup-3d/htdocs/3d.glassogroup.com/frontend/frontend.log"
echo ""
echo "To stop servers, run: $0 (this script again)"