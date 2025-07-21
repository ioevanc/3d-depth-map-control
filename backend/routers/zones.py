from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Depends
from fastapi.responses import FileResponse
from typing import List, Optional
from pydantic import BaseModel
import json
import tempfile
import cv2
import numpy as np
from pathlib import Path
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from database import get_db, User
from auth import get_current_user_optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

# Copy DepthMapParams definition to avoid circular import
class DepthMapParams(BaseModel):
    blur_amount: float = Field(default=0, ge=0, le=10, description="Gaussian blur amount")
    contrast: float = Field(default=1.0, ge=0.5, le=2.0, description="Contrast adjustment")
    brightness: int = Field(default=0, ge=-50, le=50, description="Brightness adjustment")
    edge_enhancement: float = Field(default=0, ge=0, le=1, description="Edge enhancement strength")
    invert_depth: bool = Field(default=False, description="Invert depth values")
    background_threshold: int = Field(default=10, ge=0, le=255, description="Threshold to remove background (0-255)")

router = APIRouter(prefix="/zones", tags=["zones"])

class DepthZone(BaseModel):
    id: int
    type: str  # "3d", "flat", "custom"
    depth: float  # depth value for flat/custom zones
    visible: bool
    path: List[dict]  # List of {x, y} points

class ProcessWithZonesRequest(BaseModel):
    zones: List[DepthZone]
    parameters: DepthMapParams
    crystal_size: Optional[List[float]] = [80, 100, 80]  # width, height, depth in mm

@router.post("/process-with-zones")
async def process_with_zones(
    image: UploadFile = File(...),
    zones: str = Form(...),  # JSON string of zones
    parameters: str = Form(...),  # JSON string of parameters
    crystal_size: str = Form("[80, 100, 80]"),  # JSON string of crystal size
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Process image with depth zones applied"""
    
    try:
        # Parse JSON data
        zones_data = json.loads(zones)
        params_data = json.loads(parameters)
        crystal_data = json.loads(crystal_size)
        
        # Create parameter object
        params = DepthMapParams(**params_data)
        
        # Save uploaded image temporarily
        temp_image = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        content = await image.read()
        temp_image.write(content)
        temp_image.close()
        
        # Generate depth map
        temp_depth = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        # Import here to avoid circular import
        from main import generate_depth_map
        generate_depth_map(temp_image.name, temp_depth.name, params)
        
        # Apply zones to depth map
        depth_image = cv2.imread(temp_depth.name, cv2.IMREAD_GRAYSCALE)
        height, width = depth_image.shape
        
        # Create zone mask
        zone_mask = np.zeros((height, width), dtype=np.uint8)
        depth_override = np.zeros((height, width), dtype=np.float32)
        
        for zone in zones_data:
            if not zone['visible']:
                continue
                
            # Create polygon mask for this zone
            pts = np.array([[int(p['x']), int(p['y'])] for p in zone['path']], np.int32)
            pts = pts.reshape((-1, 1, 2))
            
            # Create temporary mask for this zone
            temp_mask = np.zeros((height, width), dtype=np.uint8)
            cv2.fillPoly(temp_mask, [pts], 255)
            
            if zone['type'] == 'flat' or zone['type'] == 'custom':
                # Override depth in this zone
                zone_depth_value = int((zone['depth'] + 10) / 35 * 255)  # Convert mm to 0-255
                depth_override[temp_mask == 255] = zone_depth_value
                zone_mask[temp_mask == 255] = 1
            # For '3d' zones, keep the original depth map values
        
        # Apply zone overrides
        modified_depth = depth_image.copy()
        modified_depth[zone_mask == 1] = depth_override[zone_mask == 1].astype(np.uint8)
        
        # Save modified depth map
        temp_modified = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        cv2.imwrite(temp_modified.name, modified_depth)
        
        # Generate DXF from modified depth map
        temp_dxf = tempfile.NamedTemporaryFile(delete=False, suffix='.dxf')
        # Import here to avoid circular import
        from main import depth_map_to_dxf
        depth_map_to_dxf(
            temp_modified.name, 
            temp_dxf.name,
            params.background_threshold,
            temp_image.name,
            crystal_data[0],  # width
            crystal_data[1],  # height
            crystal_data[2]   # depth
        )
        
        # TODO: Save files and create project if user is authenticated
        
        return {
            "success": True,
            "depth_map": f"/static/{Path(temp_modified.name).name}",
            "dxf": f"/static/{Path(temp_dxf.name).name}",
            "zones_applied": len(zones_data),
            "crystal_size": crystal_data
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Invalid JSON data: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {str(e)}")

@router.post("/detect-text")
async def detect_text(
    image: UploadFile = File(...)
):
    """Detect text regions in image using edge detection"""
    
    try:
        # Save uploaded image temporarily
        content = await image.read()
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply edge detection
        edges = cv2.Canny(gray, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours that might be text
        text_regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter by aspect ratio and size (typical for text)
            aspect_ratio = w / h if h > 0 else 0
            area = w * h
            
            if 0.5 < aspect_ratio < 20 and area > 100:
                text_regions.append({
                    "x": int(x),
                    "y": int(y),
                    "width": int(w),
                    "height": int(h)
                })
        
        return {
            "success": True,
            "regions": text_regions[:20]  # Limit to 20 regions
        }
        
    except Exception as e:
        raise HTTPException(500, f"Text detection failed: {str(e)}")