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
import time
import hashlib

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime, timezone
from dotenv import load_dotenv

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
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
preview_cache = {}  # Simple in-memory cache
CACHE_EXPIRY = 60  # 60 seconds

class DepthMapParams(BaseModel):
    blur_amount: float = Field(default=0, ge=0, le=10, description="Gaussian blur amount")
    contrast: float = Field(default=1.0, ge=0.5, le=2.0, description="Contrast adjustment")
    brightness: int = Field(default=0, ge=-50, le=50, description="Brightness adjustment")
    edge_enhancement: float = Field(default=0, ge=0, le=1, description="Edge enhancement strength")
    invert_depth: bool = Field(default=False, description="Invert depth values")

class ProcessingRequest(BaseModel):
    parameters: DepthMapParams = Field(default_factory=DepthMapParams)

class ProcessingResponse(BaseModel):
    original_url: str
    depth_map_url: str
    dxf_url: str
    message: str
    parameters_used: Dict

class FileInfo(BaseModel):
    filename: str
    timestamp: datetime
    size: int
    type: str  # 'depth_map' or 'dxf'
    url: str

class FilesListResponse(BaseModel):
    files: List[FileInfo]
    total_count: int

class GroupedFile(BaseModel):
    uuid: str
    original_url: Optional[str] = None
    depth_map_url: Optional[str] = None
    dxf_url: Optional[str] = None
    timestamp: datetime
    total_size: int

class GroupedFilesResponse(BaseModel):
    groups: List[GroupedFile]
    total_groups: int

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

def apply_depth_parameters(depth_array: np.ndarray, params: DepthMapParams) -> np.ndarray:
    """Apply processing parameters to depth map"""
    processed = depth_array.copy()
    
    # Apply blur for noise reduction
    if params.blur_amount > 0:
        kernel_size = max(3, int(params.blur_amount * 2) + 1)  # Minimum kernel size of 3
        processed = cv2.GaussianBlur(processed, (kernel_size, kernel_size), 0)
    
    # Apply contrast and brightness adjustments
    if params.contrast != 1.0 or params.brightness != 0:
        # Convert to PIL for easier manipulation
        pil_image = Image.fromarray(processed)
        
        # Apply contrast
        if params.contrast != 1.0:
            enhancer = ImageEnhance.Contrast(pil_image)
            pil_image = enhancer.enhance(params.contrast)
        
        # Apply brightness
        if params.brightness != 0:
            enhancer = ImageEnhance.Brightness(pil_image)
            brightness_factor = 1.0 + (params.brightness / 100.0)
            pil_image = enhancer.enhance(brightness_factor)
        
        processed = np.array(pil_image)
    
    # Edge enhancement
    if params.edge_enhancement > 0:
        # Apply edge detection
        edges = cv2.Canny(processed, 50, 150)
        # Blend edges with original
        edge_weight = params.edge_enhancement * 0.3
        processed = cv2.addWeighted(processed, 1.0, edges, edge_weight, 0)
    
    # Invert depth if requested
    if params.invert_depth:
        processed = 255 - processed
    
    return processed

