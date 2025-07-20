# Crystal Etching Converter - 2D to 3D for Awards & Trophies

A web-based system for converting 2D photos into depth maps and DXF files for subsurface laser etching (SSLE) in crystal blocks. This tool replaces external paid services, allowing in-house processing for awards and trophy manufacturing.

## Features

- **AI-Powered Depth Estimation**: Uses Depth Anything V2 to generate depth maps from single photos
- **DXF Export**: Converts depth maps to 3D point clouds in DXF format for laser etching machines
- **Web Interface**: Modern React frontend with drag-and-drop upload
- **CPU-Only**: Optimized to run on low-spec servers without GPU requirements
- **Self-Hosted**: Complete control over your data and processing

## Technology Stack

- **Backend**: FastAPI (Python) with Depth Anything V2 Small model
- **Frontend**: React with Vite and Material-UI
- **Deployment**: Nginx with CloudPanel on Ubuntu

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install torch==2.4.0+cpu torchvision==0.19.0+cpu torchaudio==2.4.0+cpu -f https://download.pytorch.org/whl/torch_stable.html
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Usage

1. Upload a JPG or PNG photo (max 5MB)
2. Click "Generate Depth Map & DXF"
3. Download the depth map preview and DXF file
4. Load the DXF into your laser etching machine

## Configuration

Edit `backend/.env` to customize:
- `MAX_FILE_SIZE_MB`: Maximum upload size (default: 5)
- `MAX_DEPTH_MM`: Maximum depth for 3D effect (default: 50)
- `PIXEL_SAMPLING_RATE`: Point cloud density (default: 2)

## License

Based on open-source models (Apache 2.0). Commercial use permitted.