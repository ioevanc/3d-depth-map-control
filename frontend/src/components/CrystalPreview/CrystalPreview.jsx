import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Grid } from '@react-three/drei'
import * as THREE from 'three'
import {
  Box,
  Paper,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  GridOn as GridIcon,
  Straighten as RulerIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material'

// Crystal component
const Crystal = ({ size, transmission, showGrid }) => {
  const meshRef = useRef()
  const edgesRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1
      if (edgesRef.current) {
        edgesRef.current.rotation.y = meshRef.current.rotation.y
      }
    }
  })

  return (
    <>
      {showGrid && (
        <Grid
          args={[Math.max(...size) * 2, Math.max(...size) * 2]}
          cellSize={10}
          cellThickness={0.5}
          cellColor="#3f3f3f"
          sectionSize={50}
          sectionThickness={1}
          sectionColor="#5d4b4b"
          fadeDistance={150}
          fadeStrength={1}
          position={[0, -size[1] / 2 - 0.2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
      
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <boxGeometry args={size} />
        <meshPhysicalMaterial
          color={0xffffff}
          transmission={transmission}
          opacity={1}
          transparent={true}
          roughness={0}
          metalness={0}
          ior={1.5}
          thickness={0.01}  // Very thin for clearer appearance
          specularIntensity={1}
          specularColor={0xffffff}
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          // Remove reflectivity as it's deprecated
        />
      </mesh>
      
      {/* Crystal edges - white and visible */}
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </lineSegments>
    </>
  )
}

// Point cloud component
const PointCloud = ({ points, zones, crystalSize }) => {
  const pointsRef = useRef()
  
  useEffect(() => {
    if (!pointsRef.current || !points || points.length === 0) {
      console.log('No points to render:', points?.length || 0)
      return
    }
    
    console.log(`Rendering ${points.length} points in crystal`)
    
    const positions = new Float32Array(points.length * 3)
    const colors = new Float32Array(points.length * 3)
    
    // Find bounds of the point cloud
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    
    points.forEach(point => {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
      minZ = Math.min(minZ, point.z)
      maxZ = Math.max(maxZ, point.z)
    })
    
    const width = maxX - minX
    const height = maxY - minY
    const depth = maxZ - minZ
    
    console.log('Point cloud bounds:', { width, height, depth })
    console.log('Crystal size:', crystalSize)
    
    // Scale to fit within crystal (with 10% margin)
    const margin = 0.9
    const scaleX = (crystalSize[0] * margin) / width
    const scaleY = (crystalSize[1] * margin) / height
    const scaleZ = (crystalSize[2] * margin) / depth
    const scale = Math.min(scaleX, scaleY, scaleZ)
    
    // Center the points in the crystal
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const centerZ = (minZ + maxZ) / 2
    
    points.forEach((point, i) => {
      // Center and scale points to fit in crystal
      positions[i * 3] = (point.x - centerX) * scale
      positions[i * 3 + 1] = (point.y - centerY) * scale
      positions[i * 3 + 2] = (point.z - centerZ) * scale
      
      // Color based on zone type - brighter colors for better visibility
      let color = new THREE.Color('#ffffff') // White for normal points
      if (point.zoneType === 'flat') {
        color = new THREE.Color('#ff6666')
      } else if (point.zoneType === 'custom') {
        color = new THREE.Color('#66ff66')
      }
      
      // Add some depth-based color variation
      const depthNorm = (point.z - minZ) / (maxZ - minZ)
      color.multiplyScalar(0.7 + depthNorm * 0.3)
      
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    })
    
    // Create buffer geometry
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeBoundingSphere()
    
    pointsRef.current.geometry = geometry
  }, [points, crystalSize])
  
  if (!points || points.length === 0) {
    return null
  }
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        size={1.5}
        vertexColors
        sizeAttenuation={false}
        transparent
        opacity={0.9}
        depthWrite={false}
        depthTest={true}
        blending={THREE.NormalBlending}  // Normal blending for solid points
      />
    </points>
  )
}

// Camera controller
const CameraController = () => {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(100, 100, 100)
    camera.lookAt(0, 0, 0)
  }, [camera])
  
  return null
}

// Standard crystal sizes (in mm)
const CRYSTAL_SIZES = {
  small: { name: 'Small (50×50×80mm)', size: [50, 80, 50] },
  medium: { name: 'Medium (60×60×100mm)', size: [60, 100, 60] },
  large: { name: 'Large (80×50×120mm)', size: [80, 120, 50] },
  custom: { name: 'Custom', size: [80, 100, 80] }
}

