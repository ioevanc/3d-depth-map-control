# Next Session Prompt - Crystal Rendering Enhancement

## Context
You are continuing development of the Crystal Etching Converter application. The depth zone editor feature has been implemented on the `feature/depth-zone-editor` branch. All components are functional but the crystal rendering needs improvement.

## Current Issue (as of July 21, 2025, 8:30 PM UTC)

The user has provided feedback with screenshots:
- Current crystal looks like a "blunt box" rather than glass (see @dev_files/screenbox.png)
- Should look like reference images: @dev_files/crystal1.png and @dev_files/crystal2.png
- Background needs to be more interesting with dark gradient

### What's Working:
- Depth zone editor with drawing tools
- Zone processing backend endpoints
- DXF parsing and point cloud display
- Points are visible inside crystal (cyan color)
- Crystal size adjustment
- All components integrated

### The Problem:
The crystal doesn't look realistic:
1. Lacks proper glass appearance with refraction
2. No caustics or light dispersion
3. Background is too plain
4. Material looks flat rather than crystalline

## Technical Details

### Current Crystal Material (CrystalPreview.jsx):
```javascript
<meshPhysicalMaterial
  color="#f0f0ff"
  transmission={1}
  opacity={opacity * 0.4}
  transparent={true}
  roughness={0}
  metalness={0.1}
  clearcoat={1}
  clearcoatRoughness={0}
  ior={2.4}
  reflectivity={1}
  thickness={1}
  envMapIntensity={3}
  side={THREE.DoubleSide}
  depthWrite={false}
  sheen={0.5}
  sheenColor="#88ccff"
  specularIntensity={1}
  specularColor="#ffffff"
/>
```

### Reference Images Show:
- crystal1.png: Clear glass cube with stars/galaxy inside, sitting on surface
- crystal2.png: Crystal clear cube with globe etching, perfect transparency

## Immediate Tasks:

1. **Improve Crystal Material**:
   - Research glass/crystal shaders in Three.js
   - Consider using custom shaders for caustics
   - Add proper refraction and light dispersion
   - Make edges more visible while keeping transparency

2. **Enhance Background**:
   - Create dramatic dark gradient (like product photography)
   - Consider adding subtle animation or particles
   - Add reflection plane under crystal

3. **Lighting Adjustments**:
   - Add rim lighting for edge definition
   - Consider HDRI environment for realistic reflections
   - Add caustic light patterns

4. **Post-processing**:
   - Consider adding bloom for sparkle
   - Depth of field for professional look

## Start by:
1. Examining the reference images
2. Researching Three.js glass rendering techniques
3. Implementing improved crystal material
4. Testing with actual DXF data

The goal is to make the crystal look photorealistic like the reference images, not like a simple transparent box.