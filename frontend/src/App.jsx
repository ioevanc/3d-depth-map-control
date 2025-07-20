import { useState, useRef, useCallback } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Fade,
  Grow,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material'
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  AutoFixHigh as MagicIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material'
import WorkspaceLayout from './components/WorkspaceLayout'
import { AuthProvider } from './components/AuthContext'
import axios from 'axios'

function App({ mode, setMode }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })
  const [viewingPreviousFiles, setViewingPreviousFiles] = useState(false)
  const [progress, setProgress] = useState(null)
  const [depthParameters, setDepthParameters] = useState({
    blur_amount: 0,
    contrast: 1.0,
    brightness: 0,
    edge_enhancement: 0,
    invert_depth: false
  })
  const [previewLoading, setPreviewLoading] = useState(false)
  const abortControllerRef = useRef(null)

  const handleFileSelect = (file) => {
    setSelectedFile(file)
    setResults(null)
    setError(null)
    
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleProcess = async (projectName, projectDescription) => {
    if (!selectedFile) {
      setSnackbar({ open: true, message: 'Please select an image first', severity: 'warning' })
      return
    }

    setLoading(true)
    setError(null)
    
    // Initialize progress
    setProgress({
      value: 0,
      message: 'Preparing image...',
      steps: [
        { name: 'Uploading image', active: true, completed: false },
        { name: 'Analyzing depth with AI', active: false, completed: false },
        { name: 'Generating depth map', active: false, completed: false },
        { name: 'Creating DXF point cloud', active: false, completed: false },
        { name: 'Finalizing files', active: false, completed: false }
      ]
    })

    const formData = new FormData()
    formData.append('image', selectedFile)
    
    // Append depth parameters
    Object.entries(depthParameters).forEach(([key, value]) => {
      formData.append(key, value)
    })
    
    // Append project details if provided
    if (projectName) {
      formData.append('project_name', projectName)
    }
    if (projectDescription) {
      formData.append('project_description', projectDescription)
    }

    try {
      // Step 1: Upload
      setProgress(prev => ({
        ...prev,
        value: 20,
        message: 'Uploading image to server...',
        steps: prev.steps.map((s, i) => ({ ...s, active: i === 0, completed: false }))
      }))
      
      // Simulate upload progress
      setTimeout(() => {
        setProgress(prev => ({
          ...prev,
          value: 40,
          message: 'AI is analyzing your image...',
          steps: prev.steps.map((s, i) => ({ ...s, active: i === 1, completed: i < 1 }))
        }))
      }, 500)

      const response = await axios.post('/api/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 20) / progressEvent.total)
          setProgress(prev => ({ ...prev, value: percentCompleted }))
        }
      })

      // Step 2-3: Processing
      setProgress(prev => ({
        ...prev,
        value: 60,
        message: 'Generating depth map...',
        steps: prev.steps.map((s, i) => ({ ...s, active: i === 2, completed: i < 2 }))
      }))
      
      // Step 4: DXF
      setTimeout(() => {
        setProgress(prev => ({
          ...prev,
          value: 80,
          message: 'Creating 3D point cloud...',
          steps: prev.steps.map((s, i) => ({ ...s, active: i === 3, completed: i < 3 }))
        }))
      }, 100)
      
      // Step 5: Finalizing
      setTimeout(() => {
        setProgress(prev => ({
          ...prev,
          value: 95,
          message: 'Finalizing files...',
          steps: prev.steps.map((s, i) => ({ ...s, active: i === 4, completed: i < 4 }))
        }))
      }, 200)

      setResults(response.data)
      setPreviewLoading(false) // Reset preview loading after processing
      setProgress(prev => ({
        value: 100,
        message: 'Processing complete!',
        steps: prev.steps.map(s => ({ ...s, active: false, completed: true }))
      }))
      
      setTimeout(() => {
        setProgress(null)
        setSnackbar({ open: true, message: 'Processing completed successfully!', severity: 'success' })
      }, 1000)
    } catch (err) {
      let errorMessage = 'Processing failed. Please try again.'
      
      // Handle different error response formats
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          // FastAPI validation errors come as array
          errorMessage = err.response.data.detail.map(e => e.msg || e.message).join(', ')
        } else if (typeof err.response.data.detail === 'object') {
          errorMessage = err.response.data.detail.msg || err.response.data.detail.message || errorMessage
        }
      }
      
      setError(errorMessage)
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
      setProgress(null)
    } finally {
      setTimeout(() => {
        setLoading(false)
      }, 1500)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setResults(null)
    setError(null)
    setViewingPreviousFiles(false)
    setProgress(null)
  }

  const handleReprocess = async (parameters) => {
    if (!results || !results.original_url) {
      setSnackbar({ open: true, message: 'No image available to reprocess', severity: 'warning' })
      return
    }

    setLoading(true)
    setError(null)
    
    // Initialize progress for reprocessing
    setProgress({
      value: 0,
      message: 'Reprocessing with new parameters...',
      steps: [
        { name: 'Applying Parameters', completed: false, active: true },
        { name: 'Generating Depth Map', completed: false, active: false },
        { name: 'Creating DXF', completed: false, active: false },
        { name: 'Finalizing', completed: false, active: false }
      ]
    })

    try {
      // Extract filename from original URL
      const originalFilename = results.original_url.split('/').pop()
      
      // Create FormData with the image URL
      const formData = new FormData()
      
      // We need to fetch the original image and add it to FormData
      const imageResponse = await axios.get(results.original_url, { responseType: 'blob' })
      formData.append('image', imageResponse.data, originalFilename)
      
      // Add parameters
      Object.keys(parameters).forEach(key => {
        if (key !== 'name') { // Skip the preset name
          formData.append(key, parameters[key])
        }
      })

      setProgress(prev => ({
        ...prev,
        value: 50,
        message: 'Processing depth map...',
        steps: prev.steps.map((s, i) => ({ ...s, active: i === 1, completed: i < 1 }))
      }))

      const response = await axios.post('/api/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      })

      setProgress(prev => ({
        ...prev,
        value: 90,
        steps: prev.steps.map((s, i) => ({ ...s, active: i === 3, completed: i < 3 }))
      }))

      setResults(response.data)
      setPreviewLoading(false)
      setProgress(prev => ({
        value: 100,
        message: 'Reprocessing complete!',
        steps: prev.steps.map(s => ({ ...s, active: false, completed: true }))
      }))
      
      setTimeout(() => {
        setProgress(null)
        setSnackbar({ open: true, message: 'Reprocessing completed successfully!', severity: 'success' })
      }, 1000)
    } catch (err) {
      let errorMessage = 'Reprocessing failed. Please try again.'
      
      // Handle different error response formats
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          // FastAPI validation errors come as array
          errorMessage = err.response.data.detail.map(e => e.msg || e.message).join(', ')
        } else if (typeof err.response.data.detail === 'object') {
          errorMessage = err.response.data.detail.msg || err.response.data.detail.message || errorMessage
        }
      }
      
      setError(errorMessage)
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const handleLoadPreviousFiles = (files) => {
    // Reset preview loading when loading new files
    setPreviewLoading(false)
    
    // Merge new files with existing results if any
    setResults(prev => ({
      ...prev,
      ...files
    }))
    
    // If we have an original image URL, set it as preview
    if (files.original_url) {
      setPreview(files.original_url)
    } else {
      setPreview(null)
    }
    
    setSelectedFile(null)
    setViewingPreviousFiles(true)
    setSnackbar({ open: true, message: 'Previous files loaded successfully!', severity: 'success' })
  }

  const handleParametersChange = useCallback(async (params) => {
    setDepthParameters(params)
    
    // Only generate preview if we have results with an original image
    if (results && results.original_url) {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      setPreviewLoading(true)
      try {
        const response = await axios.post('/api/preview', {
          image_url: results.original_url,
          ...params
        }, {
          signal: abortControllerRef.current.signal
        })
        
        // Update the depth map preview
        if (response.data.preview) {
          setResults(prev => ({
            ...prev,
            depth_map_preview: response.data.preview
          }))
        }
      } catch (err) {
        // Don't log errors for aborted requests
        if (!axios.isCancel(err)) {
          console.error('Preview generation failed:', err)
        }
      } finally {
        setPreviewLoading(false)
      }
    }
  }, [results?.original_url])

  const handleDeleteFiles = async () => {
    if (!results || (!results.depth_map_url && !results.dxf_url)) return
    
    if (!window.confirm('Are you sure you want to delete all files? This cannot be undone.')) {
      return
    }
    
    try {
      // Extract filename from URL
      const getFilename = (url) => url.split('/').pop()
      
      // Try to delete depth map (which will delete all related files)
      if (results.depth_map_url) {
        const filename = getFilename(results.depth_map_url)
        await axios.delete(`/api/files/${filename}`)
      } else if (results.dxf_url) {
        // If no depth map, try DXF
        const filename = getFilename(results.dxf_url)
        await axios.delete(`/api/files/${filename}`)
      }
      
      // Reset the UI
      handleReset()
      setSnackbar({ open: true, message: 'Files deleted successfully!', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete files', severity: 'error' })
      console.error('Delete error:', err)
    }
  }

  return (
    <AuthProvider>
      <Box sx={{ 
        minHeight: '100vh',
        background: theme => theme.palette.mode === 'dark'
          ? 'radial-gradient(ellipse at top, #1A1A2E 0%, #0F0F23 100%)'
          : 'radial-gradient(ellipse at top, #FFFFFF 0%, #F8F9FA 100%)',
      }}>
      {loading && (
        <LinearProgress 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 2000,
            height: 3,
          }} 
        />
      )}

      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          backgroundColor: 'transparent',
          backdropFilter: 'blur(20px) saturate(200%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MagicIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                fontSize: '1.1rem',
              }}
            >
              Crystal AI
            </Typography>
          </Box>
          
          <IconButton 
            onClick={toggleColorMode} 
            sx={{
              backgroundColor: theme => theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Chip
              label="AI-Powered Crystal Etching"
              sx={{
                mb: 3,
                background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.85rem',
                height: 32,
              }}
            />
            
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                fontWeight: 800,
                mb: 3,
                background: theme => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #FFFFFF 0%, #A0A0A0 100%)'
                  : 'linear-gradient(135deg, #1F2937 0%, #6B7280 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Transform Photos into
              <br />
              Crystal Masterpieces
            </Typography>
            
            <Typography 
              variant="h5" 
              color="text.secondary" 
              sx={{ 
                maxWidth: '600px', 
                mx: 'auto',
                fontWeight: 400,
                fontSize: '1.1rem',
                lineHeight: 1.6,
              }}
            >
              Professional depth map generation and DXF export for subsurface laser etching. 
              Replace expensive services with in-house AI processing.
            </Typography>
          </Box>
        </Fade>

        <WorkspaceLayout
          // State
          selectedFile={selectedFile}
          preview={preview}
          results={results}
          loading={loading}
          error={error}
          depthParameters={depthParameters}
          previewLoading={previewLoading}
          viewingPreviousFiles={viewingPreviousFiles}
          progress={progress}
          
          // Handlers
          onFileSelect={handleFileSelect}
          onProcess={handleProcess}
          onReprocess={handleReprocess}
          onParametersChange={handleParametersChange}
          onDelete={handleDeleteFiles}
          onLoadPrevious={handleLoadPreviousFiles}
          onNewUpload={handleReset}
        />
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
    </AuthProvider>
  )
}

export default App