def generate_depth_map(image_path: str, output_path: str, params: DepthMapParams = None) -> None:
    """Generate depth map from image using Depth Anything V2"""
    try:
        image = Image.open(image_path).convert("RGB")
        
        estimator = get_depth_estimator()
        depth = estimator(image)["depth"]
        
        depth_array = np.array(depth)
        depth_normalized = ((depth_array - depth_array.min()) / 
                          (depth_array.max() - depth_array.min()) * 255).astype(np.uint8)
        
        # Apply processing parameters if provided
        if params:
            depth_normalized = apply_depth_parameters(depth_normalized, params)
        
        depth_image = Image.fromarray(depth_normalized, mode='L')
        depth_image.save(output_path, "PNG")
        
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"Depth map generation error: {error_details}")
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
async def process_image(
    image: UploadFile = File(...),
    blur_amount: float = 0,
    contrast: float = 1.0,
    brightness: int = 0,
    edge_enhancement: float = 0,
    invert_depth: bool = False
):
    """Process uploaded image to generate depth map and DXF with custom parameters"""
    
    validate_image_file(image)
    
    # Create parameter object
    params = DepthMapParams(
        blur_amount=blur_amount,
        contrast=contrast,
        brightness=brightness,
        edge_enhancement=edge_enhancement,
        invert_depth=invert_depth
    )
    
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
        
        generate_depth_map(str(input_path), str(depth_map_path), params)
        
        depth_map_to_dxf(str(depth_map_path), str(dxf_path))
        
        return ProcessingResponse(
            original_url=f"/static/{original_filename}",
            depth_map_url=f"/static/{depth_map_filename}",
            dxf_url=f"/static/{dxf_filename}",
            message="Processing completed successfully",
            parameters_used=params.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

class PreviewRequest(BaseModel):
    image_url: str
    blur_amount: float = 0
    contrast: float = 1.0
    brightness: int = 0
    edge_enhancement: float = 0
    invert_depth: bool = False

@app.post("/preview")
async def preview_depth_map(request: PreviewRequest):
    """Generate a preview of depth map with given parameters"""
    
    # Create cache key from request parameters
    cache_key = hashlib.md5(
        f"{request.image_url}_{request.blur_amount}_{request.contrast}_{request.brightness}_{request.edge_enhancement}_{request.invert_depth}".encode()
    ).hexdigest()
    
    # Check cache
    current_time = time.time()
    if cache_key in preview_cache:
        cached_data, timestamp = preview_cache[cache_key]
        if current_time - timestamp < CACHE_EXPIRY:
            return cached_data
        else:
            # Remove expired entry
            del preview_cache[cache_key]
    
    # Clean up old cache entries
    expired_keys = [k for k, (_, t) in preview_cache.items() if current_time - t >= CACHE_EXPIRY]
    for k in expired_keys:
        del preview_cache[k]
    
    # Create parameter object
    params = DepthMapParams(
        blur_amount=request.blur_amount,
        contrast=request.contrast,
        brightness=request.brightness,
        edge_enhancement=request.edge_enhancement,
        invert_depth=request.invert_depth
    )
    
    try:
        # Extract filename from URL
        filename = request.image_url.split('/')[-1]
        if not filename.startswith('original_'):
            raise HTTPException(400, "Invalid image URL")
        
        image_path = STATIC_DIR / filename
        if not image_path.exists():
            raise HTTPException(404, "Image not found")
        
        # Generate preview in memory
        temp_output = Path(tempfile.mktemp(suffix='.png'))
        
        generate_depth_map(str(image_path), str(temp_output), params)
        
        # Read the preview image
        with open(temp_output, 'rb') as f:
            preview_data = f.read()
        
        # Clean up temp file
        temp_output.unlink()
        
        # Return base64 encoded preview
        import base64
        preview_base64 = base64.b64encode(preview_data).decode('utf-8')
        
        result = {
            "preview": f"data:image/png;base64,{preview_base64}",
            "parameters": params.dict()
        }
        
        # Store in cache
        preview_cache[cache_key] = (result, current_time)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"Preview generation error: {error_details}")
        raise HTTPException(500, f"Preview generation failed: {str(e)}")

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

@app.get("/files/grouped", response_model=GroupedFilesResponse)
async def list_grouped_files():
    """List files grouped by UUID for better UX"""
    import re
    from collections import defaultdict
    
    groups = defaultdict(lambda: {
        'original_url': None,
        'depth_map_url': None,
        'dxf_url': None,
        'timestamp': None,
        'total_size': 0,
        'files': []
    })
    
    uuid_pattern = r'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'
    
    # Group files by UUID
    for file_path in STATIC_DIR.glob("*"):
        if file_path.is_file() and file_path.suffix in ['.png', '.jpg', '.jpeg', '.dxf']:
            match = re.search(uuid_pattern, file_path.name)
            if match:
                uuid = match.group(1)
                stat = file_path.stat()
                url = f"/static/{file_path.name}"
                
                group = groups[uuid]
                group['files'].append(file_path)
                group['total_size'] += stat.st_size
                
                # Update timestamp to the most recent file with timezone awareness
                file_time = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
                if not group['timestamp'] or file_time > group['timestamp']:
                    group['timestamp'] = file_time
                
                # Assign URLs based on file type
                if file_path.name.startswith('original_'):
                    group['original_url'] = url
                elif file_path.name.startswith('depth_map_'):
                    group['depth_map_url'] = url
                elif file_path.name.startswith('output_'):
                    group['dxf_url'] = url
    
    # Convert to response format
    grouped_files = []
    for uuid, data in groups.items():
        if data['timestamp']:  # Only include groups with files
            grouped_files.append(GroupedFile(
                uuid=uuid,
                original_url=data['original_url'],
                depth_map_url=data['depth_map_url'],
                dxf_url=data['dxf_url'],
                timestamp=data['timestamp'],
                total_size=data['total_size']
            ))
    
    # Sort by timestamp (newest first)
    grouped_files.sort(key=lambda x: x.timestamp, reverse=True)
    
    return GroupedFilesResponse(
        groups=grouped_files,
        total_groups=len(grouped_files)
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