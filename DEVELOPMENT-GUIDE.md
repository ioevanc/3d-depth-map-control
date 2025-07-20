# Crystal Etching Converter - Development Guide

**Last Updated:** July 20, 2025

## Quick Navigation

### Common Tasks
- [Starting Development Servers](#starting-development-servers)
- [Adding New Features](#adding-new-features)
- [Debugging Issues](#debugging-issues)
- [Testing Changes](#testing-changes)

### Project Structure
- Backend: `/backend/` - FastAPI Python server
- Frontend: `/frontend/` - React + Vite application
- Tasks: `/tasks/` - Documentation and planning

## Starting Development Servers

### Backend Server
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Server
```bash
cd frontend
npm install  # First time only
npm run dev  # Starts on port 5176
```

### Stop All Servers
```bash
./stop-servers.sh
```

## Common Development Patterns

### Adding a New API Endpoint

1. **Define the endpoint in `backend/main.py`:**
```python
@app.get("/new-endpoint")
async def new_endpoint():
    return {"message": "Hello"}
```

2. **Add CORS if needed** (already configured for all origins)

3. **Update frontend to call it:**
```javascript
const response = await axios.get('/api/new-endpoint')
```

### Adding a New React Component

1. **Create component file:**
```bash
touch frontend/src/components/NewComponent.jsx
```

2. **Basic component structure:**
```jsx
import { Box, Typography } from '@mui/material'

function NewComponent({ prop1, prop2 }) {
  return (
    <Box>
      <Typography>New Component</Typography>
    </Box>
  )
}

export default NewComponent
```

3. **Import and use in parent component**

### Working with the Theme

The app uses a custom MUI theme defined in `frontend/src/theme.js`:

```javascript
// Access theme in components
sx={{
  background: theme => theme.palette.mode === 'dark'
    ? 'rgba(26, 26, 46, 0.5)'
    : 'rgba(255, 255, 255, 0.8)'
}}
```

Key theme colors:
- Primary: #6366F1 (purple)
- Secondary: #EC4899 (pink)
- Dark background: #0F0F23

## Debugging Issues

### Backend Debugging

1. **Check server logs:**
```bash
tail -f backend/backend.log
```

2. **Test endpoints directly:**
```bash
curl http://localhost:8000/files | jq
```

3. **Python debugging:**
```python
import pdb; pdb.set_trace()  # Add breakpoint
```

### Frontend Debugging

1. **Browser DevTools:**
   - Console for errors
   - Network tab for API calls
   - React DevTools extension

2. **Add console logs:**
```javascript
console.log('Debug info:', variable)
```

3. **Check Vite errors:**
```bash
# Watch frontend log
tail -f frontend/frontend.log
```

### Common Issues and Solutions

#### CORS Errors
- Backend already configured for all origins
- Check API proxy in `vite.config.js`

#### File Upload Failures
- Check file size (5MB limit)
- Verify file type (JPG/PNG only)
- Check backend static directory permissions

#### Model Loading Issues
- First run downloads ~200MB model
- Check internet connection
- Verify disk space

## Testing Changes

### Manual Testing Checklist
1. [ ] Upload a test image
2. [ ] Verify depth map generation
3. [ ] Check DXF file creation
4. [ ] Test file browser functionality
5. [ ] Verify both viewers work
6. [ ] Test dark/light mode toggle

### API Testing
```bash
# Test image processing
cd backend
./test_api.sh

# Test file listing
curl http://localhost:8000/files | jq

# Test file deletion
curl -X DELETE http://localhost:8000/files/filename.png
```

### Frontend Testing
```bash
# Lint check
cd frontend
npm run lint

# Type checking (if TypeScript)
npm run typecheck
```

## Code Style Guidelines

### Python (Backend)
- Use type hints where possible
- Follow PEP 8
- Add docstrings to functions
- Handle exceptions gracefully

### JavaScript/React (Frontend)
- Use functional components
- Destructure props
- Use MUI sx prop for styling
- Keep components focused and small

### Git Workflow
1. Create feature branch
2. Make changes
3. Test thoroughly
4. Update documentation
5. Commit with clear message

## Performance Optimization

### Backend
- Model loads once on startup
- Use async/await for I/O operations
- Sample pixels to reduce point count
- Clean up temporary files

### Frontend
- Lazy load heavy components
- Use React.memo for expensive renders
- Optimize images before upload
- Implement virtual scrolling for long lists

## Adding New Features

### Feature Checklist
1. [ ] Plan the feature (update todo.md)
2. [ ] Implement backend changes
3. [ ] Create/update frontend components
4. [ ] Add error handling
5. [ ] Test thoroughly
6. [ ] Update documentation
7. [ ] Update FILE-MAP.md if files added

### Example: Adding Export Options

1. **Backend: Add parameters to process endpoint**
2. **Frontend: Add settings UI component**
3. **Pass settings with process request**
4. **Update processing logic**
5. **Test with various settings**

## Deployment Preparation

### Build Frontend for Production
```bash
cd frontend
npm run build
# Output in dist/ folder
```

### Configure Production Environment
1. Update `.env` with production values
2. Set up Nginx configuration
3. Configure systemd service
4. Set proper file permissions

## Troubleshooting Development

### Port Already in Use
```bash
# Find process using port
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Virtual Environment Issues
```bash
# Recreate virtual environment
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node Modules Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Useful Commands

### Development
```bash
# Watch backend logs
tail -f backend/backend.log

# Watch frontend logs
tail -f frontend/frontend.log

# Check running processes
ps aux | grep -E "uvicorn|vite"

# Kill all Python processes
pkill -f python

# Kill all Node processes
pkill -f node
```

### File Management
```bash
# Count converted files
ls backend/static/*.png | wc -l

# Clean old files (older than 7 days)
find backend/static -name "*.png" -o -name "*.dxf" -mtime +7 -delete

# Check disk usage
du -sh backend/static/
```

## Resources

### Documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [MUI Documentation](https://mui.com/)
- [Three.js Docs](https://threejs.org/docs/)

### Project Specific
- Original requirements: `/dev_files/initial.txt`
- UI design reference: `/dev_files/ui.png`
- Session summaries: `/tasks/session-*.md`