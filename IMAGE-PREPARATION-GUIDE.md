# Image Preparation Guide for Crystal Etching

## Understanding Crystal Etching Images

In crystal etching:
- **White/Light areas** = Areas that WILL be etched (the design)
- **Black/Dark areas** = Background that will NOT be etched

This matches standard laser engraving practices and allows for proper visualization when overlaying on crystal mockups using screen blend modes.

## Optimal File Format

### 1. **File Format**
- **Recommended**: PNG format (supports transparency)
- **Also supported**: JPG/JPEG
- **Resolution**: 300-600 DPI for detailed etching
- **Color mode**: Grayscale (8-bit)

### 2. **Image Preparation for Best Results**

#### For Logo/Text Etching:
- **Engravable area**: White or light gray
- **Background**: Pure black (#000000)
- **Contrast**: High contrast between design and background
- **Background Threshold**: Set to 10-50 to exclude black areas

#### For Photo/Portrait Etching:
- **Subject**: Light tones (will be etched)
- **Background**: Dark to black (won't be etched)
- **Preparation**: May need to invert typical photos
- **Background Threshold**: Set to 20-80

#### For Paw Prints/Stamps:
- **Paw print**: White or light gray (the actual print)
- **Background**: Black
- **Preparation**: Invert if you have dark print on white
- **Background Threshold**: Set to 10-30

### 3. **Pre-Processing Tips**

1. **Set Background to Black**:
   - Use photo editing software to make background pure black
   - This ensures it won't be included in the etching

2. **Make Design White/Light**:
   - Convert your design to white or light gray
   - Lighter values = deeper etching

3. **Increase Contrast**:
   - Ensure clear distinction between design and background
   - Use Levels or Curves adjustment

4. **Clean Up**:
   - Remove any gray areas that shouldn't be etched
   - Ensure background is consistently black

5. **Size Appropriately**:
   - Keep file size under 10MB
   - Typical good size: 2000x2000 pixels

### 4. **Background Threshold Settings**

The background threshold determines which pixels are excluded from the 3D model:

- **0**: No exclusion (all pixels included)
- **10-30**: Excludes pure black areas (recommended for most uses)
- **50-100**: Excludes black to dark gray
- **100-150**: Excludes up to medium gray
- **150-200**: Excludes everything darker than light gray
- **200-240**: Only includes near-white and white
- **255**: Excludes everything (no output)

### 5. **Testing Your Settings**

1. Start with default threshold (10)
2. Look at the preview - areas that will be excluded show a pattern
3. Adjust threshold until only desired areas are included
4. Use "Apply Parameters" to test before final processing

### 6. **Common Issues and Solutions**

**Problem**: Everything is excluded (0 points in DXF)
- **Solution**: Lower the background threshold (try 10-20)
- **Check**: Make sure your design is white/light, not black

**Problem**: Background is included in 3D model
- **Solution**: Make sure background is pure black (#000000)
- **Alternative**: Increase threshold slightly (but not too much)

**Problem**: Parts of design are excluded
- **Solution**: Make those parts lighter in the original image
- **Check**: Ensure no dark gray areas in your design

**Problem**: Depth map looks inverted
- **Solution**: Use "Invert Depth" option

### 7. **Example Workflows**

#### Paw Print for Crystal:
1. Scan paw print at 300+ DPI
2. In Photoshop: Invert colors (Ctrl/Cmd + I)
3. Adjust levels: make background pure black, paw print white
4. Set background threshold to 10-30
5. Process image

#### Company Logo:
1. Create logo with white/light design on black background
2. Save as PNG
3. Set background threshold to 10-30
4. Adjust contrast parameter to 1.5 if needed
5. Process image

#### Portrait Photo:
1. Convert photo to grayscale
2. Adjust levels: make subject lighter, background darker
3. Paint background pure black
4. May need to use "Invert Depth" option
5. Set background threshold to 20-50
6. Use blur parameter 1-2 for smoother result

#### Photoshop Mockup Workflow:
1. Create your design (white on black)
2. Process through the converter
3. In Photoshop, place the depth map over crystal image
4. Set blend mode to "Screen" or "Linear Dodge"
5. Adjust opacity for realistic effect