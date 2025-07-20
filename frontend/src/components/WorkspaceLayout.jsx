import { useState } from 'react'
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
} from '@mui/icons-material'
import UploadForm from './UploadForm'
import DepthMapControls from './DepthMapControls'
import DepthMapViewer from './DepthMapViewer'
import DXFViewer from './DXFViewer'
import FileBrowserNew from './FileBrowserNew'

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
  previewLoading,
  viewingPreviousFiles,
  progress,
  
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
  const [leftTab, setLeftTab] = useState(0) // 0: Upload, 1: Browse
  const [rightTab, setRightTab] = useState(0) // 0: Depth Map, 1: 3D View
  const [previewProgress, setPreviewProgress] = useState(0)
  
  const hasResults = results && (results.depth_map_url || results.dxf_url)
  
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
          <Tabs 
            value={leftTab} 
            onChange={(e, v) => setLeftTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<UploadIcon />} 
              label="Upload" 
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab 
              icon={<HistoryIcon />} 
              label="Browse Files" 
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
          </Tabs>
          
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            <TabPanel value={leftTab} index={0}>
              <UploadForm
                onFileSelect={onFileSelect}
                preview={preview}
                onProcess={onProcess}
                loading={loading}
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
              <FileBrowserNew 
                onLoadFiles={onLoadPrevious}
                compact={true}
              />
            </TabPanel>
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
    </Grid>
  )
}

export default WorkspaceLayout