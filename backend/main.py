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

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from sqlalchemy.orm import Session

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import cv2
import torch
from transformers import pipeline
import ezdxf
from ezdxf.addons import r12writer

# Import auth and database modules
from database import get_db, init_db, create_admin_user, SessionLocal, User, Project, ProjectFile
from auth import (
    create_access_token, 
    get_current_active_user,
    get_current_user_optional,
    get_current_admin_user,
    authenticate_user,
    create_user,
    Token,
    UserCreate,
    UserResponse,
    LoginRequest,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

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
    background_threshold: int = Field(default=10, ge=0, le=255, description="Threshold to remove background (0-255)")

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

# Project models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    blur_amount: Optional[float] = None
    contrast: Optional[float] = None
    brightness: Optional[int] = None
    edge_enhancement: Optional[float] = None
    invert_depth: Optional[bool] = None

class ProjectResponse(BaseModel):
    id: int
    uuid: str
    name: str
    description: Optional[str]
    blur_amount: float
    contrast: float
    brightness: int
    edge_enhancement: float
    invert_depth: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int

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
    
    # Apply background threshold visualization
    # Show areas that will be excluded with a pattern
    if params.background_threshold > 0:
        # Create a copy for visualization
        vis_copy = processed.copy()
        # Set excluded areas to a distinct pattern
        mask = processed <= params.background_threshold
        # Create a checkerboard pattern for excluded areas
        for y in range(0, processed.shape[0], 10):
            for x in range(0, processed.shape[1], 10):
                if mask[y:min(y+5, processed.shape[0]), x:min(x+5, processed.shape[1])].any():
                    vis_copy[y:min(y+5, processed.shape[0]), x:min(x+5, processed.shape[1])] = 0
        processed = vis_copy
    
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

def depth_map_to_dxf(depth_map_path: str, dxf_path: str, background_threshold: int = 10, original_image_path: str = None) -> None:
    """Convert depth map to DXF point cloud for laser etching"""
    try:
        depth_image = cv2.imread(depth_map_path, cv2.IMREAD_GRAYSCALE)
        if depth_image is None:
            raise ValueError("Failed to load depth map")
        
        # Load original image for better background detection
        original_image = None
        if original_image_path:
            original_image = cv2.imread(original_image_path, cv2.IMREAD_GRAYSCALE)
            if original_image is None:
                print(f"Warning: Could not load original image from {original_image_path}")
        
        height, width = depth_image.shape
        
        doc = ezdxf.new('R12')
        msp = doc.modelspace()
        
        # Create Venus3D layer to match other company's format
        doc.layers.new(name='Venus3D')
        
        # Calculate center offset to center coordinates around origin
        center_x = width / 2.0
        center_y = height / 2.0
        
        # Use sampling rate of 1 for maximum detail
        sampling_rate = 1
        
        points_added = 0
        for y in range(0, height, sampling_rate):
            for x in range(0, width, sampling_rate):
                depth_value = depth_image[y, x]
                
                # Check if we should include this point
                include_point = True
                
                # First check against the original image if available
                if original_image is not None:
                    original_value = original_image[y, x]
                    # Exclude dark areas in the original image
                    if original_value <= background_threshold:
                        include_point = False
                else:
                    # Fallback to depth map threshold
                    if depth_value <= background_threshold:
                        include_point = False
                
                if include_point and depth_value > 0:
                    # Convert to mm depth (allowing negative values for better range)
                    z = (depth_value / 255.0) * MAX_DEPTH_MM - (MAX_DEPTH_MM / 4.0)
                    
                    # Center coordinates around origin (0,0) like the other company's format
                    x_centered = (x - center_x) * 0.1  # Scale down to mm
                    y_centered = (center_y - y) * 0.1  # Flip Y and scale to mm
                    
                    # Add point to Venus3D layer
                    point = msp.add_point((x_centered, y_centered, z))
                    point.dxf.layer = 'Venus3D'
                    points_added += 1
        
        doc.saveas(dxf_path)
        print(f"DXF created with {points_added} points on Venus3D layer")
        
    except Exception as e:
        raise HTTPException(500, f"DXF generation failed: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "Crystal Etching Converter API", 
        "endpoints": ["/process", "/files", "/register", "/token", "/users/me", "/projects"]
    }

# Authentication endpoints
@app.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    db_user = create_user(db, user_data)
    return db_user

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with username (email) and password to get access token"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
async def login_json(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Alternative login endpoint that accepts JSON instead of form data"""
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@app.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    users = db.query(User).all()
    return users

# Project management endpoints
@app.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """List user's projects"""
    projects = db.query(Project).filter(
        Project.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    total = db.query(Project).filter(Project.user_id == current_user.id).count()
    
    return {"projects": projects, "total": total}

@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project

@app.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update project details"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields if provided
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return project

@app.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a project and all associated files"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete physical files
    for file in project.files:
        file_path = Path(file.file_path)
        if file_path.exists():
            file_path.unlink()
    
    # Delete from database
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

@app.post("/process", response_model=ProcessingResponse)
async def process_image(
    image: UploadFile = File(...),
    blur_amount: float = Form(0),
    contrast: float = Form(1.0),
    brightness: int = Form(0),
    edge_enhancement: float = Form(0),
    invert_depth: bool = Form(False),
    background_threshold: int = Form(10),
    project_name: Optional[str] = Form(None),
    project_description: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Process uploaded image to generate depth map and DXF with custom parameters"""
    
    validate_image_file(image)
    
    # Create parameter object
    params = DepthMapParams(
        blur_amount=blur_amount,
        contrast=contrast,
        brightness=brightness,
        edge_enhancement=edge_enhancement,
        invert_depth=invert_depth,
        background_threshold=background_threshold
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
        
        depth_map_to_dxf(str(depth_map_path), str(dxf_path), background_threshold, str(original_path))
        
        # Save project if user is authenticated and project_name is provided
        if current_user and project_name:
            # Create project record
            project = Project(
                user_id=current_user.id,
                name=project_name,
                description=project_description or "",
                uuid=unique_id,
                blur_amount=blur_amount,
                contrast=contrast,
                brightness=brightness,
                edge_enhancement=edge_enhancement,
                invert_depth=invert_depth,
                background_threshold=background_threshold
            )
            db.add(project)
            db.flush()  # Get the project ID
            
            # Get file sizes
            original_size = os.path.getsize(original_path)
            depth_map_size = os.path.getsize(depth_map_path)
            dxf_size = os.path.getsize(dxf_path)
            
            # Create file records
            original_file = ProjectFile(
                project_id=project.id,
                file_type="original",
                filename=original_filename,
                file_path=f"/static/{original_filename}",
                file_size=original_size,
                mime_type="image/" + Path(image.filename).suffix.lstrip('.')
            )
            depth_file = ProjectFile(
                project_id=project.id,
                file_type="depth_map",
                filename=depth_map_filename,
                file_path=f"/static/{depth_map_filename}",
                file_size=depth_map_size,
                mime_type="image/png"
            )
            dxf_file = ProjectFile(
                project_id=project.id,
                file_type="dxf",
                filename=dxf_filename,
                file_path=f"/static/{dxf_filename}",
                file_size=dxf_size,
                mime_type="application/dxf"
            )
            
            db.add_all([original_file, depth_file, dxf_file])
            db.commit()
        
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
    background_threshold: int = 10

@app.post("/preview")
async def preview_depth_map(request: PreviewRequest):
    """Generate a preview of depth map with given parameters"""
    
    # Create cache key from request parameters
    cache_key = hashlib.md5(
        f"{request.image_url}_{request.blur_amount}_{request.contrast}_{request.brightness}_{request.edge_enhancement}_{request.invert_depth}_{request.background_threshold}".encode()
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
        invert_depth=request.invert_depth,
        background_threshold=request.background_threshold
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

@app.post("/upload-dxf")
async def upload_dxf(
    dxf_file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Upload and analyze a DXF file"""
    
    # Validate file type
    if not dxf_file.content_type or not dxf_file.filename.lower().endswith('.dxf'):
        raise HTTPException(400, "File must be a DXF file")
    
    if dxf_file.size and dxf_file.size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File size must be less than {MAX_FILE_SIZE // 1024 // 1024}MB")
    
    unique_id = str(uuid.uuid4())
    dxf_filename = f"uploaded_{unique_id}.dxf"
    dxf_path = STATIC_DIR / dxf_filename
    
    try:
        # Save uploaded DXF
        content = await dxf_file.read()
        with open(dxf_path, 'wb') as f:
            f.write(content)
        
        # Analyze the DXF file
        doc = ezdxf.readfile(str(dxf_path))
        msp = doc.modelspace()
        
        # Count entities and get bounds
        point_count = 0
        min_x = min_y = min_z = float('inf')
        max_x = max_y = max_z = float('-inf')
        
        for entity in msp:
            if entity.dxftype() == 'POINT':
                point_count += 1
                x, y, z = entity.dxf.location
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                min_z = min(min_z, z)
                max_z = max(max_z, z)
        
        if point_count == 0:
            raise ValueError("No points found in DXF file")
        
        # Return analysis results
        return {
            "success": True,
            "filename": dxf_filename,
            "dxf_url": f"/static/{dxf_filename}",
            "analysis": {
                "point_count": point_count,
                "bounds": {
                    "x": {"min": min_x, "max": max_x, "range": max_x - min_x},
                    "y": {"min": min_y, "max": max_y, "range": max_y - min_y},
                    "z": {"min": min_z, "max": max_z, "range": max_z - min_z}
                },
                "dxf_version": doc.dxfversion
            }
        }
        
    except Exception as e:
        # Clean up on error
        if dxf_path.exists():
            dxf_path.unlink()
        raise HTTPException(500, f"DXF upload failed: {str(e)}")

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