import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Fade,
  Grid,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  History as HistoryIcon,
  AutoFixHigh as ProcessIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  PersonOff as LogoutIcon,
  Folder as FolderIcon,
  Layers as LayersIcon,
} from '@mui/icons-material'
import UploadForm from './UploadForm'
import DepthMapControls from './DepthMapControls'
import DepthMapViewer from './DepthMapViewer'
import DXFViewer from './DXFViewer'
import FileBrowserNew from './FileBrowserNew'
import ProjectList from './ProjectList'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import DXFUpload from './DXFUpload'
import DepthZoneEditor from './DepthZoneEditor/DepthZoneEditor'
import CrystalPreview from './CrystalPreview/CrystalPreview'
import { parseDXFFromUrl } from './CrystalPreview/parseDXF.js'
import { useAuth } from './AuthContext'
import {
  Dialog,
  DialogContent,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material'

function TabPanel({ children, value, index }) {
  return (
    <Box hidden={value !== index} sx={{ height: '100%' }}>
      {value === index && children}
    </Box>
  )
}

function WorkspaceLayout({
  // State
  selectedFile,
  preview,
  results,
  loading,
  error,
  depthParameters,
  depthZones,
  setDepthZones,
  previewLoading,
  viewingPreviousFiles,
  progress,
  crystalSize,
  setCrystalSize,
  
  // Handlers
  onFileSelect,
  onProcess,
  onReprocess,
  onParametersChange,
  onDelete,
  onLoadPrevious,
  onNewUpload,
  onSavePreset,
}) {
  const [leftTab, setLeftTab] = useState(0) // 0: Upload, 1: Depth Zones, 2: Browse, 3: DXF, 4: Projects
  const [rightTab, setRightTab] = useState(0) // 0: Depth Map, 1: 3D View, 2: Crystal Preview
  const [previewProgress, setPreviewProgress] = useState(0)
  const [authDialog, setAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' or 'register'
  const [anchorEl, setAnchorEl] = useState(null)
  const [dxfPoints, setDxfPoints] = useState([])
  
  const { user, logout, login, isAuthenticated } = useAuth()
  
  const hasResults = results && (results.depth_map_url || results.dxf_url)
  
  // Parse DXF points when DXF URL changes
  useEffect(() => {
    if (results?.dxf_url) {
      parseDXFFromUrl(results.dxf_url).then(points => {
        setDxfPoints(points)
      })
    } else {
      setDxfPoints([])
    }
  }, [results?.dxf_url])
  
  const handleLogin = async (token, tokenType) => {
    const success = await login(token, tokenType)
    if (success) {
      setAuthDialog(false)
      // Switch to projects tab if authenticated
      if (isAuthenticated) {
        setLeftTab(4) // Projects is now index 4
      }
    }
  }
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleMenuClose = () => {
    setAnchorEl(null)
  }
  
  const handleLogout = () => {
    logout()
    handleMenuClose()
    setLeftTab(0) // Switch back to upload tab
  }
  
  const handleLoadProject = (project) => {
    // Load project files
    if (project.files) {
      const originalFile = project.files.find(f => f.file_type === 'original')
      const depthMapFile = project.files.find(f => f.file_type === 'depth_map')
      const dxfFile = project.files.find(f => f.file_type === 'dxf')
      
      onLoadPrevious({
        original_url: originalFile?.file_path,
        depth_map_url: depthMapFile?.file_path,
        dxf_url: dxfFile?.file_path,
        parameters: {
          blur_amount: project.blur_amount,
          contrast: project.contrast,
          brightness: project.brightness,
          edge_enhancement: project.edge_enhancement,
          invert_depth: project.invert_depth,
        }
      })
      
      // Switch to upload tab to show loaded project
      setLeftTab(0)
    }
  }
  
  return (
    <Grid container spacing={2} sx={{ height: 'calc(100vh - 200px)' }}>
      {/* Left Panel - Upload/Browse */}
      <Grid item xs={12} md={4} lg={3}>
        <Paper 
          elevation={2} 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            background: theme => theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #0d1f3c 0%, #1a2947 100%)'
              : undefined
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={leftTab} 
              onChange={(e, v) => setLeftTab(v)}
              sx={{ flexGrow: 1 }}
            >
              <Tab 
                icon={<UploadIcon />} 
                label="Upload" 
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
              <Tab 
                icon={<LayersIcon />} 
                label="Depth Zones" 
                iconPosition="start"
                sx={{ minHeight: 48 }}
                disabled={!selectedFile && !results?.original_url}
              />
              <Tab 
                icon={<HistoryIcon />} 
                label="Browse" 
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
              <Tab 
                icon={<UploadIcon />} 
                label="DXF" 
                iconPosition="start"
                sx={{ minHeight: 48, '& .MuiTab-iconWrapper': { color: '#9c27b0' } }}
              />
              {isAuthenticated && (
                <Tab 
                  icon={<FolderIcon />} 
                  label="Projects" 
                  iconPosition="start"
                  sx={{ minHeight: 48 }}
                />
              )}
            </Tabs>
            
            {/* Auth Button */}
            <Box sx={{ px: 1 }}>
              {isAuthenticated ? (
                <>
                  <IconButton onClick={handleMenuOpen} size="small">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem disabled sx={{ fontSize: '0.875rem' }}>
                      {user?.email}
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                      <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  startIcon={<PersonIcon />}
                  onClick={() => setAuthDialog(true)}
                  size="small"
                  variant="outlined"
                >
                  Sign In
                </Button>
              )}
            </Box>
          </Box>
          
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            <TabPanel value={leftTab} index={0}>
              <UploadForm
                onFileSelect={onFileSelect}
                preview={preview}
                onProcess={onProcess}
                onReset={onNewUpload}
                loading={loading}
                hasResults={hasResults}
                error={error}
                progress={progress}
                selectedFile={selectedFile}
              />
              
              {/* Show original image if viewing previous */}
              {viewingPreviousFiles && results?.original_url && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Original Image
                  </Typography>
                  <Box
                    component="img"
                    src={results.original_url}
                    alt="Original"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                </Box>
              )}
            </TabPanel>
            
            <TabPanel value={leftTab} index={1}>
              <DepthZoneEditor
                originalImage={results?.original_url || preview}
                onZonesChange={setDepthZones}
                disabled={!selectedFile && !results?.original_url}
              />
            </TabPanel>
            
            <TabPanel value={leftTab} index={2}>
              <FileBrowserNew 
                onLoadFiles={onLoadPrevious}
                compact={true}
              />
            </TabPanel>
            
            <TabPanel value={leftTab} index={3}>
              <DXFUpload 
                onDXFUploaded={(data) => {
                  // When DXF is uploaded, show it in the viewer
                  onLoadPrevious({
                    dxf_url: data.dxfUrl,
                    analysis: data.analysis
                  })
                }}
              />
            </TabPanel>
            
            {isAuthenticated && (
              <TabPanel value={leftTab} index={4}>
                <ProjectList 
                  onLoadProject={handleLoadProject}
                />
              </TabPanel>
            )}
          </Box>
          
          {/* Action Buttons */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {hasResults && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={onNewUpload}
                  size="small"
                  fullWidth
                >
                  New Upload
                </Button>
                <Tooltip title="Delete all files">
                  <IconButton 
                    onClick={onDelete}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>
      
      {/* Center Panel - Controls */}
      <Grid item xs={12} md={4} lg={3}>
        <Fade in={!!(hasResults || selectedFile)}>
          <Paper 
            elevation={2} 
            sx={{ 
              height: '100%',
              overflow: 'auto',
              opacity: hasResults || selectedFile ? 1 : 0.5,
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                mb: 3 
              }}>
                <ProcessIcon />
                Processing Controls
              </Typography>
              
              {!hasResults && selectedFile && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Upload an image to start processing with custom parameters
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={onProcess}
                    disabled={loading || !selectedFile}
                    fullWidth
                    sx={{
                      mt: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a67d8 0%, #6b46a2 100%)',
                      }
                    }}
                  >
                    Process Image
                  </Button>
                </Box>
              )}
              
              <DepthMapControls
                onParametersChange={onParametersChange}
                onApply={hasResults ? onReprocess : onProcess}
                previewLoading={previewLoading}
                disabled={!hasResults && !selectedFile}
                onProgressChange={setPreviewProgress}
                onCrystalSizeChange={setCrystalSize}
              />
              
              {/* Status Chips */}
              {hasResults && (
                <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {results.original_url && (
                    <Chip size="small" label="Original ✓" color="success" />
                  )}
                  {results.depth_map_url && (
                    <Chip size="small" label="Depth Map ✓" color="success" />
                  )}
                  {results.dxf_url && (
                    <Chip size="small" label="DXF ✓" color="success" />
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Fade>
      </Grid>
      
      {/* Right Panel - Viewers */}
      <Grid item xs={12} md={4} lg={6}>
        <Paper 
          elevation={2} 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {hasResults ? (
            <>
              <Tabs 
                value={rightTab} 
                onChange={(e, v) => setRightTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab 
                  label="Depth Map Viewer" 
                  disabled={!results.depth_map_url}
                  sx={{ minHeight: 48 }}
                />
                <Tab 
                  label="3D Point Cloud" 
                  disabled={!results.dxf_url}
                  sx={{ minHeight: 48 }}
                />
                <Tab 
                  label="Crystal Preview" 
                  disabled={!results.dxf_url}
                  sx={{ minHeight: 48 }}
                />
              </Tabs>
              
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <TabPanel value={rightTab} index={0}>
                  {results.depth_map_url && (
                    <DepthMapViewer 
                      depthMapUrl={results.depth_map_url}
                      previewData={results.depth_map_preview}
                      previewLoading={previewLoading}
                      previewProgress={previewProgress}
                    />
                  )}
                </TabPanel>
                
                <TabPanel value={rightTab} index={1}>
                  {results.dxf_url && (
                    <DXFViewer dxfUrl={results.dxf_url} />
                  )}
                </TabPanel>
                
                <TabPanel value={rightTab} index={2}>
                  {results.dxf_url && (
                    <CrystalPreview 
                      dxfPoints={dxfPoints}
                      zones={depthZones}
                      onCrystalSizeChange={(size) => {
                        console.log('Crystal size changed:', size)
                      }}
                    />
                  )}
                </TabPanel>
              </Box>
              
              {/* Download Buttons */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Grid container spacing={1}>
                  {results.depth_map_url && (
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = results.depth_map_url
                          link.download = 'depth_map.png'
                          link.click()
                        }}
                      >
                        Download Depth Map
                      </Button>
                    </Grid>
                  )}
                  {results.dxf_url && (
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = results.dxf_url
                          link.download = 'output.dxf'
                          link.click()
                        }}
                      >
                        Download DXF
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </>
          ) : (
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              p: 4,
              textAlign: 'center'
            }}>
              <Box>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Results Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload an image or browse previous files to view results
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Grid>
      
      {/* Authentication Dialog */}
      <Dialog 
        open={authDialog} 
        onClose={() => setAuthDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {authMode === 'login' ? (
            <LoginForm
              onLogin={handleLogin}
              onSwitchToRegister={() => setAuthMode('register')}
            />
          ) : (
            <RegisterForm
              onRegister={handleLogin}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          )}
        </DialogContent>
      </Dialog>
    </Grid>
  )
}

export default WorkspaceLayout