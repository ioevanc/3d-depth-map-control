"""
Crystal Etching Converter API
Converts 2D photos to depth maps and DXF files for subsurface laser etching
"""

import os
import uuid
from pathlib import Path
from typing import Optional
import tempfile
import shutil

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime
from dotenv import load_dotenv

import numpy as np
from PIL import Image
import cv2
import torch
from transformers import pipeline
import ezdxf
from ezdxf.addons import r12writer

load_dotenv()

MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", 5)) * 1024 * 1024
MAX_DEPTH_MM = float(os.getenv("MAX_DEPTH_MM", 50))
PIXEL_SAMPLING_RATE = int(os.getenv("PIXEL_SAMPLING_RATE", 2))

app = FastAPI(title="Crystal Etching Converter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path("static")
STATIC_DIR.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

depth_estimator = None

class ProcessingResponse(BaseModel):
    original_url: str
    depth_map_url: str
    dxf_url: str
    message: str

class FileInfo(BaseModel):
    filename: str
    timestamp: datetime
    size: int
    type: str  # 'depth_map' or 'dxf'
    url: str

class FilesListResponse(BaseModel):
    files: List[FileInfo]
    total_count: int

def get_depth_estimator():
    global depth_estimator
    if depth_estimator is None:
        print("Loading depth estimation model (CPU-only)...")
        depth_estimator = pipeline(
            "depth-estimation",
            model="depth-anything/Depth-Anything-V2-Small-hf",
            device="cpu"
        )
        print("Model loaded successfully")
    return depth_estimator

def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded file is a valid image"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (JPG/PNG)")
    
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(400, "Only JPG and PNG formats are supported")
    
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File size must be less than {MAX_FILE_SIZE // 1024 // 1024}MB")

def generate_depth_map(image_path: str, output_path: str) -> None:
    """Generate depth map from image using Depth Anything V2"""
    try:
        image = Image.open(image_path).convert("RGB")
        
        estimator = get_depth_estimator()
        depth = estimator(image)["depth"]
        
        depth_array = np.array(depth)
        depth_normalized = ((depth_array - depth_array.min()) / 
                          (depth_array.max() - depth_array.min()) * 255).astype(np.uint8)
        
        depth_image = Image.fromarray(depth_normalized, mode='L')
        depth_image.save(output_path, "PNG")
        
    except Exception as e:
        raise HTTPException(500, f"Depth map generation failed: {str(e)}")

def depth_map_to_dxf(depth_map_path: str, dxf_path: str) -> None:
    """Convert depth map to DXF point cloud for laser etching"""
    try:
        depth_image = cv2.imread(depth_map_path, cv2.IMREAD_GRAYSCALE)
        if depth_image is None:
            raise ValueError("Failed to load depth map")
        
        height, width = depth_image.shape
        
        doc = ezdxf.new('R12')
        msp = doc.modelspace()
        
        points_added = 0
        for y in range(0, height, PIXEL_SAMPLING_RATE):
            for x in range(0, width, PIXEL_SAMPLING_RATE):
                depth_value = depth_image[y, x]
                
                if depth_value > 0:
                    z = (depth_value / 255.0) * MAX_DEPTH_MM
                    
                    msp.add_point((x, height - y, z))
                    points_added += 1
        
        doc.saveas(dxf_path)
        print(f"DXF created with {points_added} points")
        
    except Exception as e:
        raise HTTPException(500, f"DXF generation failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Crystal Etching Converter API", "endpoints": ["/process", "/files"]}

@app.post("/process", response_model=ProcessingResponse)
async def process_image(image: UploadFile = File(...)):
    """Process uploaded image to generate depth map and DXF"""
    
    validate_image_file(image)
    
    unique_id = str(uuid.uuid4())
    temp_dir = Path(tempfile.mkdtemp())
    
    try:
        input_path = temp_dir / f"input_{unique_id}{Path(image.filename).suffix}"
        with open(input_path, "wb") as f:
            content = await image.read()
            f.write(content)
        
        # Save the original image
        original_filename = f"original_{unique_id}{Path(image.filename).suffix}"
        original_path = STATIC_DIR / original_filename
        shutil.copy2(input_path, original_path)
        
        depth_map_filename = f"depth_map_{unique_id}.png"
        dxf_filename = f"output_{unique_id}.dxf"
        
        depth_map_path = STATIC_DIR / depth_map_filename
        dxf_path = STATIC_DIR / dxf_filename
        
        generate_depth_map(str(input_path), str(depth_map_path))
        
        depth_map_to_dxf(str(depth_map_path), str(dxf_path))
        
        return ProcessingResponse(
            original_url=f"/static/{original_filename}",
            depth_map_url=f"/static/{depth_map_filename}",
            dxf_url=f"/static/{dxf_filename}",
            message="Processing completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.get("/files", response_model=FilesListResponse)
async def list_files():
    """List all previously converted files"""
    files_info = []
    
    # Get all files in static directory
    for file_path in STATIC_DIR.glob("*"):
        if file_path.is_file() and file_path.suffix in ['.png', '.jpg', '.jpeg', '.dxf']:
            # Determine file type
            if file_path.name.startswith('original_'):
                file_type = 'original'
            elif file_path.suffix == '.png':
                file_type = 'depth_map'
            else:
                file_type = 'dxf'
            
            # Get file stats
            stat = file_path.stat()
            
            files_info.append(FileInfo(
                filename=file_path.name,
                timestamp=datetime.fromtimestamp(stat.st_mtime),
                size=stat.st_size,
                type=file_type,
                url=f"/static/{file_path.name}"
            ))
    
    # Sort by timestamp (newest first)
    files_info.sort(key=lambda x: x.timestamp, reverse=True)
    
    return FilesListResponse(
        files=files_info,
        total_count=len(files_info)
    )

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    """Delete a specific file and its related files"""
    file_path = STATIC_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    
    if file_path.suffix not in ['.png', '.jpg', '.jpeg', '.dxf']:
        raise HTTPException(400, "Invalid file type")
    
    try:
        # Extract UUID from filename
        import re
        uuid_pattern = r'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'
        match = re.search(uuid_pattern, filename)
        
        if match:
            uuid = match.group(1)
            # Delete all related files with the same UUID
            related_files = [
                f"original_{uuid}.png",
                f"original_{uuid}.jpg", 
                f"original_{uuid}.jpeg",
                f"depth_map_{uuid}.png",
                f"output_{uuid}.dxf"
            ]
            
            deleted_files = []
            for related_file in related_files:
                related_path = STATIC_DIR / related_file
                if related_path.exists():
                    related_path.unlink()
                    deleted_files.append(related_file)
            
            return {"message": f"Deleted {len(deleted_files)} related files", "deleted": deleted_files}
        else:
            # If no UUID found, just delete the single file
            file_path.unlink()
            return {"message": f"File {filename} deleted successfully"}
            
    except Exception as e:
        raise HTTPException(500, f"Failed to delete file: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Pre-load the model on startup"""
    try:
        get_depth_estimator()
    except Exception as e:
        print(f"Warning: Failed to pre-load model: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=os.getenv("API_HOST", "0.0.0.0"), 
        port=int(os.getenv("API_PORT", 8000))
    )