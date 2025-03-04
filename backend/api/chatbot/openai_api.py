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

async def generate_response(
    message: str, 
    spa_id: Optional[str] = None, 
    conversation_history: Optional[list] = None
) -> Dict:
    print("\n=== Generating Response ===")
    print(f"Message: {message}")
    print(f"Spa ID: {spa_id}")
    
    try:
        # Get spa context and detect intent
        spa_context = get_spa_context(spa_id)
        intent = detect_intent(message)
        print(f"Detected intent: {intent}")
        
        # Initialize upsell service with spa_id
        upsell_service = UpsellService(spa_id=spa_id)
        
        # Get relevant context based on intent
        relevant_context = ""
        if spa_id:
            context_by_type = get_relevant_context(message, spa_id)
            
            # Collect relevant documents based on intent
            relevant_docs = []
            if intent == "PRICING":
                relevant_docs.extend(context_by_type['pricing'])
                relevant_docs.extend(context_by_type['general'])
            elif intent == "BOOKING":
                relevant_docs.extend(context_by_type['booking'])
                relevant_docs.extend(context_by_type['service'])
                relevant_docs.extend(context_by_type['general'])
                
                # For booking intent, check if we should suggest upsells
                service_type = await extract_service_type(message, conversation_history)
                if service_type:
                    upsell_options = await upsell_service.get_personalized_upsell(
                        service_type=service_type,
                        customer_history=conversation_history
                    )
                    if upsell_options:
                        upsell_suggestion = upsell_service.format_upsell_message(
                            service_type,
                            upsell_options[0]  # Use the top suggestion
                        )
                        relevant_context += f"\n\nSuggested Upsell: {upsell_suggestion}"
                
            elif intent == "INFORMATION":
                relevant_docs.extend(context_by_type['service'])
                relevant_docs.extend(context_by_type['staff'])
                relevant_docs.extend(context_by_type['general'])
            else:
                relevant_docs.extend(context_by_type['general'])
            
            # Format context from documents
            if relevant_docs:
                context_texts = []
                for doc in relevant_docs:
                    if isinstance(doc, dict):  # New format with metadata
                        context_texts.append(f"From {doc['source']}: {doc['content']}")
                    else:  # Old format (string only)
                        context_texts.append(doc)
                relevant_context = "\n\n".join(context_texts)
                print(f"Found {len(relevant_docs)} relevant documents")
            else:
                print("No relevant documents found")
        
        # Initialize response dict
        response_data = {
            "message": "",
            "intent": intent,
            "actions": []
        }
        
        # Build conversation context
        conversation_context = []
        if conversation_history:
            for msg in conversation_history[-5:]:  # Only use last 5 messages
                role = "user" if msg.get('isUser') else "assistant"
                conversation_context.append({
                    "role": role,
                    "content": msg.get('content', '')
                })
        
        # Add current message
        conversation_context.append({
            "role": "user",
            "content": message
        })
        
        # Create system message with context
        system_message = f"""You are a friendly and knowledgeable spa assistant. Your goal is to provide a warm, personalized experience while helping clients discover the perfect spa services for their needs.

Spa Information:
{spa_context}

Relevant Document Context:
{relevant_context}

Response Formatting Guidelines:
1. Structure your responses clearly using sections when appropriate:
   • Use bullet points (•) for lists
   • Break paragraphs for readability
   • Highlight important information using **bold**
   • Use emojis sparingly for visual appeal (✨, 💆‍♀️, 🌿)

2. When discussing services:
   • Name: **[Service Name]**
   • Duration: [Time] minutes
   • Price: $[Amount]
   • Benefits: Listed with bullet points
   
3. For pricing information:
   • Present prices in a clear format: **[Service] - $[Price]**
   • Group related services together
   • Include any special offers or packages

4. When making recommendations:
   • Start with a personalized introduction
   • List 2-3 specific suggestions
   • Explain why each recommendation fits the client's needs
   • Include pricing and duration information

5. For booking guidance:
   • Present steps in a numbered list
   • Highlight important requirements in **bold**
   • Include contact information when relevant

Interaction Guidelines:
1. Be warm and welcoming - use a friendly, conversational tone
2. Ask clarifying questions when needed to better understand the client's needs
3. Make personalized recommendations based on the information provided
4. Proactively offer relevant information about services, pricing, or policies
5. If discussing services, mention their benefits and what makes them special
6. For pricing queries, provide clear pricing info and suggest complementary services
7. For booking inquiries, guide clients through the process and explain next steps

Remember to maintain a professional yet approachable demeanor while providing accurate information from the context."""
        
        # Generate response using OpenAI
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": system_message},
                *conversation_context
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        # Extract response text
        response_data["message"] = response.choices[0].message.content

        # Add booking action if intent is BOOKING
        if intent == "BOOKING":
            response_data["actions"].append({
                "type": "SHOW_CALENDAR"
            })
        
        return response_data
        
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        print(f"Stack trace: {traceback.format_exc()}")
        return {
            "message": "I apologize, but I encountered an error while processing your request. Please try again.",
            "intent": "ERROR",
            "actions": []
        }

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