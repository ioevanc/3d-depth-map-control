import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Stack,
  Chip,
  Collapse,
  Paper
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

// Predefined crystal sizes (width x height x depth in mm)
const PREDEFINED_SIZES = [
  { label: '60×60×60mm', value: [60, 60, 60] },
  { label: '80×80×80mm', value: [80, 80, 80] },
  { label: '100×100×100mm', value: [100, 100, 100] },
  { label: '50×50×80mm', value: [50, 50, 80] },
  { label: '60×60×90mm', value: [60, 60, 90] },
  { label: '120×80×60mm', value: [120, 80, 60] },
  { label: '80×50×50mm', value: [80, 50, 50] },
  { label: '200×115×50mm', value: [200, 115, 50] },
  { label: 'Custom', value: 'custom' }
];

const CrystalSizeSelector = ({ onSizeChange, disabled = false }) => {
  const [selectedSize, setSelectedSize] = useState('');
  const [customSize, setCustomSize] = useState({ width: 80, height: 80, depth: 80 });
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    // Set default size
    const defaultSize = PREDEFINED_SIZES[1]; // 80×80×80mm
    setSelectedSize(defaultSize.label);
    if (onSizeChange) {
      onSizeChange(defaultSize.value);
    }
  }, []);

  const handleSizeChange = (event) => {
    const value = event.target.value;
    setSelectedSize(value);
    
    const selected = PREDEFINED_SIZES.find(size => size.label === value);
    if (selected && selected.value !== 'custom') {
      if (onSizeChange) {
        onSizeChange(selected.value);
      }
    }
  };

  const handleCustomSizeChange = (dimension, value) => {
    const numValue = parseFloat(value) || 0;
    const newSize = { ...customSize, [dimension]: numValue };
    setCustomSize(newSize);
    
    if (selectedSize === 'Custom' && onSizeChange) {
      onSizeChange([newSize.width, newSize.height, newSize.depth]);
    }
  };

  const getCurrentSize = () => {
    if (selectedSize === 'Custom') {
      return [customSize.width, customSize.height, customSize.depth];
    }
    const selected = PREDEFINED_SIZES.find(size => size.label === selectedSize);
    return selected ? selected.value : [80, 80, 80];
  };

  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Crystal Size
          </Typography>
          <InfoIcon 
            sx={{ 
              fontSize: 18, 
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' }
            }}
            onClick={() => setShowInfo(!showInfo)}
          />
        </Box>

        <Collapse in={showInfo}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Select the target crystal size for DXF generation. The image will be scaled to fit 
            within the crystal dimensions while maintaining aspect ratio.
          </Typography>
        </Collapse>

        <FormControl fullWidth size="small" disabled={disabled}>
          <InputLabel>Crystal Size</InputLabel>
          <Select
            value={selectedSize}
            onChange={handleSizeChange}
            label="Crystal Size"
          >
            {PREDEFINED_SIZES.map((size) => (
              <MenuItem key={size.label} value={size.label}>
                {size.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedSize === 'Custom' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Enter custom dimensions in millimeters:
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Width"
                type="number"
                size="small"
                value={customSize.width}
                onChange={(e) => handleCustomSizeChange('width', e.target.value)}
                InputProps={{ inputProps: { min: 10, max: 300 } }}
                disabled={disabled}
              />
              <TextField
                label="Height"
                type="number"
                size="small"
                value={customSize.height}
                onChange={(e) => handleCustomSizeChange('height', e.target.value)}
                InputProps={{ inputProps: { min: 10, max: 300 } }}
                disabled={disabled}
              />
              <TextField
                label="Depth"
                type="number"
                size="small"
                value={customSize.depth}
                onChange={(e) => handleCustomSizeChange('depth', e.target.value)}
                InputProps={{ inputProps: { min: 10, max: 300 } }}
                disabled={disabled}
              />
            </Stack>
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`Volume: ${(getCurrentSize()[0] * getCurrentSize()[1] * getCurrentSize()[2] / 1000).toFixed(1)} cm³`}
            size="small"
            variant="outlined"
          />
          <Chip 
            label={`${getCurrentSize()[0]}×${getCurrentSize()[1]}×${getCurrentSize()[2]}mm`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* 600 DPI indicator for company standard */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          💡 For best results, prepare images at 600 DPI (16.66 px/mm)
        </Typography>
      </Stack>
    </Paper>
  );
};

export default CrystalSizeSelector;