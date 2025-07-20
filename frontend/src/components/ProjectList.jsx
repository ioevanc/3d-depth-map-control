import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import ProjectCard from './ProjectCard';
import axios from 'axios';
import { useAuth } from './AuthContext';

function ProjectList({ onLoadProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data.projects || []);
    } catch (err) {
      setError('Failed to load projects. Please try again.');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const handleDelete = async (projectId) => {
    try {
      await axios.delete(`/api/projects/${projectId}`);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  const handleUpdate = async (projectId, updatedData) => {
    try {
      const response = await axios.put(
        `/api/projects/${projectId}`,
        updatedData
      );
      setProjects(projects.map(p => p.id === projectId ? response.data : p));
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please sign in to view your projects
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="Refresh projects">
          <span>
            <IconButton onClick={fetchProjects} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : filteredProjects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'No projects match your search' : 'No projects yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {!searchTerm && 'Upload and process an image to create your first project'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredProjects.map((project) => (
            <Fade in key={project.id}>
              <Grid item xs={12}>
                <ProjectCard
                  project={project}
                  onLoad={() => onLoadProject(project)}
                  onDelete={() => handleDelete(project.id)}
                  onUpdate={(data) => handleUpdate(project.id, data)}
                />
              </Grid>
            </Fade>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default ProjectList;