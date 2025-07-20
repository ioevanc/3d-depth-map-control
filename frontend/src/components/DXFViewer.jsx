import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei'
import { Box, Paper, Typography, CircularProgress, Chip, Stack, LinearProgress, Slider, TextField, IconButton, Button } from '@mui/material'
import { RotateLeft as RotateIcon, CenterFocusStrong as CenterIcon } from '@mui/icons-material'
import * as THREE from 'three'
import axios from 'axios'

function PointCloud({ points, depthScale = 1 }) {
  const geometry = useRef()
  
  useEffect(() => {
    if (geometry.current && points.length > 0) {
      const positions = new Float32Array(points.length * 3)
      const colors = new Float32Array(points.length * 3)
      
      // Find actual depth range
      let minZ = Infinity, maxZ = -Infinity
      points.forEach(point => {
        minZ = Math.min(minZ, point[2])
        maxZ = Math.max(maxZ, point[2])
      })
      const depthRange = maxZ - minZ
      
      points.forEach((point, i) => {
        positions[i * 3] = point[0]
        positions[i * 3 + 1] = point[1]
        positions[i * 3 + 2] = point[2] * depthScale // Apply depth scaling
        
        // Color based on actual depth range
        const normalizedZ = (point[2] - minZ) / depthRange
        colors[i * 3] = normalizedZ
        colors[i * 3 + 1] = 0.5 + normalizedZ * 0.5
        colors[i * 3 + 2] = 1 - normalizedZ
      })
      
      geometry.current.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.current.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.current.computeBoundingSphere()
    }
  }, [points, depthScale])
  
  return (
    <points>
      <bufferGeometry ref={geometry} />
      <pointsMaterial
        size={1.5}
        vertexColors
        sizeAttenuation={false}
        transparent
        opacity={0.8}
      />
    </points>
  )
}

function Scene({ points, depthScale, autoRotate, onControlsChange }) {
  const controlsRef = useRef()
  
  // Calculate center of point cloud for better camera targeting
  const center = { x: 0, y: 0, z: 0 }
  if (points.length > 0) {
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point[0],
      y: acc.y + point[1],
      z: acc.z + point[2]
    }), { x: 0, y: 0, z: 0 })
    center.x = sum.x / points.length
    center.y = sum.y / points.length
    center.z = sum.z / points.length
  }

  useEffect(() => {
    if (controlsRef.current) {
      onControlsChange(controlsRef.current)
    }
  }, [onControlsChange])

  return (
    <>
      <PerspectiveCamera makeDefault position={[center.x + 300, center.y + 300, center.z + 300]} />
      <OrbitControls
        ref={controlsRef}
        target={[center.x, center.y, center.z]}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        panSpeed={1}
        rotateSpeed={1}
        zoomSpeed={1}
        minDistance={50}
        maxDistance={2000}
      />
      <ambientLight intensity={0.5} />
      <pointLight position={[center.x + 100, center.y + 100, center.z + 100]} />
      <directionalLight position={[center.x - 100, center.y + 100, center.z - 100]} intensity={0.5} />
      
      <Suspense fallback={null}>
        <PointCloud points={points} depthScale={depthScale} />
      </Suspense>
      
      <gridHelper args={[1000, 100]} position={[center.x, 0, center.z]} />
      <axesHelper args={[200]} position={[center.x, center.y, center.z]} />
    </>
  )
}

