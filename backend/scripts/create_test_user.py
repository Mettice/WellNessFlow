import os
import sys

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal, User, Client
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

def create_test_spa():
    db = SessionLocal()
    try:
        # Check if test spa already exists
        existing_spa = db.query(Client).filter_by(spa_id='default').first()
        if existing_spa:
            print("Test spa already exists")
            return existing_spa

        # Create test spa
        test_spa = Client(
            spa_id='default',
            name='Test Spa',
            email='admin@example.com',
            phone='+1234567890',
            subscription_plan='basic',
            subscription_status='active',
            trial_ends_at=datetime.utcnow() + timedelta(days=14),
            config={
                'name': 'Test Spa',
                'business_hours': {
                    'monday': {'open': '09:00', 'close': '17:00'},
                    'tuesday': {'open': '09:00', 'close': '17:00'},
                    'wednesday': {'open': '09:00', 'close': '17:00'},
                    'thursday': {'open': '09:00', 'close': '17:00'},
                    'friday': {'open': '09:00', 'close': '17:00'},
                    'saturday': {'open': '10:00', 'close': '15:00'},
                    'sunday': {'open': '10:00', 'close': '15:00'}
                }
            },
            api_keys={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(test_spa)
        db.commit()
        print("Test spa created successfully")
        return test_spa
        
    except Exception as e:
        print(f"Error creating test spa: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def create_test_admin():
    # First create the spa
    test_spa = create_test_spa()
    if not test_spa:
        print("Failed to create test spa")
        return

    db = SessionLocal()
    try:
        # Check if test user already exists
        existing_user = db.query(User).filter_by(email='admin@example.com').first()
        if existing_user:
            print("Test admin user already exists")
            return

        # Create test admin user
        test_user = User(
            spa_id='default',
            email='admin@example.com',
            password_hash=generate_password_hash('admin123'),
            role='spa_admin',
            is_active=True,
            last_login=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(test_user)
        db.commit()
        print("Test admin user created successfully")
        
    except Exception as e:
        print(f"Error creating test user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    create_test_admin() 