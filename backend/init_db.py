#!/usr/bin/env python3
"""
Initialize database tables and create admin user
"""
from database import init_db, create_admin_user, SessionLocal

def main():
    """Initialize database"""
    print("Initializing database...")
    
    # Create tables
    init_db()
    print("Database tables created successfully!")
    
    # Create admin user
    db = SessionLocal()
    try:
        create_admin_user(db)
    finally:
        db.close()
    
    print("Database initialization complete!")

if __name__ == "__main__":
    main()