function parseDXF(dxfContent) {
  const points = []
  const lines = dxfContent.split('\n').map(line => line.trim())
  
  // Find ENTITIES section
  let entitiesStart = -1
  for (let i = 0; i < lines.length - 2; i++) {
    if (lines[i] === 'SECTION' && lines[i + 2] === 'ENTITIES') {
      entitiesStart = i + 2
      break
    }
  }
  
  if (entitiesStart === -1) {
    console.error('No ENTITIES section found in DXF')
    return points
  }
  
  // Parse points from ENTITIES section
  let i = entitiesStart + 1
  while (i < lines.length) {
    // Check for ENDSEC which ends the ENTITIES section
    if (lines[i] === 'ENDSEC') {
      break
    }
    
    // Look for POINT entities (code 0 followed by POINT)
    if (lines[i] === '0' && i + 1 < lines.length && lines[i + 1] === 'POINT') {
      let x = null, y = null, z = null
      
      // Skip past '0' and 'POINT'
      i += 2
      
      // Read point data until we hit another entity (code 0) or end of file
      while (i < lines.length - 1) {
        const code = lines[i]
        const value = lines[i + 1]
        
        if (code === '0') {
          // Found start of next entity, save current point and break
          if (x !== null && y !== null && z !== null) {
            points.push([x, y, z])
          }
          break
        }
        
        switch (code) {
          case '10': // X coordinate
            x = parseFloat(value)
            break
          case '20': // Y coordinate
            y = parseFloat(value)
            break
          case '30': // Z coordinate
            z = parseFloat(value)
            // After reading Z, we have a complete point
            if (x !== null && y !== null) {
              points.push([x, y, z])
              x = null
              y = null
              z = null
            }
            break
        }
        
        i += 2 // Move to next code/value pair
      }
    } else {
      i++
    }
  }
  
  console.log(`Parsed ${points.length} points from DXF`)
  return points
}

