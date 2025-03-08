import os
import sys
from datetime import datetime

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal, User

def update_user_role(email: str, new_role: str):
    """Update a user's role"""
    db = SessionLocal()
    try:
        # Find user by email
        user = db.query(User).filter_by(email=email).first()
        if not user:
            print(f"User with email {email} not found")
            return

        # Update role
        old_role = user.role
        user.role = new_role
        db.commit()
        print(f"User role updated successfully: {email} ({old_role} -> {new_role})")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python update_user_role.py <email> <new_role>")
        sys.exit(1)
    
    email = sys.argv[1]
    new_role = sys.argv[2]
    update_user_role(email, new_role) 