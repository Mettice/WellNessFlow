from openai import OpenAI
from typing import Optional, List, Dict
from datetime import datetime
import os
from models.database import SessionLocal, SpaService, Embedding, Document, DocumentChunk, SpaProfile, BrandSettings
from sqlalchemy import func
import numpy as np
from ..rag.embeddings import generate_embeddings
import traceback
from ..services.upsell_service import UpsellService
import openai
from flask import current_app

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def get_relevant_context(query: str, spa_id: str, top_k: int = 3) -> Dict[str, List[str]]:
    """Get relevant context from the document embeddings, organized by type."""
    print("\n=== Getting Relevant Context ===")
    print(f"Query: {query}")
    print(f"Spa ID: {spa_id}")
    
    db = SessionLocal()
    try:
        # Get query embedding
        query_embedding = generate_embeddings(query)
        
        # Get all chunks for this spa
        chunks = (
            db.query(DocumentChunk)
            .join(Document)
            .filter(Document.spa_id == spa_id)
            .filter(Document.processed == True)
            .all()
        )
        
        print(f"Found {len(chunks)} document chunks")
        
        if not chunks:
            print("No processed documents found")
            return {
                'pricing': [],
                'booking': [],
                'service': [],
                'staff': [],
                'general': []
            }
        
        # Calculate similarities
        similarities = []
        for chunk in chunks:
            if chunk.embedding:  # Ensure chunk has embeddings
                similarity = cosine_similarity(query_embedding, chunk.embedding)
                similarities.append((chunk, similarity))
        
        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Organize by type (for now, all chunks are considered 'general')
        context_by_type = {
            'pricing': [],
            'booking': [],
            'service': [],
            'staff': [],
            'general': []
        }
        
        # Take top k most relevant chunks
        top_chunks = similarities[:top_k]
        print(f"Selected {len(top_chunks)} most relevant chunks")
        
        for chunk, score in top_chunks:
            # For now, add all chunks to general category
            # TODO: Implement chunk type classification
            context_by_type['general'].append({
                'content': chunk.content,
                'score': float(score),
                'source': chunk.document.name if chunk.document else 'Unknown'
            })
        
        return context_by_type
        
    except Exception as e:
        print(f"Error getting relevant context: {str(e)}")
        print(f"Stack trace: {traceback.format_exc()}")
        return {
            'pricing': [],
            'booking': [],
            'service': [],
            'staff': [],
            'general': []
        }
    finally:
        db.close()

def get_spa_context(spa_id: str = None) -> str:
    """Get spa-specific context from the database."""
    db = SessionLocal()
    try:
        # Get spa profile
        profile = db.query(SpaProfile).filter_by(spa_id=spa_id).first()
        if not profile:
            return "No spa information available."
            
        # Get brand settings
        brand_settings = db.query(BrandSettings).filter_by(spa_id=spa_id).first()
        
        # Get services
        services = db.query(SpaService).filter_by(spa_id=spa_id).all()
        services_info = "\n".join([
            f"- {service.name}: {service.duration}min, ${service.price}\n  Description: {service.description}\n  Benefits: {', '.join(service.benefits)}"
            for service in services
        ])
        
        return f"""
        Spa Name: {profile.business_name}
        
        About Us:
        {profile.description or 'Welcome to our spa!'}
        Founded: {profile.founded_year or 'N/A'}
        
        Contact Information:
        Address: {profile.address}, {profile.city}, {profile.state} {profile.zip_code}
        Phone: {profile.phone}
        Email: {profile.email}
        Website: {profile.website or 'N/A'}
        
        Available Services:
        {services_info}
        
        Hours: 
        Weekdays: 09:00 - 20:00
        Weekends: 10:00 - 18:00
        
        Amenities: 
        - Meditation Garden
        - Steam Room
        - Infrared Sauna
        - Relaxation Lounge
        - Herbal Tea Bar
        
        Branding:
        Primary Color: {brand_settings.primary_color if brand_settings else '#8CAC8D'}
        Secondary Color: {brand_settings.secondary_color if brand_settings else '#A7B5A0'}
        """
    finally:
        db.close()

def detect_intent(message: str) -> str:
    """Detect user intent from message."""
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{
            "role": "system",
            "content": "Classify the user's intent into one of these categories: BOOKING, INFORMATION, PRICING, AVAILABILITY, OTHER"
        }, {
            "role": "user",
            "content": message
        }],
        temperature=0,
        max_tokens=50
    )
    return response.choices[0].message.content.strip()

def generate_response(message: str, conversation_history: Optional[list] = None) -> str:
    """Generate a response using OpenAI's API"""
    try:
        # Format conversation history
        messages = []
        
        # Add system message
        messages.append({
            "role": "system",
            "content": """You are a friendly and knowledgeable spa assistant. You help customers learn about spa services 
            and book appointments. Be concise, professional, and helpful. If someone wants to book, ask about their 
            preferred service and time."""
        })

        # Add conversation history
        if conversation_history:
            for msg in conversation_history:
                messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })

        # Add the current message
        messages.append({
            "role": "user",
            "content": message
        })

        # Get completion from OpenAI
        completion = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=150
        )

        return completion.choices[0].message.content

    except Exception as e:
        print(f"Error generating response: {str(e)}")
        return "I apologize, but I'm having trouble processing your request right now. Could you please try again?"

def extract_service_id(message: str, conversation_history: list) -> Optional[int]:
    """Extract service ID from conversation context"""
    try:
        # Ask GPT to identify the selected service
        messages = [
            {"role": "system", "content": "Extract the service ID from the conversation. Return only the number."},
            *conversation_history,
            {"role": "user", "content": message}
        ]
        
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0,
            max_tokens=10
        )
        
        service_id = int(completion.choices[0].message.content.strip())
        return service_id
    except:
        return None

async def extract_service_type(message: str, conversation_history: list) -> Optional[str]:
    """Extract the service type from the conversation context."""
    try:
        # Ask GPT to identify the service type
        messages = [
            {
                "role": "system",
                "content": "Extract the spa service type from the conversation. Return only 'massage' or 'facial' if mentioned, otherwise return 'none'."
            }
        ]
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-3:]:  # Look at last 3 messages
                role = "user" if msg.get('isUser') else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.get('content', '')
                })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        completion = await client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0,
            max_tokens=10
        )
        
        service_type = completion.choices[0].message.content.strip().lower()
        return service_type if service_type != "none" else None
    except:
        return None 