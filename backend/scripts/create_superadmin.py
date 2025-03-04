import os
import sys
from werkzeug.security import generate_password_hash
from datetime import datetime

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal, User

def create_superadmin(email: str, password: str):
    """Create a super admin user"""
    db = SessionLocal()
    try:
        # Check if super admin already exists
        existing_user = db.query(User).filter_by(email=email).first()
        if existing_user:
            print(f"User with email {email} already exists")
            return

        # Create super admin user
        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            role='super_admin',
            is_active=True,
            last_login=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        print(f"Super admin created successfully with email: {email}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python create_superadmin.py <email> <password>")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    create_superadmin(email, password) 