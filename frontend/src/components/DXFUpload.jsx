import { useState, useCallback } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material'
import { CloudUpload as UploadIcon } from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

export default function DXFUpload({ onDXFUploaded }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    setError('')
    setLoading(true)
    
    const formData = new FormData()
    formData.append('dxf_file', file)
    
    try {
      const response = await axios.post('/api/upload-dxf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      // Pass the uploaded DXF data to parent
      onDXFUploaded({
        dxfUrl: response.data.dxf_url,
        analysis: response.data.analysis,
        filename: response.data.filename
      })
    } catch (err) {
      console.error('DXF upload error:', err)
      setError(err.response?.data?.detail || 'Failed to upload DXF file')
    } finally {
      setLoading(false)
    }
  }, [onDXFUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/dxf': ['.dxf'],
      'text/plain': ['.dxf']
    },
    maxFiles: 1,
    disabled: loading
  })

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 3
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ color: '#fff' }}>
        Upload DXF File
      </Typography>
      
      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
        Upload a DXF file to view it in the 3D viewer. Compatible with standard laser etching DXF formats.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'rgba(255, 255, 255, 0.3)',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: isDragActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }
        }}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <CircularProgress size={40} />
        ) : (
          <>
            <UploadIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.5)', mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#fff', mb: 1 }}>
              {isDragActive ? 'Drop the DXF file here' : 'Drag & drop a DXF file here'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              or click to select a file
            </Typography>
          </>
        )}
      </Box>
      
      <Button
        variant="outlined"
        startIcon={<UploadIcon />}
        onClick={() => document.querySelector('input[type="file"]').click()}
        disabled={loading}
        fullWidth
        sx={{ 
          mt: 2,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          color: '#fff',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          }
        }}
      >
        Select DXF File
      </Button>
    </Paper>
  )
}