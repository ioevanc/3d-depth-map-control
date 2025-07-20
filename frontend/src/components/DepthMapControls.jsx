import { useState, useEffect, useRef } from 'react'
import { 
  Box, 
  Slider, 
  Typography, 
  Stack, 
  IconButton, 
  Tooltip,
  Paper,
  Button,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress
} from '@mui/material'
import { 
  RestartAlt as ResetIcon,
  Tune as TuneIcon,
  Save as SaveIcon,
  CloudUpload as LoadIcon
} from '@mui/icons-material'

const presets = {
  default: {
    name: 'Default',
    blur_amount: 0,
    contrast: 1.0,
    brightness: 0,
    edge_enhancement: 0,
    invert_depth: false
  },
  portrait: {
    name: 'Portrait',
    blur_amount: 1.5,
    contrast: 1.2,
    brightness: 5,
    edge_enhancement: 0.3,
    invert_depth: false
  },
  landscape: {
    name: 'Landscape',
    blur_amount: 0.5,
    contrast: 1.3,
    brightness: -5,
    edge_enhancement: 0.5,
    invert_depth: false
  },
  text: {
    name: 'Text/Logo',
    blur_amount: 0,
    contrast: 1.5,
    brightness: 10,
    edge_enhancement: 0.8,
    invert_depth: false
  },
  fine_detail: {
    name: 'Fine Detail',
    blur_amount: 0.2,
    contrast: 1.4,
    brightness: 0,
    edge_enhancement: 0.6,
    invert_depth: false
  }
}

