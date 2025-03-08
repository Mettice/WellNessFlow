from typing import Dict, List, Optional
import openai
from datetime import datetime
from models.database import SessionLocal, SpaProfile, BrandSettings, Document, SpaService

class UpsellService:
    def __init__(self, spa_id: str = None):
        self.spa_id = spa_id
        self.db = SessionLocal()

    def __del__(self):
        self.db.close()

    def get_spa_context(self) -> str:
        """Get relevant spa context from documents and profile."""
        try:
            # Get spa profile and brand settings
            profile = self.db.query(SpaProfile).filter_by(spa_id=self.spa_id).first()
            brand_settings = self.db.query(BrandSettings).filter_by(spa_id=self.spa_id).first()
            
            # Get relevant documents
            docs = self.db.query(Document).filter_by(
                spa_id=self.spa_id,
                processed=True
            ).all()
            
            context_parts = []
            
            if profile:
                context_parts.append(f"Business Profile: {profile.business_name} - {profile.description}")
            
            if brand_settings and brand_settings.services:
                services_str = "Available Services: " + ", ".join(
                    [s.get('name', '') for s in brand_settings.services]
                )
                context_parts.append(services_str)
            
            # Add relevant document content
            for doc in docs:
                if doc.doc_metadata and isinstance(doc.doc_metadata, dict):
                    if doc.doc_metadata.get('category') in ['services', 'pricing', 'promotions']:
                        context_parts.append(doc.content[:500])  # Limit content length
            
            return "\n".join(context_parts)
        except Exception as e:
            print(f"Error getting spa context: {str(e)}")
            return ""

    async def get_personalized_upsell(
        self, 
        service_type: str, 
        customer_history: Optional[List[Dict]] = None,
        price_sensitivity: Optional[float] = None
    ) -> List[Dict]:
        """Get personalized upsell recommendations based on service type and customer history."""
        try:
            # Get add-on services from the database
            add_on_services = self.db.query(SpaService).filter_by(
                spa_id=self.spa_id,
                service_type='add-on',
                parent_type=service_type
            ).all()
            
            base_options = []
            
            # Convert SpaService objects to dictionaries
            for service in add_on_services:
                base_options.append({
                    'name': service.name,
                    'description': service.description,
                    'price': service.price,
                    'duration': service.duration
                })
            
            # Fallback to brand settings if no services found in the database
            if not base_options:
                # Get base service options from brand settings
                brand_settings = self.db.query(BrandSettings).filter_by(spa_id=self.spa_id).first()
                
                if brand_settings and brand_settings.services:
                    for service in brand_settings.services:
                        if service.get('type') == 'add-on' and service.get('parent_type') == service_type:
                            base_options.append({
                                'name': service.get('name'),
                                'description': service.get('description'),
                                'price': service.get('price'),
                                'duration': service.get('duration')
                            })

            if not base_options:
                return []

            # Get spa context for better personalization
            spa_context = self.get_spa_context()

            # If we have customer history, use OpenAI to personalize suggestions
            if customer_history:
                try:
                    messages = [
                        {
                            "role": "system",
                            "content": f"""You are a spa upsell recommendation system. Use the following spa context 
                            to make personalized recommendations:\n\n{spa_context}"""
                        },
                        {
                            "role": "user",
                            "content": f"""Customer history: {customer_history}
                            Available add-ons: {base_options}
                            Price sensitivity: {price_sensitivity}
                            Service type: {service_type}

                            Analyze the customer's conversation history and preferences to rank the most relevant 
                            add-on services. Consider their interests, previous treatments, and any mentioned 
                            preferences or concerns."""
                        }
                    ]

                    response = await openai.chat.completions.create(
                        model="gpt-4",
                        messages=messages,
                        temperature=0.7,
                        max_tokens=200
                    )
                    
                    # Parse the response and reorder the options
                    suggested_order = response.choices[0].message.content.strip().split('\n')
                    reordered_options = []
                    
                    for suggestion in suggested_order:
                        for option in base_options:
                            if option["name"].lower() in suggestion.lower():
                                reordered_options.append(option)
                    
                    # Add any remaining options not mentioned by the AI
                    for option in base_options:
                        if option not in reordered_options:
                            reordered_options.append(option)
                    
                    return reordered_options
                    
                except Exception as e:
                    print(f"Error getting personalized upsells: {str(e)}")
                    return base_options
            
            return base_options
        except Exception as e:
            print(f"Error in get_personalized_upsell: {str(e)}")
            return []

    def format_upsell_message(self, service_type: str, upsell_option: Dict) -> str:
        """Format an upsell suggestion into a natural language message."""
        try:
            templates = {
                "massage": [
                    "Enhance your massage experience with {name} for just ${price}. {description}",
                    "Make your massage even more relaxing with {name} (${price}). {description}",
                    "Complete your massage session with {name} - only ${price}. {description}"
                ],
                "facial": [
                    "Upgrade your facial with {name} for just ${price}. {description}",
                    "Get even better results by adding {name} (${price}). {description}",
                    "Perfect your facial treatment with {name} - only ${price}. {description}"
                ],
                "default": [
                    "Enhance your experience with {name} for just ${price}. {description}",
                    "Upgrade your treatment with {name} (${price}). {description}",
                    "Complete your session with {name} - only ${price}. {description}"
                ]
            }
            
            service_templates = templates.get(service_type, templates["default"])
            template = service_templates[hash(str(datetime.now())) % len(service_templates)]
            
            return template.format(
                name=upsell_option["name"],
                price=upsell_option["price"],
                description=upsell_option.get("description", "")
            )
        except Exception as e:
            print(f"Error formatting upsell message: {str(e)}")
            return f"Consider adding {upsell_option.get('name', 'our add-on service')} to your treatment." 