import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the Python path BEFORE imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import Base, Client, User, SpaProfile, BrandSettings, Location, SpaService
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

def setup_database():
    """Create all database tables"""
    database_url = os.getenv('DATABASE_URL', 'sqlite:///instance/spa.db')
    engine = create_engine(database_url)
    Base.metadata.create_all(bind=engine)
    return engine

def create_test_data(engine):
    """Create test data for development"""
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Create a test spa client
        test_spa = Client(
            spa_id="test_spa_1",
            name="Serenity Wellness Spa",
            email="admin@serenityspa.com",
            phone="555-0123",
            subscription_plan="basic",
            subscription_status="active",
            calendar_type="none",
            config={
                "business_hours": {
                    "weekday": {"open": "09:00", "close": "18:00"},
                    "weekend": {"open": "10:00", "close": "16:00"}
                }
            }
        )
        db.add(test_spa)
        db.flush()  # Flush to get the spa_id
        
        # Create spa profile
        profile = SpaProfile(
            spa_id=test_spa.spa_id,
            business_name="Serenity Wellness Spa",
            address="123 Wellness Street",
            city="Serenity City",
            state="CA",
            zip_code="90210",
            phone="555-0123",
            email="admin@serenityspa.com",
            website="www.serenityspa.com",
            description="A peaceful sanctuary for relaxation and rejuvenation",
            founded_year=2024,
            onboarding_completed=True,
            onboarding_step=4
        )
        db.add(profile)
        
        # Create brand settings
        brand_settings = BrandSettings(
            spa_id=test_spa.spa_id,
            logo_url=None,
            primary_color="#8CAC8D",  # Sage Green
            secondary_color="#A7B5A0",  # Moss
            font_family="Poppins",
            faqs=[
                {
                    "question": "What should I expect during my first visit?",
                    "answer": "During your first visit, you'll complete a brief health questionnaire and discuss your wellness goals with our staff. We'll then customize your treatment plan accordingly."
                },
                {
                    "question": "How early should I arrive for my appointment?",
                    "answer": "We recommend arriving 15 minutes before your scheduled appointment to complete any necessary paperwork and begin your relaxation journey."
                }
            ],
            services=[
                {
                    "name": "Swedish Massage",
                    "description": "A gentle, relaxing massage that promotes circulation and reduces stress",
                    "duration": 60,
                    "price": 95
                },
                {
                    "name": "Deep Tissue Massage",
                    "description": "Targets deep muscle layers to release chronic tension",
                    "duration": 90,
                    "price": 125
                }
            ]
        )
        db.add(brand_settings)
        
        # Create admin user
        admin_user = User(
            spa_id=test_spa.spa_id,
            email="admin@serenityspa.com",
            password_hash=generate_password_hash("admin123"),
            role="spa_admin",
            is_active=True,
            last_login=datetime.utcnow()
        )
        db.add(admin_user)
        
        # Create test location
        location = Location(
            spa_id=test_spa.spa_id,
            name="Main Location",
            address="123 Wellness Street",
            city="Serenity City",
            state="CA",
            zip_code="90210",
            phone="555-0123",
            email="info@serenityspa.com",
            is_primary=True,
            business_hours={
                "weekday": {"open": "09:00", "close": "18:00"},
                "weekend": {"open": "10:00", "close": "16:00"}
            }
        )
        db.add(location)
        
        # Create test services
        services = [
            SpaService(
                name="Swedish Massage",
                duration=60,
                price=95.00,
                description="A gentle, relaxing massage that promotes circulation and reduces stress",
                benefits=["Stress relief", "Improved circulation", "Muscle relaxation"],
                contraindications=["Recent injuries", "Fever", "Blood clots"]
            ),
            SpaService(
                name="Deep Tissue Massage",
                duration=90,
                price=125.00,
                description="Targets deep muscle layers to release chronic tension",
                benefits=["Pain relief", "Muscle recovery", "Improved mobility"],
                contraindications=["Osteoporosis", "Recent surgery", "Bleeding disorders"]
            )
        ]
        for service in services:
            db.add(service)
        
        db.commit()
        print("Test data created successfully!")
        
    except Exception as e:
        print(f"Error creating test data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    engine = setup_database()
    create_test_data(engine)
    print("Database initialization complete") 