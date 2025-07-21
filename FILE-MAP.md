# Crystal Etching Converter - File Map

**Last Updated:** July 21, 2025, 9:20 PM UTC

## Project Structure

```
/home/glassogroup-3d/htdocs/3d.glassogroup.com/
├── CLAUDE.md                    # Development instructions
├── DEPLOYMENT.md               # Deployment guide
├── README.md                   # Project overview
├── FILE-MAP.md                 # This file - complete file listing
├── IMAGE-PREPARATION-GUIDE.md  # Guide for optimal image preparation
├── SYSTEM-DOCUMENTATION.md     # System architecture (to be created)
├── DEVELOPMENT-GUIDE.md        # Development patterns (to be created)
├── BEST-PRACTICES.md          # Security standards (to be created)
├── COMMON-PATTERNS.md         # Code templates (to be created)
├── SECURITY-CHECKLIST.md      # Security verification (to be created)
├── nginx.conf                 # Nginx configuration
├── stop-servers.sh            # Script to stop dev servers
├── restart-servers.sh         # Original restart script
├── restart-servers-new.sh     # Simplified restart script (recommended)
├── start-backend.sh           # Start only backend server
├── start-frontend.sh          # Start only frontend server
├── index.php                  # Legacy file
│
├── backend/
│   ├── main.py               # FastAPI application with auth endpoints
│   ├── database.py           # SQLAlchemy models (User, Project, ProjectFile)
│   ├── auth.py               # JWT authentication logic (with debug logging)
│   ├── init_db.py            # Database initialization script
│   ├── test_db_connection.py # Database connection tester
│   ├── check_projects.py     # Database project debugging utility
│   ├── add_background_threshold.py # Migration to add background_threshold column
│   ├── analyze_dxf.py        # DXF file analysis utility
│   ├── requirements.txt      # Python dependencies (+ SQLAlchemy, PyMySQL)
│   ├── .env                  # Environment variables (DB creds, JWT secret)
│   ├── fastapi.service      # Systemd service config
│   ├── test_api.sh          # API testing script
│   ├── backend.log          # Server logs
│   ├── venv/                # Python virtual environment
│   ├── routers/             # API route modules
│   │   └── zones.py         # Depth zone processing endpoints
│   └── static/              # Converted files storage
│       ├── original_*.jpg   # Original uploaded images
│       ├── depth_map_*.png  # Generated depth maps
│       └── output_*.dxf     # Generated DXF files
│
├── frontend/
│   ├── package.json         # Node.js dependencies
│   ├── package-lock.json    # Locked dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── index.html           # HTML entry point
│   ├── frontend.log         # Dev server logs
│   ├── node_modules/        # Node.js modules
│   └── src/
│       ├── main.jsx         # React entry point
│       ├── App.jsx          # Main app component
│       ├── index.css        # Global styles
│       ├── theme.js         # MUI theme configuration
│       └── components/
│           ├── UploadForm.jsx      # Image upload interface
│           ├── ResultsSection.jsx  # Results display with tabs
│           ├── DepthMapViewer.jsx  # Interactive depth map viewer
│           ├── DXFViewer.jsx       # 3D point cloud viewer
│           ├── DXFUpload.jsx       # DXF file upload component
│           ├── FileBrowser.jsx     # Previous files browser (deprecated)
│           ├── FileBrowserNew.jsx  # Updated file browser with grouping
│           ├── DepthMapControls.jsx # Professional depth map parameter controls
│           ├── WorkspaceLayout.jsx # Three-panel workspace layout with auth
│           ├── AuthContext.jsx     # Authentication context provider
│           ├── LoginForm.jsx       # User login component
│           ├── RegisterForm.jsx    # User registration component
│           ├── ProjectList.jsx     # User projects list component
│           ├── ProjectCard.jsx     # Individual project card display
│           ├── DepthZoneEditor/   # Depth zone editing system
│           │   └── DepthZoneEditor.jsx  # Main zone editor component
│           └── CrystalPreview/    # 3D crystal visualization
│               └── CrystalPreview.jsx   # Crystal preview component
│
├── dev_files/
│   ├── initial.txt          # Original project requirements
│   ├── ui.png              # UI design reference
│   ├── paw.png             # Sample paw print image (white on black)
│   ├── depth.png           # Sample depth map
│   ├── 3dmodel.png         # Screenshot of 3D model with background issue
│   └── 80x50x50_ver_lisa_busby_01_export.dxf  # Sample DXF from other company
│
└── tasks/
    ├── todo.md                # Task tracking with reviews (Session 13 added)
    ├── session-2.md           # Session 2 summary
    ├── session-3.md           # Session 3 summary
    ├── session-4.md           # Session 4 summary
    ├── session-4-update.md    # Session 4 update
    ├── session-6.md           # Session 6 summary
    ├── session-7.md           # Session 7 summary
    ├── session-8.md           # Session 8 summary
    ├── session-8-final.md     # Session 8 final summary
    ├── session-9.md           # Session 9 summary (authentication)
    ├── session-11.md          # Session 11 summary (project saving fix)
    ├── session-13.md          # Session 13 summary (background threshold & DXF upload)
    ├── session-14.md          # Session 14 summary (crystal rendering enhancement)
    ├── session-15.md          # Session 15 summary (glass fix & documentation)
    ├── next-session-prompt.md # Continuation prompt (Form parameter issue)
    ├── next-session-prompt-2.md # Continuation prompt (DXF format analysis)
    ├── next-session-prompt-3.md # Continuation prompt (crystal rendering)
    └── next-session-prompt-4.md # Continuation prompt (crystal refinements)
```

