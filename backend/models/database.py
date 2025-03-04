from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, ForeignKey, Boolean, Text, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import os
from datetime import datetime

# Create the database directory if it doesn't exist
os.makedirs('instance', exist_ok=True)

# Create database engine
SQLALCHEMY_DATABASE_URL = "sqlite:///instance/spa.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for declarative models
Base = declarative_base()

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    spa_id = Column(String, ForeignKey("clients.spa_id"))
    name = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    phone = Column(String)
    email = Column(String)
    is_primary = Column(Boolean, default=False)
    business_hours = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship with Client
    spa = relationship("Client", back_populates="locations")
    appointments = relationship("Appointment", back_populates="location", cascade="all, delete-orphan")

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    spa_id = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    subscription_plan = Column(String, default='basic')  # basic, pro, enterprise
    subscription_status = Column(String, default='active')  # active, past_due, canceled
    subscription_id = Column(String, nullable=True)  # Stripe subscription ID
    trial_ends_at = Column(DateTime, nullable=True)
    config = Column(JSON, nullable=True)
    api_keys = Column(JSON, nullable=True)
    calendar_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with Location
    locations = relationship("Location", back_populates="spa", cascade="all, delete-orphan")
    
    # Add these new relationships
    profile = relationship("SpaProfile", back_populates="spa", uselist=False)
    brand_settings = relationship("BrandSettings", back_populates="spa", uselist=False)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    spa_id = Column(String, ForeignKey("clients.spa_id"), nullable=True)  # Nullable for super_admin
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)  # super_admin, spa_admin, staff, therapist
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with Client (nullable for super_admin)
    spa = relationship("Client", backref="users")

class SpaService(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    duration = Column(Float)
    price = Column(Float)
    description = Column(String)
    benefits = Column(JSON)
    contraindications = Column(JSON)
    appointments = relationship("Appointment", back_populates="service")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    spa_id = Column(String, index=True)
    name = Column(String)
    content = Column(Text)
    doc_type = Column(String)  # pdf, txt, docx, etc.
    uploaded_at = Column(DateTime)
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    doc_metadata = Column(JSON, nullable=True)  # Store document metadata
    
    # Add relationship to DocumentChunk
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class Embedding(Base):
    __tablename__ = "embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    chunk_index = Column(Integer)
    content = Column(Text)
    embedding = Column(JSON)  # Store as JSON until we set up pgvector
    created_at = Column(DateTime)
    chunk_metadata = Column(JSON, nullable=True)  # Store chunk-specific metadata

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    spa_id = Column(String, index=True)
    client_name = Column(String)
    client_email = Column(String)
    client_phone = Column(String)
    service_id = Column(Integer, ForeignKey("services.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    datetime = Column(DateTime, index=True)
    status = Column(String)  # confirmed, cancelled, completed
    reminder_sent = Column(Boolean, default=False)
    feedback_sent = Column(Boolean, default=False)
    notes = Column(String)
    
    service = relationship("SpaService", back_populates="appointments")
    location = relationship("Location", back_populates="appointments")

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)  # basic, pro, enterprise
    price_id = Column(String)  # Stripe price ID
    monthly_price = Column(Float)
    features = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

def init_db():
    """Initialize the database and create tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    chunk_index = Column(Integer)
    content = Column(Text)
    embedding = Column(JSON)
    chunk_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")

class SpaProfile(Base):
    __tablename__ = "spa_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    spa_id = Column(String, ForeignKey("clients.spa_id"), unique=True)
    business_name = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    phone = Column(String)
    email = Column(String)
    website = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    founded_year = Column(Integer, nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=0)  # 0=Not started, 1=Basic Info, 2=Services, 3=Calendar, 4=Brand
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship with Client
    spa = relationship("Client", back_populates="profile")

class BrandSettings(Base):
    __tablename__ = "brand_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    spa_id = Column(String, ForeignKey("clients.spa_id"), unique=True)
    logo_url = Column(String, nullable=True)
    primary_color = Column(String, default="#8CAC8D")
    secondary_color = Column(String, default="#A7B5A0")
    font_family = Column(String, default="Poppins")
    faqs = Column(JSON, default=list)
    services = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship with Client
    spa = relationship("Client", back_populates="brand_settings")

class PlatformSettings(Base):
    __tablename__ = "platform_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String, unique=True, index=True)
    setting_value = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PlatformMetrics(Base):
    __tablename__ = "platform_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    total_spas = Column(Integer, default=0)
    active_spas = Column(Integer, default=0)
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    metrics_date = Column(Date, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
