from models.client import Client, SpaConfig, WellnessService, TherapistProfile

sample_spa_config = Client(
    spa_id="luxury-wellness-spa-001",
    config=SpaConfig(
        name="Serenity Wellness Spa",
        services={
            "deep-tissue-massage": WellnessService(
                name="Deep Tissue Massage",
                duration=60.0,
                price=120.0,
                description="Therapeutic massage targeting deep muscle layers to release chronic tension.",
                benefits=[
                    "Relieves chronic muscle tension",
                    "Improves blood circulation",
                    "Reduces inflammation",
                    "Helps with muscle injury recovery"
                ],
                contraindications=[
                    "Recent injuries or surgeries",
                    "Blood clots",
                    "Osteoporosis",
                    "Pregnancy (first trimester)"
                ]
            ),
            "anti-aging-facial": WellnessService(
                name="Advanced Anti-Aging Facial",
                duration=90.0,
                price=180.0,
                description="Premium facial treatment using advanced techniques and products for skin rejuvenation.",
                benefits=[
                    "Reduces fine lines and wrinkles",
                    "Improves skin elasticity",
                    "Enhances collagen production",
                    "Evens skin tone"
                ],
                contraindications=[
                    "Active skin infections",
                    "Recent facial surgery",
                    "Severe acne",
                    "Rosacea flare-ups"
                ]
            ),
            "mindfulness-meditation": WellnessService(
                name="Guided Mindfulness Session",
                duration=45.0,
                price=75.0,
                description="Personalized meditation session for stress relief and mental clarity.",
                benefits=[
                    "Reduces stress and anxiety",
                    "Improves focus and concentration",
                    "Enhances emotional well-being",
                    "Better sleep quality"
                ],
                contraindications=[
                    "None specific - suitable for most clients"
                ]
            )
        },
        therapists={
            "sarah-smith": TherapistProfile(
                name="Sarah Smith",
                specialties=["Deep Tissue Massage", "Sports Therapy", "Myofascial Release"],
                certifications=["LMT", "Sports Massage Certified", "Myofascial Release Specialist"],
                experience_years=8,
                bio="Sarah specializes in therapeutic massage with focus on athletic recovery and chronic pain management."
            ),
            "michael-chen": TherapistProfile(
                name="Michael Chen",
                specialties=["Meditation", "Mindfulness", "Stress Management"],
                certifications=["Certified Meditation Instructor", "Mindfulness-Based Stress Reduction"],
                experience_years=6,
                bio="Michael guides clients through personalized mindfulness practices for stress relief and mental wellness."
            )
        },
        business_hours={
            "monday": {"open": "09:00", "close": "20:00"},
            "tuesday": {"open": "09:00", "close": "20:00"},
            "wednesday": {"open": "09:00", "close": "20:00"},
            "thursday": {"open": "09:00", "close": "20:00"},
            "friday": {"open": "09:00", "close": "21:00"},
            "saturday": {"open": "10:00", "close": "18:00"},
            "sunday": {"open": "10:00", "close": "17:00"}
        },
        wellness_focus=[
            "stress-relief",
            "anti-aging",
            "pain-management",
            "mindfulness",
            "holistic-wellness"
        ],
        amenities=[
            "Meditation Garden",
            "Steam Room",
            "Infrared Sauna",
            "Relaxation Lounge",
            "Herbal Tea Bar"
        ],
        contact={
            "phone": "+1-555-WELLNESS",
            "email": "relax@serenityspa.com",
            "address": "123 Tranquility Lane, Wellness City, WC 12345"
        },
        branding={
            "primary_color": "#8B7355",
            "secondary_color": "#E8DFD8",
            "logo_url": "https://serenityspa.com/logo.png"
        }
    ),
    api_keys={},
    documents=[],
    embeddings_version="v1",
    wellness_protocols={
        "stress-relief": [
            "Initial consultation and stress assessment",
            "Guided meditation session",
            "Deep tissue massage",
            "Aromatherapy treatment",
            "Take-home mindfulness exercises"
        ],
        "anti-aging": [
            "Skin analysis consultation",
            "Advanced facial treatment",
            "Nutritional guidance",
            "Facial massage techniques",
            "Personalized skincare routine"
        ]
    }
) 