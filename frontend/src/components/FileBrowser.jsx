import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Stack,
  Divider,
  Tooltip,
  Fab,
} from '@mui/material'
import {
  Image as ImageIcon,
  ThreeDRotation as ThreeDIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  FolderOpen as FolderOpenIcon,
  History as HistoryIcon,
} from '@mui/icons-material'
import axios from 'axios'

function FileBrowser({ onSelectFiles }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepthMap, setSelectedDepthMap] = useState(null)
  const [selectedDxf, setSelectedDxf] = useState(null)
  const [selectedOriginal, setSelectedOriginal] = useState(null)

  useEffect(() => {
    if (open) {
      loadFiles()
    }
  }, [open])

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/api/files')
      setFiles(response.data.files)
    } catch (err) {
      setError('Failed to load files')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete ${filename}?`)) return
    
    try {
      await axios.delete(`/api/files/${filename}`)
      loadFiles()
    } catch (err) {
      console.error('Failed to delete file:', err)
    }
  }

  const handleDownload = (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const formatFileSize = (bytes) => {
    // Always show in MB for consistency
    const mb = bytes / (1024 * 1024)
    return mb.toFixed(2) + ' MB'
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return date.toLocaleDateString()
  }

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group files by their UUID
  const fileGroups = {}
  filteredFiles.forEach(file => {
    const match = file.filename.match(/([a-f0-9-]{36})/)
    if (match) {
      const uuid = match[1]
      if (!fileGroups[uuid]) {
        fileGroups[uuid] = {}
      }
      fileGroups[uuid][file.type] = file
    }
  })

  const depthMapFiles = filteredFiles.filter(f => f.type === 'depth_map')
  const dxfFiles = filteredFiles.filter(f => f.type === 'dxf')
  const originalFiles = filteredFiles.filter(f => f.type === 'original')

  const handleLoadFiles = () => {
    // Allow loading files independently
    const result = {}
    if (selectedOriginal) result.original_url = selectedOriginal.url
    if (selectedDepthMap) result.depth_map_url = selectedDepthMap.url
    if (selectedDxf) result.dxf_url = selectedDxf.url
    
    if (Object.keys(result).length > 0) {
      onSelectFiles(result)
      setOpen(false)
      setSelectedOriginal(null)
      setSelectedDepthMap(null)
      setSelectedDxf(null)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedOriginal(null)
    setSelectedDepthMap(null)
    setSelectedDxf(null)
    setSearchTerm('')
  }

  return (
    <>
      <Tooltip title="Load Previous Files">
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
          onClick={() => setOpen(true)}
        >
          <HistoryIcon />
        </Fab>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '70vh',
            background: theme => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #0d1f3c 0%, #1a2947 100%)'
              : undefined,
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderOpenIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Previously Converted Files
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              fullWidth
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
          ) : filteredFiles.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">
                {searchTerm ? 'No files found matching your search' : 'No converted files yet'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Depth Maps ({depthMapFiles.length})
                  </Typography>
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                    {depthMapFiles.map((file) => (
                      <ListItem
                        key={file.filename}
                        button
                        selected={selectedDepthMap?.filename === file.filename}
                        onClick={() => setSelectedDepthMap(file)}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon>
                          <ImageIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={file.filename}
                          secondary={`${formatFileSize(file.size)} • ${formatDate(file.timestamp)}`}
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(file.url, file.filename)
                              }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(file.filename)
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    DXF Files ({dxfFiles.length})
                  </Typography>
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
                    {dxfFiles.map((file) => (
                      <ListItem
                        key={file.filename}
                        button
                        selected={selectedDxf?.filename === file.filename}
                        onClick={() => setSelectedDxf(file)}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon>
                          <ThreeDIcon color="secondary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={file.filename}
                          secondary={`${formatFileSize(file.size)} • ${formatDate(file.timestamp)}`}
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(file.url, file.filename)
                              }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(file.filename)
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Stack>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={handleClose} variant="outlined">
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleLoadFiles}
                  disabled={!selectedDepthMap && !selectedDxf}
                >
                  Load Selected Files
                </Button>
              </Box>

              {selectedDepthMap && selectedDxf && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Selected: {selectedDepthMap.filename} + {selectedDxf.filename}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FileBrowser