const CrystalPreview = ({ 
  dxfPoints = [], 
  zones = [],
  onCrystalSizeChange 
}) => {
  const [selectedSize, setSelectedSize] = useState('medium')
  const [customSize, setCustomSize] = useState({ x: 80, y: 100, z: 80 })
  const [crystalTransmission, setCrystalTransmission] = useState(1)  // Full transmission for clear glass
  const [showGrid, setShowGrid] = useState(false)  // Off by default for cleaner look
  const [showMeasurements, setShowMeasurements] = useState(true)
  const [viewMode, setViewMode] = useState('normal')
  
  // Debug logging
  useEffect(() => {
    console.log('CrystalPreview received points:', dxfPoints.length)
    if (dxfPoints.length > 0) {
      console.log('Sample point:', dxfPoints[0])
    }
  }, [dxfPoints])

  const getCurrentSize = () => {
    if (selectedSize === 'custom') {
      return [customSize.x, customSize.y, customSize.z]
    }
    return CRYSTAL_SIZES[selectedSize].size
  }

  const handleSizeChange = (newSize) => {
    setSelectedSize(newSize)
    if (onCrystalSizeChange) {
      onCrystalSizeChange(getCurrentSize())
    }
  }

  const handleCustomSizeChange = (axis, value) => {
    const newSize = { ...customSize, [axis]: parseFloat(value) || 0 }
    setCustomSize(newSize)
    if (selectedSize === 'custom' && onCrystalSizeChange) {
      onCrystalSizeChange([newSize.x, newSize.y, newSize.z])
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      {/* 3D View */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Canvas
          camera={{ position: [100, 100, 100], fov: 50 }}
          style={{ background: '#000000' }}
          gl={{ 
            antialias: true, 
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
            outputColorSpace: THREE.SRGBColorSpace,
            // Enable high precision for better transmission
            precision: 'highp'
          }}
          shadows
        >
          <CameraController />
          
          {/* Subtle ambient for base visibility */}
          <ambientLight intensity={0.2} />
          
          {/* Key light - main light source */}
          <spotLight
            position={[50, 80, 50]}
            angle={0.5}
            penumbra={0.8}
            intensity={3}
            color="#ffffff"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={0.5}
            shadow-camera-far={500}
          />
          
          {/* Back rim light for edge definition */}
          <spotLight
            position={[-80, 50, -80]}
            angle={0.4}
            penumbra={1}
            intensity={2}
            color="#88aaff"
          />
          
          {/* Side lights for crystal edges */}
          <directionalLight position={[100, 0, 0]} intensity={0.5} color="#ffffff" />
          <directionalLight position={[-100, 0, 0]} intensity={0.5} color="#ffffff" />
          
          {/* Bottom light for base reflection */}
          <pointLight position={[0, -80, 0]} intensity={0.8} color="#ffffff" />
          
          {/* Subtle colored accent lights */}
          <pointLight position={[30, 30, -30]} intensity={0.3} color="#ff8888" />
          <pointLight position={[-30, 30, 30]} intensity={0.3} color="#8888ff" />
          
          {/* No fog - we want clarity */}
          
          <Crystal
            size={getCurrentSize()}
            transmission={crystalTransmission}
            showGrid={showGrid}
          />
          
          <PointCloud
            points={dxfPoints}
            zones={zones}
            crystalSize={getCurrentSize()}
          />
          
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            zoomSpeed={0.5}
            panSpeed={0.5}
            rotateSpeed={0.5}
          />
          
          {/* Premium environment for reflections */}
          <Environment preset="studio" intensity={0.5} />
        </Canvas>
        
        {/* View controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            gap: 1
          }}
        >
          <Tooltip title="Toggle Grid">
            <IconButton
              onClick={() => setShowGrid(!showGrid)}
              sx={{ 
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
              }}
            >
              <GridIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset View">
            <IconButton
              onClick={() => {
                // TODO: Reset camera position
              }}
              sx={{ 
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
              }}
            >
              <ResetIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Controls Panel */}
      <Paper
        sx={{
          width: 300,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Typography variant="h6">Crystal Settings</Typography>
        
        {/* Crystal Size */}
        <FormControl fullWidth size="small">
          <InputLabel>Crystal Size</InputLabel>
          <Select
            value={selectedSize}
            onChange={(e) => handleSizeChange(e.target.value)}
            label="Crystal Size"
          >
            {Object.entries(CRYSTAL_SIZES).map(([key, value]) => (
              <MenuItem key={key} value={key}>
                {value.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Custom Size Inputs */}
        {selectedSize === 'custom' && (
          <Stack spacing={1}>
            <TextField
              label="Width (mm)"
              type="number"
              size="small"
              value={customSize.x}
              onChange={(e) => handleCustomSizeChange('x', e.target.value)}
            />
            <TextField
              label="Height (mm)"
              type="number"
              size="small"
              value={customSize.y}
              onChange={(e) => handleCustomSizeChange('y', e.target.value)}
            />
            <TextField
              label="Depth (mm)"
              type="number"
              size="small"
              value={customSize.z}
              onChange={(e) => handleCustomSizeChange('z', e.target.value)}
            />
          </Stack>
        )}
        
        {/* Crystal Transparency */}
        <Box>
          <Typography gutterBottom>
            Crystal Transparency: {Math.round(crystalTransmission * 100)}%
          </Typography>
          <Slider
            value={crystalTransmission}
            onChange={(e, value) => setCrystalTransmission(value)}
            min={0}
            max={1}
            step={0.1}
            marks
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
          />
        </Box>
        
        {/* View Mode */}
        <Box>
          <Typography gutterBottom>View Mode</Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, value) => value && setViewMode(value)}
            size="small"
            fullWidth
          >
            <ToggleButton value="normal">Normal</ToggleButton>
            <ToggleButton value="wireframe">Wireframe</ToggleButton>
            <ToggleButton value="depth">Depth Map</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {/* Statistics */}
        <Box sx={{ mt: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Points: {dxfPoints.length.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crystal Volume: {(getCurrentSize()[0] * getCurrentSize()[1] * getCurrentSize()[2] / 1000).toFixed(1)} cm³
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Zones: {zones.length}
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}

export default CrystalPreview