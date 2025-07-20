import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
} from '@mui/material'

function DepthMapViewer({ depthMapUrl }) {
  const canvasRef = useRef(null)
  const [depthInfo, setDepthInfo] = useState(null)
  const [colorMode, setColorMode] = useState('grayscale')
  const [imageData, setImageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  
  useEffect(() => {
    const loadImage = async () => {
      setLoading(true)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        canvas.width = img.width
        canvas.height = img.height
        setDimensions({ width: img.width, height: img.height })
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        setImageData(data)
        
        // Apply initial color mode
        applyColorMode(data, colorMode)
        setLoading(false)
      }
      
      img.onerror = () => {
        console.error('Failed to load depth map image')
        setLoading(false)
      }
      
      img.src = depthMapUrl
    }
    
    loadImage()
  }, [depthMapUrl])
  
  useEffect(() => {
    if (imageData) {
      applyColorMode(imageData, colorMode)
    }
  }, [colorMode, imageData])
  
  const applyColorMode = (originalData, mode) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const newData = ctx.createImageData(originalData.width, originalData.height)
    
    for (let i = 0; i < originalData.data.length; i += 4) {
      const depth = originalData.data[i] // Grayscale value
      
      switch (mode) {
        case 'grayscale':
          newData.data[i] = depth
          newData.data[i + 1] = depth
          newData.data[i + 2] = depth
          break
        case 'heatmap':
          // Simple heatmap: blue (far) -> green -> red (near)
          if (depth < 85) {
            newData.data[i] = 0
            newData.data[i + 1] = depth * 3
            newData.data[i + 2] = 255 - depth * 3
          } else if (depth < 170) {
            newData.data[i] = (depth - 85) * 3
            newData.data[i + 1] = 255
            newData.data[i + 2] = 0
          } else {
            newData.data[i] = 255
            newData.data[i + 1] = 255 - (depth - 170) * 3
            newData.data[i + 2] = 0
          }
          break
        case 'viridis':
          // Viridis-like colormap
          const t = depth / 255
          newData.data[i] = Math.floor(255 * (0.267 + 0.733 * t))
          newData.data[i + 1] = Math.floor(255 * (0.329 + 0.671 * t))
          newData.data[i + 2] = Math.floor(255 * (0.449 - 0.449 * t + 0.551 * t * t))
          break
        case 'plasma':
          // Plasma colormap
          const p = depth / 255
          newData.data[i] = Math.floor(255 * Math.min(1, 0.05 + 2.35 * p))
          newData.data[i + 1] = Math.floor(255 * Math.max(0, Math.min(1, -0.8 + 2 * p)))
          newData.data[i + 2] = Math.floor(255 * Math.max(0, Math.min(1, 1.25 - 2.5 * p + 1.5 * p * p)))
          break
      }
      newData.data[i + 3] = 255 // Alpha
    }
    
    ctx.putImageData(newData, 0, 0)
  }
  
  const handleMouseMove = (e) => {
    if (!imageData || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)
    
    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const idx = (y * canvas.width + x) * 4
      const depth = imageData.data[idx]
      const depthMM = (depth / 255) * 50 // Convert to mm (0-50mm range)
      
      setDepthInfo({
        x,
        y,
        depth,
        depthMM: depthMM.toFixed(1),
        normalized: (depth / 255).toFixed(3),
      })
    }
  }
  
  const handleMouseLeave = () => {
    setDepthInfo(null)
  }
  
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3,
        background: theme => theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #0d1f3c 0%, #1a2947 100%)'
          : undefined
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Interactive Depth Map Viewer
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Color Mode</InputLabel>
          <Select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            label="Color Mode"
          >
            <MenuItem value="grayscale">Grayscale</MenuItem>
            <MenuItem value="heatmap">Heatmap</MenuItem>
            <MenuItem value="viridis">Viridis</MenuItem>
            <MenuItem value="plasma">Plasma</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      
      {loading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Loading depth map...
          </Typography>
          <LinearProgress />
        </Box>
      )}
      
      <Box
        sx={{
          position: 'relative',
          backgroundColor: '#050a15',
          p: 2,
          borderRadius: 2,
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
          display: loading ? 'none' : 'block',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            maxWidth: '100%',
            height: 'auto',
            cursor: 'crosshair',
            display: 'block',
            margin: '0 auto',
            borderRadius: '8px',
          }}
        />
        
        {depthInfo && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              p: 2,
              backgroundColor: 'background.paper',
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Depth Information
            </Typography>
            <Stack spacing={0.5}>
              <Chip
                label={`Position: (${depthInfo.x}, ${depthInfo.y})`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Depth: ${depthInfo.depthMM}mm`}
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`Value: ${depthInfo.depth}/255`}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Paper>
        )}
        
        {dimensions.width > 0 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              display: 'flex',
              gap: 1,
            }}
          >
            <Chip
              label={`${dimensions.width} × ${dimensions.height}px`}
              size="small"
              sx={{ 
                backgroundColor: 'background.paper',
                backdropFilter: 'blur(10px)',
              }}
            />
          </Box>
        )}
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        🖱️ Hover over the image to see depth values at each point • Brighter = Closer, Darker = Further
      </Typography>
    </Paper>
  )
}

export default DepthMapViewer