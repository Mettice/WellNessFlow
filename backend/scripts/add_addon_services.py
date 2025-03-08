"""
Script to add sample add-on services to the database
"""
import sys
import os
from datetime import datetime

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal, SpaService

def add_addon_services(spa_id):
    """Add sample add-on services for a specific spa"""
    db = SessionLocal()
    
    try:
        # Define sample add-on services
        addon_services = [
            # Massage add-ons
            {
                "name": "Hot Stone Enhancement",
                "duration": 15,
                "price": 25.00,
                "description": "Add hot stones to your massage for deeper relaxation and muscle relief.",
                "service_type": "add-on",
                "parent_type": "massage",
                "benefits": ["Relieves muscle tension", "Improves circulation", "Enhances relaxation"],
                "contraindications": ["Sensitive skin", "High blood pressure", "Diabetes"]
            },
            {
                "name": "Aromatherapy",
                "duration": 0,
                "price": 15.00,
                "description": "Enhance your massage with essential oils for added therapeutic benefits.",
                "service_type": "add-on",
                "parent_type": "massage",
                "benefits": ["Stress relief", "Mood enhancement", "Respiratory support"],
                "contraindications": ["Allergies to essential oils", "Asthma", "Sensitive skin"]
            },
            {
                "name": "CBD Oil",
                "duration": 0,
                "price": 30.00,
                "description": "Add CBD oil to your massage for enhanced pain relief and relaxation.",
                "service_type": "add-on",
                "parent_type": "massage",
                "benefits": ["Pain relief", "Inflammation reduction", "Deeper relaxation"],
                "contraindications": ["Medication interactions", "Pregnancy", "Liver conditions"]
            },
            
            # Facial add-ons
            {
                "name": "Collagen Mask",
                "duration": 15,
                "price": 35.00,
                "description": "Add a collagen mask to your facial for enhanced hydration and anti-aging benefits.",
                "service_type": "add-on",
                "parent_type": "facial",
                "benefits": ["Hydration", "Reduces fine lines", "Improves skin elasticity"],
                "contraindications": ["Collagen allergies", "Active acne", "Rosacea"]
            },
            {
                "name": "LED Light Therapy",
                "duration": 20,
                "price": 45.00,
                "description": "Add LED light therapy to your facial for targeted skin concerns.",
                "service_type": "add-on",
                "parent_type": "facial",
                "benefits": ["Acne reduction", "Collagen stimulation", "Reduces inflammation"],
                "contraindications": ["Photosensitivity", "Recent Botox", "Certain medications"]
            },
            {
                "name": "Eye Treatment",
                "duration": 15,
                "price": 25.00,
                "description": "Add a specialized eye treatment to address dark circles, puffiness, and fine lines.",
                "service_type": "add-on",
                "parent_type": "facial",
                "benefits": ["Reduces dark circles", "Decreases puffiness", "Smooths fine lines"],
                "contraindications": ["Eye infections", "Recent eye surgery", "Contact lenses"]
            }
        ]
        
        # Add services to database
        for service_data in addon_services:
            # Check if service already exists
            existing_service = db.query(SpaService).filter_by(
                spa_id=spa_id,
                name=service_data["name"],
                service_type="add-on"
            ).first()
            
            if not existing_service:
                service = SpaService(
                    spa_id=spa_id,
                    name=service_data["name"],
                    duration=service_data["duration"],
                    price=service_data["price"],
                    description=service_data["description"],
                    service_type=service_data["service_type"],
                    parent_type=service_data["parent_type"],
                    benefits=service_data["benefits"],
                    contraindications=service_data["contraindications"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(service)
                print(f"Added add-on service: {service_data['name']}")
            else:
                print(f"Service already exists: {service_data['name']}")
        
        db.commit()
        print(f"Successfully added add-on services for spa_id: {spa_id}")
        
    except Exception as e:
        db.rollback()
        print(f"Error adding add-on services: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        spa_id = sys.argv[1]
        add_addon_services(spa_id)
    else:
        print("Please provide a spa_id as an argument")
        print("Usage: python add_addon_services.py <spa_id>") 