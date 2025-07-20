#!/bin/bash

# Test script for Crystal Etching Converter API

echo "Testing Crystal Etching Converter API..."

# Check if API is running
echo -n "Checking if API is accessible... "
if curl -s http://localhost:8000/ > /dev/null; then
    echo "OK"
else
    echo "FAILED"
    echo "Please ensure the API is running: uvicorn main:app --host 0.0.0.0 --port 8000"
    exit 1
fi

# Create a test image if it doesn't exist
if [ ! -f "test_image.jpg" ]; then
    echo "Creating test image..."
    # Create a simple test image using ImageMagick (if available) or download a sample
    if command -v convert &> /dev/null; then
        convert -size 300x300 plasma: test_image.jpg
    else
        echo "Please provide a test_image.jpg file for testing"
        exit 1
    fi
fi

# Test the /process endpoint
echo "Testing /process endpoint..."
response=$(curl -s -w "\n%{http_code}" -F "image=@test_image.jpg" http://localhost:8000/process)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo "Success! Response:"
    echo "$body" | python3 -m json.tool
    
    # Extract URLs from response
    depth_map_url=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin)['depth_map_url'])")
    dxf_url=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin)['dxf_url'])")
    
    echo ""
    echo "Depth map URL: http://localhost:8000$depth_map_url"
    echo "DXF URL: http://localhost:8000$dxf_url"
    
    # Try to download the files
    echo ""
    echo "Downloading generated files..."
    curl -s "http://localhost:8000$depth_map_url" -o test_depth_map.png
    curl -s "http://localhost:8000$dxf_url" -o test_output.dxf
    
    echo "Files saved as:"
    echo "  - test_depth_map.png"
    echo "  - test_output.dxf"
else
    echo "Failed with HTTP code: $http_code"
    echo "Response: $body"
fi