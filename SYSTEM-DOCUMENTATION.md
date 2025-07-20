# Crystal Etching Converter - System Documentation

**Version:** 1.0  
**Last Updated:** July 20, 2025

## System Overview

The Crystal Etching Converter is a web-based application that transforms 2D photographs into 3D depth maps and DXF files for subsurface laser etching (SSLE) in crystal blocks. It serves awards and trophy manufacturers by replacing expensive external conversion services.

## Architecture

### High-Level Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Browser   │────▶│   Nginx Proxy   │────▶│  FastAPI Backend │
│  (React + MUI)  │◀────│  (Port 80/443)  │◀────│   (Port 8000)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ Depth Anything  │
                                                 │    V2 Model     │
                                                 └─────────────────┘
```

### Technology Stack

#### Backend
- **FastAPI**: Modern Python web framework
- **Transformers**: Hugging Face library for AI models
- **Depth Anything V2**: Monocular depth estimation model
- **PyTorch**: Deep learning framework (CPU-only)
- **ezdxf**: DXF file generation
- **OpenCV + Pillow**: Image processing

#### Frontend
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Material-UI (MUI)**: Component library
- **Three.js**: 3D graphics for point cloud visualization
- **React Three Fiber**: React renderer for Three.js
- **Axios**: HTTP client

#### Infrastructure
- **Ubuntu 24.04**: Operating system
- **Nginx**: Reverse proxy and static file serving
- **CloudPanel**: Web hosting control panel
- **Systemd**: Service management

## Core Components

### 1. Image Processing Pipeline
```
Input Image → AI Model → Depth Map → Point Cloud → DXF Export
```

**Process Flow:**
1. User uploads JPG/PNG image (max 5MB)
2. Depth Anything V2 generates depth map
3. Depth values normalized to 0-255 grayscale
4. Point cloud created by sampling pixels
5. DXF file exported with 3D POINT entities

### 2. File Management System
- Stores processed files in `backend/static/`
- Tracks metadata (size, timestamp, type)
- Provides listing, download, and deletion
- Files named with UUIDs to prevent conflicts

### 3. User Interface Components

#### Upload Interface
- Drag-and-drop zone
- File validation (type, size)
- Preview display
- Progress indication

#### Visualization Tools
- **Depth Map Viewer**
  - Interactive hover showing depth values
  - Multiple color modes
  - Real-time cursor tracking
- **DXF Viewer**
  - 3D point cloud rendering
  - Interactive controls (rotate, zoom, pan)
  - Statistics display

#### File Browser
- Floating action button access
- Search functionality
- Separate sections for file types
- Batch operations support

## API Endpoints

### POST /process
Processes uploaded image to generate depth map and DXF.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `image` (file)

**Response:**
```json
{
  "depth_map_url": "/static/depth_map_uuid.png",
  "dxf_url": "/static/output_uuid.dxf",
  "message": "Processing completed successfully"
}
```

### GET /files
Lists all previously converted files.

**Response:**
```json
{
  "files": [
    {
      "filename": "depth_map_uuid.png",
      "timestamp": "2025-07-20T08:30:00",
      "size": 1048576,
      "type": "depth_map",
      "url": "/static/depth_map_uuid.png"
    }
  ],
  "total_count": 10
}
```

### DELETE /files/{filename}
Deletes a specific file.

**Response:**
```json
{
  "message": "File deleted successfully"
}
```

## Configuration

### Environment Variables (.env)
```
MAX_FILE_SIZE_MB=5      # Maximum upload size
MAX_DEPTH_MM=50         # Maximum depth for 3D effect
PIXEL_SAMPLING_RATE=2   # Point cloud density
API_HOST=0.0.0.0       # API bind address
API_PORT=8000          # API port
```

### Performance Optimization
- CPU-only deployment (no GPU required)
- Model loaded once on startup
- Pixel sampling reduces point count
- Static file caching via Nginx

## Security Considerations

### Input Validation
- File type restriction (JPG/PNG only)
- File size limit (5MB default)
- Filename sanitization
- CORS configuration

### Best Practices
- No hardcoded credentials
- Environment-based configuration
- Secure file storage
- Error message sanitization

## Deployment

### System Requirements
- CPU: 1 vCPU minimum
- RAM: 2GB minimum (4GB recommended)
- Storage: 10GB minimum
- OS: Ubuntu 24.04 LTS

### Service Management
```bash
# Backend service
sudo systemctl start fastapi
sudo systemctl enable fastapi

# Check status
sudo systemctl status fastapi

# View logs
sudo journalctl -u fastapi -f
```

## Monitoring

### Health Checks
- Backend: `GET /` returns API info
- Frontend: Vite dev server status
- File system: Check static directory size

### Performance Metrics
- Processing time: ~5-10 seconds per image
- Memory usage: ~500MB idle, ~1GB processing
- Storage: ~1-2MB per conversion

## Troubleshooting

### Common Issues
1. **Model Loading Failure**
   - Check internet connection (first run)
   - Verify disk space for model cache
   - Check Python environment

2. **Processing Timeout**
   - Increase Nginx proxy timeout
   - Check server resources
   - Reduce image size

3. **File Access Errors**
   - Verify directory permissions
   - Check disk space
   - Validate file paths

## Future Enhancements
- Batch processing support
- WebSocket for real-time progress
- Database for file metadata
- User authentication system
- Cloud storage integration