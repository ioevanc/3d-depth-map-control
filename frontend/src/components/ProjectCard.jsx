import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(42, 42, 47, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 32px rgba(233, 30, 99, 0.15)',
    borderColor: 'rgba(233, 30, 99, 0.3)',
  },
}));

const ParameterChip = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.75rem',
  height: 24,
  '& .MuiChip-label': {
    padding: '0 8px',
  },
}));

function ProjectCard({ project, onLoad, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description || '',
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleEdit = () => {
    setEditData({
      name: project.name,
      description: project.description || '',
    });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    onUpdate(editData);
    setEditDialog(false);
  };

  const handleDelete = () => {
    onDelete();
    setDeleteDialog(false);
  };

  const downloadFile = (fileUrl, filename) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileInfo = (fileType) => {
    return project.files?.find(f => f.file_type === fileType);
  };

  const originalFile = getFileInfo('original');
  const depthMapFile = getFileInfo('depth_map');
  const dxfFile = getFileInfo('dxf');

  return (
    <>
      <StyledCard>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                {project.name}
              </Typography>
              {project.description && (
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                  {project.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TimeIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Created: {formatDate(project.created_at)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {project.blur_amount > 0 && (
                  <ParameterChip label={`Blur: ${project.blur_amount}`} size="small" />
                )}
                {project.contrast !== 1 && (
                  <ParameterChip label={`Contrast: ${project.contrast}`} size="small" />
                )}
                {project.brightness !== 0 && (
                  <ParameterChip label={`Brightness: ${project.brightness}`} size="small" />
                )}
                {project.edge_enhancement > 0 && (
                  <ParameterChip label={`Edge: ${project.edge_enhancement}`} size="small" />
                )}
                {project.invert_depth && (
                  <ParameterChip label="Inverted" size="small" />
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Edit project">
                <IconButton onClick={handleEdit} size="small">
                  <EditIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete project">
                <IconButton onClick={() => setDeleteDialog(true)} size="small">
                  <DeleteIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>

        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            onClick={onLoad}
            startIcon={<ViewIcon />}
            sx={{
              background: 'linear-gradient(45deg, #E91E63 30%, #9C27B0 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #D81B60 30%, #8E24AA 90%)',
              },
            }}
          >
            Load Project
          </Button>
          <Button
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ ml: 'auto' }}
          >
            Files
          </Button>
        </CardActions>

        <Collapse in={expanded}>
          <Box sx={{ px: 2, pb: 2 }}>
            <Grid container spacing={1}>
              {originalFile && (
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 1, 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Original Image
                      </Typography>
                      <Typography variant="body2">
                        {(originalFile.file_size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => downloadFile(originalFile.file_path, originalFile.filename)}
                    >
                      <DownloadIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Grid>
              )}
              {depthMapFile && (
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 1, 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Depth Map
                      </Typography>
                      <Typography variant="body2">
                        {(depthMapFile.file_size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => downloadFile(depthMapFile.file_path, depthMapFile.filename)}
                    >
                      <DownloadIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Grid>
              )}
              {dxfFile && (
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 1, 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        DXF File
                      </Typography>
                      <Typography variant="body2">
                        {(dxfFile.file_size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => downloadFile(dxfFile.file_path, dxfFile.filename)}
                    >
                      <DownloadIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Collapse>
      </StyledCard>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Project Name"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={!editData.name.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{project.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ProjectCard;