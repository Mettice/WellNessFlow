from pydantic import BaseModel
from typing import Dict, List, Optional

class WellnessService(BaseModel):
    name: str
    duration: float
    price: float
    description: str
    benefits: List[str]
    contraindications: List[str]

class TherapistProfile(BaseModel):
    name: str
    specialties: List[str]
    certifications: List[str]
    experience_years: int
    bio: str

class SpaConfig(BaseModel):
    name: str
    services: Dict[str, WellnessService]
    therapists: Dict[str, TherapistProfile]
    business_hours: Dict[str, Dict[str, str]]
    wellness_focus: List[str]  # e.g., ["stress-relief", "anti-aging", "weight-management"]
    amenities: List[str]
    contact: Dict[str, str]
    branding: Dict[str, str]

class Client(BaseModel):
    spa_id: str
    config: SpaConfig
    api_keys: Dict[str, str]
    documents: List[str]  # List of document IDs
    embeddings_version: Optional[str]
    wellness_protocols: Dict[str, List[str]]  # Specific wellness programs and their steps

    class Config:
        from_attributes = True 