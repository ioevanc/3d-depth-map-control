#!/usr/bin/env python3
"""Add background_threshold column to projects table"""

import sys
from sqlalchemy import text
from database import engine

def add_background_threshold_column():
    """Add background_threshold column to projects table if it doesn't exist"""
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'projects' 
            AND column_name = 'background_threshold'
        """))
        
        if result.scalar() == 0:
            # Add the column
            conn.execute(text("""
                ALTER TABLE projects 
                ADD COLUMN background_threshold INT DEFAULT 10
            """))
            conn.commit()
            print("Added background_threshold column to projects table")
        else:
            print("background_threshold column already exists")

if __name__ == "__main__":
    try:
        add_background_threshold_column()
        print("Migration completed successfully")
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)