## Key Files Description

### Backend Files
- **main.py**: FastAPI server with endpoints:
  - `POST /process` - Image processing with depth map parameters (saves projects for auth users, uses Form() for multipart)
  - `POST /preview` - Generate preview with custom parameters
  - `GET /files` - List converted files
  - `DELETE /files/{filename}` - Delete file
  - `POST /register` - User registration
  - `POST /login` - User authentication (returns JWT)
  - `POST /token` - OAuth2 compatible login
  - `GET /users/me` - Get current user info
  - `GET /projects` - List user projects (returns {projects: [], total: n})
  - `GET /projects/{id}` - Get specific project
  - `PUT /projects/{id}` - Update project
  - `DELETE /projects/{id}` - Delete project
- **database.py**: SQLAlchemy models (User, Project, ProjectFile)
- **auth.py**: JWT authentication and user management (includes debug logging)
- **check_projects.py**: Utility script to check projects in database
- **requirements.txt**: Python packages including transformers, torch, ezdxf, SQLAlchemy, PyMySQL
- **static/**: Storage for processed files

### Frontend Files
- **App.jsx**: Main component with AuthProvider wrapper (includes project name handling)
- **theme.js**: Custom MUI theme with gradients
- **UploadForm.jsx**: Drag-and-drop upload with project name dialog for auth users
- **ResultsSection.jsx**: Tabbed results display
- **DepthMapViewer.jsx**: Canvas-based depth visualization
- **DXFViewer.jsx**: Three.js point cloud viewer
- **FileBrowserNew.jsx**: File management with grouped display
- **WorkspaceLayout.jsx**: Three-panel layout with authentication UI and user menu
- **AuthContext.jsx**: Authentication state management with JWT and axios interceptors
- **LoginForm.jsx**: Login interface with modern styling (uses /api proxy)
- **RegisterForm.jsx**: User registration with validation (uses /api proxy)
- **ProjectList.jsx**: Display and manage user projects (handles {projects: [], total: n})
- **ProjectCard.jsx**: Individual project with file downloads and edit/delete

### Configuration Files
- **nginx.conf**: Proxy configuration for production
- **fastapi.service**: Systemd service for backend
- **.env**: Environment variables (ports, limits)

## Recent Changes

### Session 9 (July 20, 2025)
- Added: database.py (SQLAlchemy models)
- Added: auth.py (JWT authentication)
- Added: init_db.py (DB initialization)
- Added: test_db_connection.py (connection tester)
- Added: FileBrowserNew.jsx (improved file browser)
- Added: WorkspaceLayout.jsx (three-panel layout)
- Modified: main.py (added auth endpoints)
- Modified: .env (added DB and JWT config)
- Modified: requirements.txt (added auth dependencies)
- Modified: DepthMapControls.jsx (added progress %)
- Modified: DepthMapViewer.jsx (added progress display)
- Modified: App.jsx (fixed error handling)

### Session 8
- Added: DepthMapControls.jsx
- Modified: preview functionality (real-time updates)

### Session 2
- Added: theme.js
- Added: DepthMapViewer.jsx
- Added: DXFViewer.jsx  
- Added: FileBrowser.jsx
- Modified: App.jsx (complete redesign)
- Modified: UploadForm.jsx (modern styling)
- Modified: ResultsSection.jsx (added tabs)
- Modified: main.py (added file management endpoints)