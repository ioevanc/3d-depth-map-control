import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Stack,
  Tooltip,
  IconButton,
  Chip,
  LinearProgress,
} from '@mui/material'
import {
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  Clear as ClearIcon,
  AutoFixHigh as ProcessIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material'

function UploadForm({ onFileSelect, onProcess, onReset, preview, loading, hasResults, progress }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  })

  return (
    <Box>
      {!preview ? (
        <Paper
          {...getRootProps()}
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? 'action.hover' : 'background.default',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'divider',
            borderRadius: 3,
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <input {...getInputProps()} />
          
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: 3,
            background: theme => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}>
            <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            {isDragActive ? 'Drop your image here' : 'Drop your photo here'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            or click to browse
          </Typography>
          <Chip 
            label="JPG or PNG • Max 5MB" 
            size="small" 
            sx={{ 
              backgroundColor: 'background.paper',
              fontWeight: 500,
            }} 
          />
        </Paper>
      ) : (
        <Box>
          <Box sx={{ position: 'relative', mb: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: 'background.default',
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src={preview}
                alt="Preview"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: '12px',
                }}
              />
              
              {!hasResults && (
                <IconButton
                  onClick={onReset}
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    backgroundColor: 'background.paper',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      backgroundColor: 'error.main',
                      color: 'error.contrastText',
                    },
                  }}
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              )}
              
              {hasResults && (
                <Chip
                  icon={<CheckIcon />}
                  label="Processed"
                  size="small"
                  color="success"
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                  }}
                />
              )}
            </Paper>
          </Box>

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
            {!hasResults ? (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={onProcess}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ProcessIcon />}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: 'none',
                    background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    },
                  }}
                >
                  {loading ? 'Processing...' : 'Generate 3D Files'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onReset}
                  disabled={loading}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    px: 3,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                    },
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                size="large"
                onClick={onReset}
                startIcon={<ImageIcon />}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                  },
                }}
              >
                Process New Image
              </Button>
            )}
          </Stack>

          {loading && progress && (
            <Box sx={{ mt: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {progress.message || 'Processing...'}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress.value || 0} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: 'linear-gradient(90deg, #6366F1 0%, #EC4899 100%)',
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {progress.value || 0}% complete
                  </Typography>
                </Box>
                
                {progress.steps && (
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {progress.steps.map((step, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {step.completed ? (
                          <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                        ) : step.active ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: 'action.disabled' }} />
                        )}
                        <Typography 
                          variant="caption" 
                          color={step.active ? 'primary' : step.completed ? 'text.primary' : 'text.secondary'}
                          sx={{ fontWeight: step.active ? 600 : 400 }}
                        >
                          {step.name}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default UploadForm