import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Stack,
  Divider,
  Tooltip,
  Chip,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Download as DownloadIcon,
  Info as InfoIcon,
  ThreeDRotation as ThreeDIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import DepthMapViewer from './DepthMapViewer'
import DXFViewer from './DXFViewer'

function TabPanel({ children, value, index }) {
  return (
    <Box hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  )
}

function ResultsSection({ originalUrl, depthMapUrl, dxfUrl, onDelete, depthMapPreview }) {
  const [tabValue, setTabValue] = useState(0)
  
  const handleDownload = (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Divider sx={{ mb: 3 }}>
        <Chip label="Results" icon={<ThreeDIcon />} color="primary" />
      </Divider>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="results tabs">
          <Tab label="Downloads" icon={<GetAppIcon />} iconPosition="start" />
          <Tab label="Depth Map Viewer" icon={<VisibilityIcon />} iconPosition="start" />
          <Tab label="3D Point Cloud" icon={<ThreeDIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Depth Map
                    <Tooltip title="A grayscale image where brightness represents estimated depth - brighter areas are closer to the viewer">
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Typography>
                  
                  <Box
                    sx={{
                      backgroundColor: 'background.default',
                      p: 2,
                      borderRadius: 1,
                      textAlign: 'center',
                      mb: 2,
                    }}
                  >
                    <img
                      src={depthMapUrl}
                      alt="Depth Map"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        display: 'block',
                        margin: '0 auto',
                      }}
                    />
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(depthMapUrl, 'depth_map.png')}
                  >
                    Download Depth Map (PNG)
                  </Button>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Grayscale image for preview purposes
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    DXF File
                    <Tooltip title="3D point cloud file ready for your laser etching machine - contains X,Y,Z coordinates for subsurface etching">
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Typography>

                  <Box
                    sx={{
                      backgroundColor: 'background.default',
                      p: 4,
                      borderRadius: 1,
                      textAlign: 'center',
                      mb: 2,
                      minHeight: '300px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ThreeDIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      3D Point Cloud Generated
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Ready for laser etching
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    color="secondary"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(dxfUrl, 'output.dxf')}
                  >
                    Download DXF File
                  </Button>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Compatible with SSLE laser machines
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Paper elevation={1} sx={{ p: 3, mt: 3, backgroundColor: 'info.lighter' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Next Steps:
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  1. Download the DXF file and transfer it to your laser etching machine
                </Typography>
                <Typography variant="body2">
                  2. Load the file into your laser control software
                </Typography>
                <Typography variant="body2">
                  3. Position your crystal block and begin the subsurface etching process
                </Typography>
                <Typography variant="body2">
                  4. The laser will etch points layer by layer to create the 3D effect inside the crystal
                </Typography>
              </Stack>
            </Paper>
            
            {onDelete && (
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Divider sx={{ mb: 2 }} />
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={onDelete}
                  sx={{ minWidth: 200 }}
                >
                  Delete All Files
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  This will delete the depth map, DXF file, and original image
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <DepthMapViewer depthMapUrl={depthMapUrl} previewData={depthMapPreview} />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3 }}>
            <DXFViewer dxfUrl={dxfUrl} />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  )
}

export default ResultsSection