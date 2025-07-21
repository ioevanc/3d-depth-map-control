// Parse DXF file and extract points
export async function parseDXFFromUrl(dxfUrl) {
  try {
    console.log('Fetching DXF from:', dxfUrl)
    const response = await fetch(dxfUrl)
    const text = await response.text()
    console.log('DXF text length:', text.length)
    const points = parseDXFText(text)
    console.log('Parsed points:', points.length)
    return points
  } catch (error) {
    console.error('Error parsing DXF:', error)
    return []
  }
}

export function parseDXFText(dxfText) {
  const points = []
  const lines = dxfText.split('\n')
  
  let inEntitiesSection = false
  let inPoint = false
  let currentPoint = {}
  let nextIsValue = null
  let pointCount = 0
  
  console.log('Starting DXF parse, lines:', lines.length)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check for ENTITIES section
    if (line === 'ENTITIES') {
      inEntitiesSection = true
      console.log('Found ENTITIES section')
      continue
    }
    
    if (line === 'ENDSEC') {
      inEntitiesSection = false
      continue
    }
    
    if (!inEntitiesSection) continue
    
    // Look for POINT entities
    if (line === 'POINT') {
      inPoint = true
      currentPoint = { x: 0, y: 0, z: 0 }
      pointCount++
      if (pointCount <= 5) {
        console.log(`Found POINT #${pointCount}`)
      }
      continue
    }
    
    if (inPoint) {
      // End of point entity
      if (line === '0' && i > 0) {
        if (currentPoint.x !== undefined && currentPoint.y !== undefined && currentPoint.z !== undefined) {
          points.push({ ...currentPoint })
        }
        inPoint = false
        currentPoint = {}
        continue
      }
      
      // Group codes
      if (line === '10') {
        nextIsValue = 'x'
      } else if (line === '20') {
        nextIsValue = 'y'
      } else if (line === '30') {
        nextIsValue = 'z'
      } else if (nextIsValue && !isNaN(parseFloat(line))) {
        currentPoint[nextIsValue] = parseFloat(line)
        nextIsValue = null
      }
    }
  }
  
  // Add last point if exists
  if (inPoint && currentPoint.x !== undefined) {
    points.push(currentPoint)
  }
  
  // Sample points if there are too many (for performance)
  const MAX_POINTS = 50000
  if (points.length > MAX_POINTS) {
    const samplingRate = Math.ceil(points.length / MAX_POINTS)
    return points.filter((_, index) => index % samplingRate === 0)
  }
  
  return points
}