function DXFViewer({ dxfUrl }) {
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [loadProgress, setLoadProgress] = useState(0)
  const [depthScale, setDepthScale] = useState(2) // Start with 2x depth scaling
  const [autoRotate, setAutoRotate] = useState(false)
  const controlsRef = useRef()
  const abortControllerRef = useRef()
  
  const handleControlsChange = (controls) => {
    controlsRef.current = controls
  }
  
  const handleResetCamera = () => {
    if (controlsRef.current && points.length > 0) {
      const sum = points.reduce((acc, point) => ({
        x: acc.x + point[0],
        y: acc.y + point[1],
        z: acc.z + point[2]
      }), { x: 0, y: 0, z: 0 })
      const center = {
        x: sum.x / points.length,
        y: sum.y / points.length,
        z: sum.z / points.length
      }
      
      controlsRef.current.target.set(center.x, center.y, center.z)
      controlsRef.current.object.position.set(center.x + 300, center.y + 300, center.z + 300)
      controlsRef.current.update()
    }
  }
  
  useEffect(() => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Reset state when URL changes
    setError(null)
    setPoints([])
    setStats(null)
    setLoadProgress(0)
    
    if (!dxfUrl) {
      setLoading(false)
      return
    }
    
    // Set loading immediately when we have a URL
    setLoading(true)
    setLoadProgress(0)
    
    const loadDXF = async () => {
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      try {
        setLoadProgress(10)
        
        const response = await axios.get(dxfUrl, {
          responseType: 'text',
          signal: abortControllerRef.current.signal,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 80) / progressEvent.total)
              setLoadProgress(10 + percentCompleted)
            }
          }
        })
        
        setLoadProgress(90)
        const parsedPoints = parseDXF(response.data)
        
        if (parsedPoints.length === 0) {
          throw new Error('No points found in DXF file')
        }
        
        // Calculate bounding box without spread operator (for large arrays)
        let minX = Infinity, maxX = -Infinity
        let minY = Infinity, maxY = -Infinity
        let minZ = Infinity, maxZ = -Infinity
        
        for (const point of parsedPoints) {
          minX = Math.min(minX, point[0])
          maxX = Math.max(maxX, point[0])
          minY = Math.min(minY, point[1])
          maxY = Math.max(maxY, point[1])
          minZ = Math.min(minZ, point[2])
          maxZ = Math.max(maxZ, point[2])
        }
        
        setStats({
          pointCount: parsedPoints.length,
          bounds: {
            minX, maxX, minY, maxY, minZ, maxZ
          }
        })
        
        // Sample points if there are too many (for performance)
        const maxPoints = 50000 // Limit for smooth rendering
        let displayPoints = parsedPoints
        if (parsedPoints.length > maxPoints) {
          const sampleRate = Math.ceil(parsedPoints.length / maxPoints)
          displayPoints = parsedPoints.filter((_, index) => index % sampleRate === 0)
          console.log(`Sampling ${parsedPoints.length} points to ${displayPoints.length} for display`)
        }
        
        setPoints(displayPoints)
        setLoadProgress(100)
      } catch (err) {
        if (axios.isCancel(err)) {
          return
        }
        console.error('DXF loading error:', err)
        setError(err.message || 'Failed to load DXF file')
      } finally {
        setLoading(false)
      }
    }
    
    loadDXF()
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [dxfUrl])
  
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
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        3D Point Cloud Viewer
      </Typography>
      
      {loading ? (
        <Box sx={{ p: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Loading point cloud data...
          </Typography>
          <LinearProgress variant="determinate" value={loadProgress} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        </Box>
      ) : error ? (
        <Typography color="error">Error loading DXF: {error}</Typography>
      ) : points.length > 0 ? (
        <>
          <Box
            sx={{
              width: '100%',
              height: '500px',
              backgroundColor: '#050a15',
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Canvas>
              <Scene 
                points={points} 
                depthScale={depthScale} 
                autoRotate={autoRotate}
                onControlsChange={handleControlsChange}
              />
              <Stats showPanel={0} className="stats" />
            </Canvas>
            
            {stats && (
              <Paper
                elevation={8}
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  p: 2,
                  backgroundColor: 'background.paper',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Point Cloud Statistics
                </Typography>
                <Stack spacing={0.5}>
                  <Chip
                    label={`Points: ${stats.pointCount.toLocaleString()}`}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label={`Width: ${(stats.bounds.maxX - stats.bounds.minX).toFixed(1)}mm`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Height: ${(stats.bounds.maxY - stats.bounds.minY).toFixed(1)}mm`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Depth: ${(stats.bounds.maxZ - stats.bounds.minZ).toFixed(1)}mm`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Paper>
            )}
            
            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
              }}
            >
              <Button
                variant={autoRotate ? "contained" : "outlined"}
                onClick={() => setAutoRotate(!autoRotate)}
                startIcon={<RotateIcon />}
                size="small"
                sx={{
                  backgroundColor: autoRotate ? 'primary.main' : 'background.paper',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: autoRotate ? 'primary.dark' : 'background.paper',
                  }
                }}
              >
                {autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
              </Button>
              <IconButton
                onClick={handleResetCamera}
                size="small"
                sx={{
                  backgroundColor: 'background.paper',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                <CenterIcon />
              </IconButton>
            </Stack>
          </Box>
          
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Depth Scale Adjustment
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" sx={{ minWidth: 40 }}>0.5x</Typography>
              <Slider
                value={depthScale}
                onChange={(e, value) => setDepthScale(value)}
                min={0.5}
                max={10}
                step={0.5}
                marks={[
                  { value: 1, label: '1x' },
                  { value: 2, label: '2x' },
                  { value: 5, label: '5x' },
                  { value: 10, label: '10x' }
                ]}
                valueLabelDisplay="auto"
                sx={{ flexGrow: 1 }}
              />
              <Typography variant="body2" sx={{ minWidth: 40 }}>10x</Typography>
              <TextField
                value={depthScale}
                onChange={(e) => setDepthScale(parseFloat(e.target.value) || 1)}
                type="number"
                size="small"
                inputProps={{ min: 0.5, max: 10, step: 0.5 }}
                sx={{ width: 80 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Adjust the depth scaling to make the 3D effect more pronounced. Higher values create deeper etching.
            </Typography>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            🖱️ Left click + drag to rotate • Scroll to zoom • Right click + drag to pan
          </Typography>
        </>
      ) : (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No point cloud data available
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

export default DXFViewer