function DepthMapControls({ onParametersChange, onApply, previewLoading, disabled = false, onProgressChange }) {
  const [selectedPreset, setSelectedPreset] = useState('default')
  const [parameters, setParameters] = useState(presets.default)
  const [lastChangedParam, setLastChangedParam] = useState(null)
  const [previewProgress, setPreviewProgress] = useState(0)
  
  const previewTimeoutRef = useRef(null)
  const lastPreviewRequestRef = useRef(null)
  const isMountedRef = useRef(false)
  const progressIntervalRef = useRef(null)
  
  // Reset mounted flag when disabled state changes
  useEffect(() => {
    if (!disabled) {
      isMountedRef.current = false
    }
  }, [disabled])
  
  useEffect(() => {
    // Don't run if disabled
    if (disabled) return
    
    // Skip the very first mount
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    
    // Cancel any pending preview request
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }
    
    // Cancel any ongoing preview request
    if (lastPreviewRequestRef.current) {
      lastPreviewRequestRef.current.abort = true
    }
    
    // Debounce parameter changes
    previewTimeoutRef.current = setTimeout(() => {
      const requestId = Date.now()
      lastPreviewRequestRef.current = { id: requestId, abort: false }
      
      // Only call if not aborted
      setTimeout(() => {
        if (lastPreviewRequestRef.current?.id === requestId && !lastPreviewRequestRef.current?.abort) {
          onParametersChange(parameters)
        }
      }, 0)
    }, 300) // Reduced back to 300ms for better responsiveness
    
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [parameters, onParametersChange, disabled])
  
  // Handle preview progress animation
  useEffect(() => {
    if (previewLoading) {
      setPreviewProgress(0)
      
      // Clear any existing interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      
      // Simulate progress
      let progress = 0
      progressIntervalRef.current = setInterval(() => {
        progress += Math.random() * 15 + 5 // Random increment between 5-20
        if (progress >= 90) {
          progress = 90 // Cap at 90% until actually complete
        }
        setPreviewProgress(Math.round(progress))
      }, 100)
    } else {
      // Complete the progress
      if (previewProgress > 0 && previewProgress < 100) {
        setPreviewProgress(100)
        setTimeout(() => {
          setPreviewProgress(0)
        }, 500)
      }
      
      // Clear interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [previewLoading])
  
  // Report progress changes
  useEffect(() => {
    if (onProgressChange) {
      onProgressChange(previewProgress)
    }
  }, [previewProgress, onProgressChange])
  
  const handleSliderChange = (param) => (event, value) => {
    setLastChangedParam(param)
    setParameters(prev => ({
      ...prev,
      [param]: value
    }))
  }
  
  const handleSwitchChange = (param) => (event) => {
    setLastChangedParam(param)
    setParameters(prev => ({
      ...prev,
      [param]: event.target.checked
    }))
  }
  
  const handlePresetChange = (event) => {
    const presetKey = event.target.value
    setSelectedPreset(presetKey)
    setLastChangedParam('preset')
    setParameters(presets[presetKey])
  }
  
  const handleReset = () => {
    setSelectedPreset('default')
    setParameters(presets.default)
  }
  
  const handleApply = () => {
    onApply(parameters)
  }
  
  const getParameterDisplayName = (param) => {
    const names = {
      blur_amount: 'Blur',
      contrast: 'Contrast',
      brightness: 'Brightness',
      edge_enhancement: 'Edge Enhancement',
      invert_depth: 'Depth Inversion',
      preset: 'Preset'
    }
    return names[param] || param
  }
  
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3,
        position: 'relative',
        background: theme => theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #0d1f3c 0%, #1a2947 100%)'
          : undefined,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
    >
      {previewLoading && (
        <>
          <LinearProgress 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0,
              height: 2,
              borderRadius: '4px 4px 0 0'
            }} 
          />
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 16,
              color: 'primary.main',
              fontSize: '0.7rem',
              fontWeight: 500
            }}
          >
            {lastChangedParam 
              ? `Applying ${getParameterDisplayName(lastChangedParam)}... ${previewProgress}%`
              : `Updating preview... ${previewProgress}%`
            }
          </Typography>
        </>
      )}
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TuneIcon />
            Depth Map Controls
          </Typography>
          <Tooltip title="Reset to default">
            <IconButton onClick={handleReset} size="small">
              <ResetIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <FormControl fullWidth size="small">
          <InputLabel>Preset</InputLabel>
          <Select
            value={selectedPreset}
            onChange={handlePresetChange}
            label="Preset"
          >
            {Object.entries(presets).map(([key, preset]) => (
              <MenuItem key={key} value={key}>{preset.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Blur Amount: {parameters.blur_amount.toFixed(1)}
          </Typography>
          <Slider
            value={parameters.blur_amount}
            onChange={handleSliderChange('blur_amount')}
            min={0}
            max={10}
            step={0.5}
            valueLabelDisplay="auto"
          />
          <Typography variant="caption" color="text.secondary">
            Reduces noise in the depth map
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Contrast: {parameters.contrast.toFixed(1)}x
          </Typography>
          <Slider
            value={parameters.contrast}
            onChange={handleSliderChange('contrast')}
            min={0.5}
            max={2.0}
            step={0.1}
            valueLabelDisplay="auto"
            marks={[
              { value: 0.5, label: '0.5x' },
              { value: 1.0, label: '1x' },
              { value: 2.0, label: '2x' }
            ]}
          />
          <Typography variant="caption" color="text.secondary">
            Adjusts the depth range
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Brightness: {parameters.brightness > 0 ? '+' : ''}{parameters.brightness}
          </Typography>
          <Slider
            value={parameters.brightness}
            onChange={handleSliderChange('brightness')}
            min={-50}
            max={50}
            step={5}
            valueLabelDisplay="auto"
            marks={[
              { value: -50, label: '-50' },
              { value: 0, label: '0' },
              { value: 50, label: '+50' }
            ]}
          />
          <Typography variant="caption" color="text.secondary">
            Overall depth offset
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Edge Enhancement: {(parameters.edge_enhancement * 100).toFixed(0)}%
          </Typography>
          <Slider
            value={parameters.edge_enhancement}
            onChange={handleSliderChange('edge_enhancement')}
            min={0}
            max={1}
            step={0.1}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
          />
          <Typography variant="caption" color="text.secondary">
            Preserves fine details and edges
          </Typography>
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={parameters.invert_depth}
              onChange={handleSwitchChange('invert_depth')}
            />
          }
          label="Invert Depth"
        />
        
        <Button
          variant="contained"
          onClick={handleApply}
          fullWidth
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46a2 100%)',
            }
          }}
        >
          Apply Parameters
        </Button>
      </Stack>
    </Paper>
  )
}

export default DepthMapControls