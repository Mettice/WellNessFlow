from models.database import init_db, SessionLocal, SpaService, Therapist, Client, SubscriptionPlan
from datetime import datetime

def seed_database():
    db = SessionLocal()
    try:
        # Add subscription plans
        subscription_plans = [
            SubscriptionPlan(
                name="basic",
                price_id="price_basic_monthly",  # You'll get this from Stripe
                monthly_price=49.99,
                features={
                    "chatbot": True,
                    "appointments_per_month": 100,
                    "document_uploads": 10,
                    "analytics": "basic"
                },
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            SubscriptionPlan(
                name="pro",
                price_id="price_pro_monthly",  # You'll get this from Stripe
                monthly_price=99.99,
                features={
                    "chatbot": True,
                    "appointments_per_month": "unlimited",
                    "document_uploads": 50,
                    "analytics": "advanced",
                    "custom_branding": True,
                    "priority_support": True
                },
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            SubscriptionPlan(
                name="enterprise",
                price_id="price_enterprise_monthly",  # You'll get this from Stripe
                monthly_price=199.99,
                features={
                    "chatbot": True,
                    "appointments_per_month": "unlimited",
                    "document_uploads": "unlimited",
                    "analytics": "premium",
                    "custom_branding": True,
                    "priority_support": True,
                    "api_access": True,
                    "white_label": True,
                    "dedicated_support": True
                },
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        db.add_all(subscription_plans)

        # Add default client
        default_client = Client(
            spa_id='default',
            name='Demo Spa',
            email='demo@example.com',
            phone='+1234567890',
            subscription_plan='basic',
            subscription_status='active',
            config={
                'name': 'Demo Spa',
                'business_hours': {
                    'weekday': {'open': '09:00', 'close': '20:00'},
                    'weekend': {'open': '10:00', 'close': '18:00'}
                }
            },
            api_keys={},
            calendar_type='make',
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(default_client)

        # Add essential spa services
        services = [
            SpaService(
                name="Swedish Massage",
                duration=60.0,
                price=85.0,
                description="Relaxing massage using long, flowing strokes to reduce tension and promote relaxation.",
                benefits=[
                    "Stress relief",
                    "Muscle relaxation",
                    "Improved circulation",
                    "Better sleep"
                ],
                contraindications=[
                    "Fever",
                    "Recent injuries",
                    "Skin infections",
                    "First trimester pregnancy"
                ]
            ),
            SpaService(
                name="Deep Tissue Massage",
                duration=60.0,
                price=95.0,
                description="Therapeutic massage targeting deep muscle layers to release chronic tension.",
                benefits=[
                    "Pain relief",
                    "Muscle tension release",
                    "Recovery from injuries",
                    "Improved posture"
                ],
                contraindications=[
                    "Recent surgeries",
                    "Blood clots",
                    "Osteoporosis",
                    "Bleeding disorders"
                ]
            ),
            SpaService(
                name="Classic Facial",
                duration=60.0,
                price=75.0,
                description="Deep cleansing facial with steam, exfoliation, and mask.",
                benefits=[
                    "Skin cleansing",
                    "Hydration",
                    "Improved complexion",
                    "Relaxation"
                ],
                contraindications=[
                    "Active acne",
                    "Sunburn",
                    "Skin infections",
                    "Recent facial procedures"
                ]
            ),
            SpaService(
                name="Hot Stone Massage",
                duration=90.0,
                price=110.0,
                description="Therapeutic massage using heated stones to deeply relax muscles.",
                benefits=[
                    "Deep muscle relaxation",
                    "Improved circulation",
                    "Stress relief",
                    "Pain reduction"
                ],
                contraindications=[
                    "High blood pressure",
                    "Diabetes",
                    "Heart conditions",
                    "Pregnancy"
                ]
            ),
            SpaService(
                name="Express Massage",
                duration=30.0,
                price=45.0,
                description="Quick massage focusing on back, neck, and shoulders.",
                benefits=[
                    "Quick stress relief",
                    "Tension reduction",
                    "Energy boost",
                    "Improved focus"
                ],
                contraindications=[
                    "Severe pain",
                    "Recent injuries",
                    "Skin infections"
                ]
            )
        ]
        
        # Add therapists
        therapists = [
            Therapist(
                name="Sarah Smith",
                specialties=["Deep Tissue Massage", "Sports Therapy", "Myofascial Release"],
                certifications=["LMT", "Sports Massage Certified", "Myofascial Release Specialist"],
                experience_years=8,
                bio="Sarah specializes in therapeutic massage with focus on athletic recovery and chronic pain management."
            ),
            Therapist(
                name="Michael Chen",
                specialties=["Meditation", "Mindfulness", "Stress Management"],
                certifications=["Certified Meditation Instructor", "Mindfulness-Based Stress Reduction"],
                experience_years=6,
                bio="Michael guides clients through personalized mindfulness practices for stress relief and mental wellness."
            )
        ]

        db.add_all(services)
        db.add_all(therapists)
        db.commit()
        print("Essential services added successfully!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Seeding database with essential services...")
    seed_database() 