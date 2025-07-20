#!/usr/bin/env python3
"""Analyze DXF file format and structure"""

import sys
import ezdxf
from collections import Counter

def analyze_dxf(filepath):
    """Analyze a DXF file and print its structure"""
    try:
        doc = ezdxf.readfile(filepath)
        
        print(f"\n=== DXF File Analysis: {filepath} ===")
        print(f"DXF Version: {doc.dxfversion}")
        print(f"Created by: {doc.header.get('$ACADVER', 'Unknown')}")
        
        # Analyze header variables
        print("\n=== Important Header Variables ===")
        important_vars = ['$INSUNITS', '$MEASUREMENT', '$DIMSCALE', '$LTSCALE', 
                         '$LUNITS', '$LUPREC', '$AUNITS', '$AUPREC']
        for var in important_vars:
            if var in doc.header:
                print(f"{var}: {doc.header[var]}")
        
        # Count entities
        msp = doc.modelspace()
        entity_types = Counter()
        
        print("\n=== Entity Statistics ===")
        min_x = min_y = min_z = float('inf')
        max_x = max_y = max_z = float('-inf')
        
        for entity in msp:
            entity_types[entity.dxftype()] += 1
            
            # Get bounds for POINT entities
            if entity.dxftype() == 'POINT':
                x, y, z = entity.dxf.location
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                min_z = min(min_z, z)
                max_z = max(max_z, z)
        
        for entity_type, count in entity_types.most_common():
            print(f"{entity_type}: {count}")
        
        if entity_types.get('POINT', 0) > 0:
            print(f"\n=== Point Cloud Bounds ===")
            print(f"X: {min_x:.3f} to {max_x:.3f} (width: {max_x - min_x:.3f})")
            print(f"Y: {min_y:.3f} to {max_y:.3f} (height: {max_y - min_y:.3f})")
            print(f"Z: {min_z:.3f} to {max_z:.3f} (depth: {max_z - min_z:.3f})")
        
        # Sample first few entities
        print("\n=== First 5 Entities ===")
        for i, entity in enumerate(msp):
            if i >= 5:
                break
            print(f"{i+1}. {entity.dxftype()}: {entity.dxfattribs()}")
        
        # Check for layers
        print(f"\n=== Layers ===")
        layers = doc.layers
        for layer in layers:
            print(f"Layer: {layer.dxf.name}, Color: {layer.dxf.color}")
            
    except Exception as e:
        print(f"Error analyzing DXF: {e}")
        return False
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_dxf.py <dxf_file>")
        sys.exit(1)
    
    analyze_dxf(sys.argv[1])