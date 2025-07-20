# Crystal Etching Converter - File Map

**Last Updated:** July 20, 2025, 4:40 AM

## Project Structure

```
/home/glassogroup-3d/htdocs/3d.glassogroup.com/
├── CLAUDE.md                    # Development instructions
├── DEPLOYMENT.md               # Deployment guide
├── README.md                   # Project overview
├── FILE-MAP.md                 # This file - complete file listing
├── SYSTEM-DOCUMENTATION.md     # System architecture (to be created)
├── DEVELOPMENT-GUIDE.md        # Development patterns (to be created)
├── BEST-PRACTICES.md          # Security standards (to be created)
├── COMMON-PATTERNS.md         # Code templates (to be created)
├── SECURITY-CHECKLIST.md      # Security verification (to be created)
├── nginx.conf                 # Nginx configuration
├── stop-servers.sh            # Script to stop dev servers
├── index.php                  # Legacy file
│
├── backend/
│   ├── main.py               # FastAPI application with all endpoints
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment variables
│   ├── fastapi.service      # Systemd service config
│   ├── test_api.sh          # API testing script
│   ├── backend.log          # Server logs
│   ├── venv/                # Python virtual environment
│   └── static/              # Converted files storage
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
│           └── FileBrowser.jsx     # Previous files browser
│
├── dev_files/
│   ├── initial.txt          # Original project requirements
│   └── ui.png              # UI design reference
│
└── tasks/
    ├── todo.md              # Task tracking
    ├── session-2.md         # Session 2 summary
    └── next-session-prompt.md # Continuation prompt
```

## Key Files Description

### Backend Files
- **main.py**: FastAPI server with endpoints:
  - `POST /process` - Image processing
  - `GET /files` - List converted files
  - `DELETE /files/{filename}` - Delete file
- **requirements.txt**: Python packages including transformers, torch, ezdxf
- **static/**: Storage for processed files

### Frontend Files
- **App.jsx**: Main component with modern UI
- **theme.js**: Custom MUI theme with gradients
- **UploadForm.jsx**: Drag-and-drop upload
- **ResultsSection.jsx**: Tabbed results display
- **DepthMapViewer.jsx**: Canvas-based depth visualization
- **DXFViewer.jsx**: Three.js point cloud viewer
- **FileBrowser.jsx**: File management interface

### Configuration Files
- **nginx.conf**: Proxy configuration for production
- **fastapi.service**: Systemd service for backend
- **.env**: Environment variables (ports, limits)

## Recent Changes (Session 2)
- Added: theme.js
- Added: DepthMapViewer.jsx
- Added: DXFViewer.jsx  
- Added: FileBrowser.jsx
- Modified: App.jsx (complete redesign)
- Modified: UploadForm.jsx (modern styling)
- Modified: ResultsSection.jsx (added tabs)
- Modified: main.py (added file management endpoints)