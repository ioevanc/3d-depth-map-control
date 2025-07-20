#!/usr/bin/env python3
"""Check projects in database"""
from database import SessionLocal, Project, User
from sqlalchemy import desc

def check_projects():
    db = SessionLocal()
    try:
        # Get all projects
        projects = db.query(Project).order_by(desc(Project.created_at)).all()
        print(f"\nTotal projects: {len(projects)}")
        
        for project in projects:
            user = db.query(User).filter(User.id == project.user_id).first()
            print(f"\nProject ID: {project.id}")
            print(f"  Name: {project.name}")
            print(f"  Description: {project.description}")
            print(f"  UUID: {project.uuid}")
            print(f"  User: {user.email if user else 'Unknown'}")
            print(f"  Created: {project.created_at}")
            print(f"  Parameters: blur={project.blur_amount}, contrast={project.contrast}, brightness={project.brightness}")
            print(f"  Files: {len(project.files)}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_projects()