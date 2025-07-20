import { useState, useEffect } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  Divider,
  Tooltip,
  Paper,
  Button,
} from '@mui/material'
import {
  Image as ImageIcon,
  ThreeDRotation as ThreeDIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FolderOpen as FolderIcon,
  ViewInAr as ViewIcon,
} from '@mui/icons-material'
import axios from 'axios'

function FileBrowserNew({ onLoadFiles, compact = false }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const loadFiles = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.get('/api/files/grouped')
      setGroups(response.data.groups)
    } catch (err) {
      setError('Failed to load files')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadFiles()
  }, [])
  
  const handleDelete = async (uuid) => {
    if (!window.confirm('Delete all files in this group?')) return
    
    try {
      // Delete using any file from the group
      const group = groups.find(g => g.uuid === uuid)
      if (group) {
        const filename = group.depth_map_url?.split('/').pop() || 
                        group.dxf_url?.split('/').pop() ||
                        group.original_url?.split('/').pop()
        
        if (filename) {
          await axios.delete(`/api/files/${filename}`)
          loadFiles() // Refresh
        }
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }
  
  const handleLoad = (group) => {
    onLoadFiles({
      original_url: group.original_url,
      depth_map_url: group.depth_map_url,
      dxf_url: group.dxf_url
    })
  }
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
  
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    // Handle negative time (future dates due to timezone issues)
    if (diffMins < 0) return 'Just now'
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    
    return date.toLocaleDateString()
  }
  
  const filteredGroups = groups.filter(group => {
    if (!searchTerm) return true
    return group.uuid.toLowerCase().includes(searchTerm.toLowerCase())
  })
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }
  
  return (
    <Box>
      {!compact && (
        <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          <IconButton onClick={loadFiles} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      )}
      
      {filteredGroups.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">
            No converted files yet
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: compact ? 0 : 1 }}>
          {filteredGroups.map((group) => (
            <Paper
              key={group.uuid}
              elevation={1}
              sx={{ 
                mb: 1, 
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: 3,
                }
              }}
            >
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleLoad(group)}>
                  <ListItemIcon>
                    <ViewIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="subtitle2" noWrap>
                          {formatDate(group.timestamp)}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                          {group.original_url && (
                            <Chip 
                              size="small" 
                              icon={<ImageIcon />} 
                              label="Image" 
                              variant="outlined"
                              sx={{ height: 20 }}
                            />
                          )}
                          {group.depth_map_url && (
                            <Chip 
                              size="small" 
                              label="Depth" 
                              variant="outlined"
                              color="primary"
                              sx={{ height: 20 }}
                            />
                          )}
                          {group.dxf_url && (
                            <Chip 
                              size="small" 
                              icon={<ThreeDIcon />} 
                              label="DXF" 
                              variant="outlined"
                              color="secondary"
                              sx={{ height: 20 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(group.total_size)} • ID: {group.uuid.slice(0, 8)}
                      </Typography>
                    }
                  />
                  <Tooltip title="Delete group">
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(group.uuid)
                      }}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
    </Box>
  )
}

export default FileBrowserNew