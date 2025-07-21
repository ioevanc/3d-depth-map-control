import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Paper,
  Stack,
  Typography,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Checkbox,
  Tooltip,
  Button,
  Divider
} from '@mui/material'
import {
  CropFree as RectangleIcon,
  Gesture as LassoIcon,
  AutoFixHigh as MagicWandIcon,
  TextFields as TextDetectIcon,
  Layers as LayersIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Add as AddIcon,
  ThreeDRotation as ThreeDIcon,
  TextFormat as FlatIcon,
  Tune as CustomIcon
} from '@mui/icons-material'

const DepthZoneEditor = ({ 
  originalImage, 
  onZonesChange,
  disabled = false 
}) => {
  const canvasRef = useRef(null)
  const [selectedTool, setSelectedTool] = useState('rectangle')
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [currentPath, setCurrentPath] = useState([])

  // Zone types
  const ZONE_TYPES = {
    DEPTH_MAPPED: '3d',
    FLAT: 'flat',
    CUSTOM: 'custom'
  }

  // Initialize canvas
  useEffect(() => {
    if (!originalImage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      redrawCanvas()
    }
    
    img.src = originalImage
  }, [originalImage])
  
  // Redraw when zones change
  useEffect(() => {
    if (originalImage && canvasRef.current) {
      redrawCanvas()
    }
  }, [zones, selectedZone])

  // Redraw canvas with image and zones
  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      
      // Draw zones
      zones.forEach((zone, index) => {
        if (!zone.visible) return
        
        ctx.save()
        ctx.globalAlpha = 0.5
        
        // Set color based on zone type
        switch (zone.type) {
          case ZONE_TYPES.DEPTH_MAPPED:
            ctx.fillStyle = '#2196f3' // Blue
            break
          case ZONE_TYPES.FLAT:
            ctx.fillStyle = '#f44336' // Red
            break
          case ZONE_TYPES.CUSTOM:
            ctx.fillStyle = '#4caf50' // Green
            break
        }
        
        // Draw zone shape
        if (zone.path && zone.path.length > 0) {
          ctx.beginPath()
          ctx.moveTo(zone.path[0].x, zone.path[0].y)
          zone.path.forEach(point => ctx.lineTo(point.x, point.y))
          ctx.closePath()
          ctx.fill()
        }
        
        // Draw selection outline if selected
        if (selectedZone === index) {
          ctx.strokeStyle = '#ffeb3b'
          ctx.lineWidth = 3
          ctx.stroke()
        }
        
        ctx.restore()
      })
    }
    
    img.src = originalImage
  }

  // Handle mouse events
  const handleMouseDown = (e) => {
    if (disabled) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsDrawing(true)
    setDrawStart({ x, y })
    
    if (selectedTool === 'lasso') {
      setCurrentPath([{ x, y }])
    }
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || disabled) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (selectedTool === 'lasso') {
      setCurrentPath(prev => [...prev, { x, y }])
    }
    
    // TODO: Add preview drawing
  }

  const handleMouseUp = (e) => {
    if (!isDrawing || disabled) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    let newZone = {
      id: Date.now(),
      type: ZONE_TYPES.DEPTH_MAPPED,
      depth: 0,
      visible: true,
      path: []
    }
    
    if (selectedTool === 'rectangle') {
      // Create rectangle path
      newZone.path = [
        { x: drawStart.x, y: drawStart.y },
        { x: x, y: drawStart.y },
        { x: x, y: y },
        { x: drawStart.x, y: y }
      ]
    } else if (selectedTool === 'lasso') {
      newZone.path = currentPath
    }
    
    const updatedZones = [...zones, newZone]
    setZones(updatedZones)
    onZonesChange?.(updatedZones)
    
    setIsDrawing(false)
    setCurrentPath([])
    redrawCanvas()
  }

  // Zone management
  const updateZone = (index, updates) => {
    const updatedZones = zones.map((zone, i) => 
      i === index ? { ...zone, ...updates } : zone
    )
    setZones(updatedZones)
    onZonesChange?.(updatedZones)
    redrawCanvas()
  }

  const deleteZone = (index) => {
    const updatedZones = zones.filter((_, i) => i !== index)
    setZones(updatedZones)
    onZonesChange?.(updatedZones)
    setSelectedZone(null)
    redrawCanvas()
  }

  const detectText = async () => {
    if (!originalImage) return
    
    try {
      // Create FormData with image
      const response = await fetch(originalImage)
      const blob = await response.blob()
      const formData = new FormData()
      formData.append('image', blob)
      
      // Call text detection API
      const detectResponse = await fetch('/api/zones/detect-text', {
        method: 'POST',
        body: formData
      })
      
      if (!detectResponse.ok) {
        throw new Error('Text detection failed')
      }
      
      const data = await detectResponse.json()
      
      // Create zones from detected regions
      const newZones = data.regions.map((region, index) => ({
        id: Date.now() + index,
        type: ZONE_TYPES.FLAT,
        depth: 5, // Default depth for text
        visible: true,
        path: [
          { x: region.x, y: region.y },
          { x: region.x + region.width, y: region.y },
          { x: region.x + region.width, y: region.y + region.height },
          { x: region.x, y: region.y + region.height }
        ]
      }))
      
      const updatedZones = [...zones, ...newZones]
      setZones(updatedZones)
      onZonesChange?.(updatedZones)
      redrawCanvas()
      
    } catch (error) {
      console.error('Text detection error:', error)
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      {/* Canvas Area */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'auto' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            cursor: disabled ? 'not-allowed' : 'crosshair',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </Box>

      {/* Tools Panel */}
      <Paper
        sx={{
          width: 300,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {/* Drawing Tools */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Drawing Tools
          </Typography>
          <ToggleButtonGroup
            value={selectedTool}
            exclusive
            onChange={(e, value) => value && setSelectedTool(value)}
            size="small"
            fullWidth
          >
            <ToggleButton value="rectangle">
              <Tooltip title="Rectangle Selection">
                <RectangleIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="lasso">
              <Tooltip title="Lasso Selection">
                <LassoIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="magic">
              <Tooltip title="Magic Wand">
                <MagicWandIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TextDetectIcon />}
            onClick={detectText}
            sx={{ mt: 1 }}
            disabled={disabled}
          >
            Detect Text
          </Button>
        </Box>

        <Divider />

        {/* Zones List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Depth Zones
          </Typography>
          <List dense>
            {zones.map((zone, index) => (
              <ListItem
                key={zone.id}
                selected={selectedZone === index}
                onClick={() => setSelectedZone(index)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={zone.visible}
                    onChange={(e) => updateZone(index, { visible: e.target.checked })}
                    tabIndex={-1}
                  />
                </ListItemIcon>
                <ListItemIcon>
                  {zone.type === ZONE_TYPES.DEPTH_MAPPED && <ThreeDIcon />}
                  {zone.type === ZONE_TYPES.FLAT && <FlatIcon />}
                  {zone.type === ZONE_TYPES.CUSTOM && <CustomIcon />}
                </ListItemIcon>
                <ListItemText 
                  primary={`Zone ${index + 1}`}
                  secondary={`${zone.type} ${zone.type !== ZONE_TYPES.DEPTH_MAPPED ? `(${zone.depth}mm)` : ''}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => deleteZone(index)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Zone Properties */}
        {selectedZone !== null && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Zone Properties
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Zone Type</InputLabel>
              <Select
                value={zones[selectedZone].type}
                onChange={(e) => updateZone(selectedZone, { type: e.target.value })}
                label="Zone Type"
              >
                <MenuItem value={ZONE_TYPES.DEPTH_MAPPED}>3D Depth Mapped</MenuItem>
                <MenuItem value={ZONE_TYPES.FLAT}>Flat (Fixed Depth)</MenuItem>
                <MenuItem value={ZONE_TYPES.CUSTOM}>Custom Depth</MenuItem>
              </Select>
            </FormControl>
            
            {zones[selectedZone].type !== ZONE_TYPES.DEPTH_MAPPED && (
              <Box>
                <Typography gutterBottom>
                  Depth: {zones[selectedZone].depth}mm
                </Typography>
                <Slider
                  value={zones[selectedZone].depth}
                  onChange={(e, value) => updateZone(selectedZone, { depth: value })}
                  min={-10}
                  max={25}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default DepthZoneEditor