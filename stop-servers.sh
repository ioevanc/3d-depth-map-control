#!/bin/bash

echo "Stopping servers..."

# Kill frontend server
pkill -f "npm run dev"

# Kill backend server
pkill -f "uvicorn main:app"

echo "Servers stopped."