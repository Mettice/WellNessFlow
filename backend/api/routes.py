from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, create_access_token, get_jwt, get_jwt_identity, get_jwt_header
from werkzeug.security import generate_password_hash, check_password_hash
from .chatbot.openai_api import generate_response
from .rag.document_loader import process_document
from .chatbot.calendar import CalendarIntegration
from .services.mock_calendar import MockCalendarService
from .services.upsell_service import UpsellService
from datetime import datetime, timedelta
import stripe
from sqlalchemy import func, and_, or_, desc
from models.database import SessionLocal, Appointment, Client, User, SubscriptionPlan, SpaService, Location, Document, DocumentChunk, SpaProfile, BrandSettings, PlatformMetrics, ChatConversation, ChatMessage
import os
import uuid
import bcrypt
from .notifications.email import send_email, send_welcome_email
from flask import current_app
import threading
from .tasks import task_queue
import base64
import tempfile
from werkzeug.utils import secure_filename
from .utils import allowed_file
import json
from functools import wraps
import traceback
import asyncio
import re
import jwt
from monitoring import track_request_performance

bp = Blueprint('api', __name__, url_prefix='/api')

# Initialize Stripe with YOUR platform's secret key
stripe.api_key = os.getenv('STRIPE_PLATFORM_SECRET_KEY')

# Helper function to get spa_id from various sources
def get_spa_id_from_request():
    """
    Gets spa_id from JWT claims, sub claim, or X-Spa-ID header.
    Returns spa_id if found, None otherwise.
    """
    # First check JWT claims (primary source)
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    
    # If not in claims, check if it's in the sub claim (JWT identity)
    if not spa_id and 'sub' in claims:
        spa_id = claims.get('sub')
    
    # If still not found, check custom header (backup)
    if not spa_id:
        spa_id = request.headers.get('X-Spa-ID')
        if spa_id:
            print(f"Using spa_id from X-Spa-ID header: {spa_id}")
    
    return spa_id

# Initialize Stripe with the spa's secret key
def init_stripe(spa_id):
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if client and client.api_keys.get('stripe_secret_key'):
            stripe.api_key = client.api_keys['stripe_secret_key']
            return True
        return False
    finally:
        db.close()

# Authentication endpoints
@bp.route('/auth/login', methods=['POST'])
def login():
    print("\n=== Login Request Debug ===")
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    print(f"Request content type: {request.content_type}")
    print(f"Request mimetype: {request.mimetype}")
    
    try:
        data = request.get_json()
        print(f"Request data: {data}")
        
        if not data:
            print("No JSON data received")
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get('email')
        password = data.get('password')
        print(f"Email: {email}")
        
        if not email or not password:
            print("Missing email or password")
            return jsonify({"error": "Missing email or password"}), 400

        # Validate email format
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not email_pattern.match(email):
            print(f"Invalid email format: {email}")
            return jsonify({'error': 'Invalid email format. Please use a valid email address (e.g., example@domain.com)'}), 400

        db = SessionLocal()
        try:
            print("Querying database for user...")
            user = db.query(User).filter_by(email=email).first()
            print(f"User found: {user is not None}")
            
            if not user:
                print("User not found")
                return jsonify({"error": "Invalid credentials"}), 401
            
            if not user.is_active:
                print("User account is inactive")
                return jsonify({"error": "Account is inactive"}), 401
            
            print(f"Checking password for user: {user.email}")
            print(f"Password hash in DB: {user.password_hash[:10]}... (length: {len(user.password_hash)})")
            print(f"Password comparison: hash vs plaintext (first 3 chars): {user.password_hash[:3]} vs {password[:3]}")
            
            try:
                # First try the proper password hash check
                password_match = check_password_hash(user.password_hash, password)
                print(f"Password match result using check_password_hash: {password_match}")
                
                # IMPORTANT: For debugging only - remove in production
                # If the hashed check fails, check if the password is stored directly (insecure)
                if not password_match and user.password_hash == password:
                    print("WARNING: Plain text password match - this is insecure!")
                    password_match = True
            except Exception as e:
                print(f"Error checking password: {str(e)}")
                print(f"Error type: {type(e).__name__}")
                print(f"Error traceback: {traceback.format_exc()}")
                return jsonify({"error": f"Error verifying password: {str(e)}"}), 500
            
            if not password_match:
                print("Invalid password")
                return jsonify({"error": "Invalid credentials"}), 401
                
            print("Password verified successfully")
            
            # Ensure spa_id is available
            spa_id = user.spa_id
            print(f"User spa_id: {spa_id}")
            
            if not spa_id and user.role == 'spa_admin':
                # If spa_id is missing but user is spa_admin, try to find or create a spa
                print("No spa_id found, looking for client or creating new one")
                client = db.query(Client).filter_by(email=user.email).first()
                if client:
                    spa_id = client.spa_id
                    print(f"Found client with spa_id: {spa_id}")
                    # Update user with spa_id
                    user.spa_id = spa_id
                    db.commit()
                else:
                    # Create a new spa for this admin
                    spa_id = str(uuid.uuid4())
                    print(f"Creating new client with spa_id: {spa_id}")
                    new_client = Client(
                        spa_id=spa_id,
                        name=f"{user.email}'s Spa",
                        email=user.email,
                        subscription_plan='basic',
                        subscription_status='active',
                        trial_ends_at=datetime.utcnow() + timedelta(days=14),
                        config={
                            'name': f"{user.email}'s Spa",
                            'business_hours': {
                                'weekday': {'open': '09:00', 'close': '17:00'},
                                'weekend': {'open': '10:00', 'close': '15:00'}
                            }
                        },
                        api_keys={},
                        calendar_type='none',
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_client)
                    
                    # Update user with spa_id
                    user.spa_id = spa_id
                    db.commit()
            
            print(f"Creating access token with identity={spa_id} and additional claims")
            
            # Prepare claims
            additional_claims = {
                "user_id": str(user.id),
                "role": user.role,
                "email": user.email
            }
            
            # Only add spa_id to claims if it exists
            if spa_id:
                additional_claims["spa_id"] = spa_id
                print(f"Added spa_id to token claims: {spa_id}")
            
            # Create the access token
            access_token = create_access_token(
                identity=spa_id,  # Use spa_id as identity
                additional_claims=additional_claims,
                expires_delta=timedelta(days=7)  # Extend token lifetime for testing
            )
            
            # Decode token for debugging
            try:
                decoded = jwt.decode(
                    access_token, 
                    options={"verify_signature": False}
                )
                print(f"Token created successfully.")
                print(f"Decoded token payload: {decoded}")
                print(f"Token identity (sub): {decoded.get('sub')}")
                print(f"Token spa_id claim: {decoded.get('spa_id')}")
            except Exception as e:
                print(f"Error decoding token: {str(e)}")
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()
            
            # Prepare the response object
            response_data = {
                "access_token": access_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "spa_id": user.spa_id
                }
            }
            print(f"Login successful for user: {user.email}")
            print(f"Response data: {response_data['user']}")
            
            return jsonify(response_data)
        except Exception as e:
            db.rollback()
            print(f"Database error: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            print(f"Error traceback: {traceback.format_exc()}")
            return jsonify({"error": f"Internal server error: {str(e)}"}), 500
        finally:
            db.close()
    except Exception as e:
        print(f"Error processing login request: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print(f"Error traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@bp.route('/auth/debug-token', methods=['GET'])
@jwt_required()
def debug_token():
    """Debug endpoint to check JWT token contents"""
    print("\n=== Debug Token Request ===")
    
    # Get identity and claims
    identity = get_jwt_identity()
    claims = get_jwt()
    headers = get_jwt_header()
    
    print(f"JWT Identity: {identity}")
    print(f"JWT Claims: {claims}")
    print(f"JWT Headers: {headers}")
    
    # Get authorization header
    auth_header = request.headers.get('Authorization', '')
    print(f"Authorization Header: {auth_header[:15]}...")
    
    # Try to decode the token manually
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        try:
            decoded = jwt.decode(
                token, 
                options={"verify_signature": False}
            )
            print(f"Manually decoded token: {decoded}")
        except Exception as e:
            print(f"Error decoding token: {str(e)}")
    
    return jsonify({
        'identity': identity,
        'claims': claims,
        'headers': headers
    })

@bp.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user's information"""
    spa_id = get_jwt_identity()
    claims = get_jwt()
    user_id = claims.get('user_id')
    
    db = SessionLocal()
    try:
        # Convert user_id to integer for database query
        user = db.query(User).filter_by(id=int(user_id)).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        return jsonify({
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'spa_id': user.spa_id
        })
    finally:
        db.close()

# Client management endpoints
@bp.route('/clients', methods=['POST'])
@jwt_required()
def create_client():
    try:
        data = request.json
        db = SessionLocal()
        try:
            client = Client(
                name=data['name'],
                email=data['email'],
                phone=data.get('phone'),
                preferences=data.get('preferences', {}),
                created_at=datetime.utcnow()
            )
            db.add(client)
            db.commit()
            return jsonify({
                'message': 'Client created successfully',
                'client_id': client.id
            })
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/clients/<int:client_id>', methods=['GET'])
@jwt_required()
def get_client(client_id):
    try:
        db = SessionLocal()
        try:
            client = db.query(Client).get(client_id)
            if not client:
                return jsonify({'error': 'Client not found'}), 404
                
            # Get client's booking history
            appointments = db.query(Appointment).filter_by(client_id=client_id).all()
            
            return jsonify({
                'client': {
                    'id': client.id,
                    'name': client.name,
                    'email': client.email,
                    'phone': client.phone,
                    'preferences': client.preferences,
                    'created_at': client.created_at.isoformat(),
                    'appointments': [{
                        'id': apt.id,
                        'service': apt.service.name if apt.service else None,
                        'datetime': apt.appointment_datetime.isoformat(),
                        'status': apt.status
                    } for apt in appointments]
                }
            })
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Existing routes with authentication added
@bp.route('/chat', methods=['POST'])
@track_request_performance
def chat():
    # Public endpoint - no authentication required
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400

        # Get spa_id from request or use default
        spa_id = data.get('spa_id')
        if not spa_id:
            return jsonify({'error': 'No spa_id provided'}), 400

        # Verify spa exists
        db = SessionLocal()
        try:
            spa = db.query(Client).filter_by(spa_id=spa_id).first()
            if not spa:
                return jsonify({'error': 'Invalid spa_id'}), 404
        finally:
            db.close()

        response_data = generate_response(
            message=data['message'],
            spa_id=spa_id,
            conversation_history=data.get('conversation_history', [])
        )
        
        return jsonify(response_data)
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/locations', methods=['GET'])
def get_locations():
    """Get all locations for a spa"""
    spa_id = request.args.get('spa_id', 'default')
    
    db = SessionLocal()
    try:
        locations = db.query(Location).filter_by(spa_id=spa_id).all()
        return jsonify({
            'locations': [{
                'id': loc.id,
                'name': loc.name,
                'address': loc.address,
                'city': loc.city,
                'state': loc.state,
                'phone': loc.phone,
                'is_primary': loc.is_primary
            } for loc in locations]
        })
    finally:
        db.close()

@bp.route('/appointments/available', methods=['GET'])
def get_available_slots():
    """Get available appointment slots for a given date and location"""
    date_str = request.args.get('date')
    service_id = request.args.get('service_id')
    location_id = request.args.get('location_id')
    
    if not all([date_str, service_id, location_id]):
        return jsonify({'error': 'Missing required parameters'}), 400
        
    try:
        date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
        
    db = SessionLocal()
    try:
        # Get location's business hours
        location = db.query(Location).filter_by(id=location_id).first()
        if not location:
            return jsonify({'error': 'Location not found'}), 404
            
        # Get service duration
        service = db.query(SpaService).filter_by(id=service_id).first()
        if not service:
            return jsonify({'error': 'Service not found'}), 404
            
        # Get existing appointments for this date and location
        existing_appointments = db.query(Appointment).filter(
            Appointment.location_id == location_id,
            func.date(Appointment.appointment_datetime) == date.date(),
            Appointment.status != 'cancelled'
        ).all()
        
        # Generate available slots based on business hours and existing appointments
        weekday = date.strftime('%A').lower()
        is_weekend = weekday in ['saturday', 'sunday']
        
        if is_weekend:
            open_time = location.business_hours['weekend']['open']
            close_time = location.business_hours['weekend']['close']
        else:
            open_time = location.business_hours['weekday']['open']
            close_time = location.business_hours['weekday']['close']
            
        # Convert business hours to datetime
        open_dt = datetime.strptime(f"{date.date()} {open_time}", "%Y-%m-%d %H:%M")
        close_dt = datetime.strptime(f"{date.date()} {close_time}", "%Y-%m-%d %H:%M")
        
        # Generate slots every 30 minutes
        slots = []
        current = open_dt
        while current + timedelta(minutes=service.duration) <= close_dt:
            # Check if slot conflicts with existing appointments
            is_available = True
            for appt in existing_appointments:
                appt_end = appt.appointment_datetime + timedelta(minutes=service.duration)
                if (current >= appt.appointment_datetime and current < appt_end) or \
                   (current + timedelta(minutes=service.duration) > appt.appointment_datetime and \
                    current + timedelta(minutes=service.duration) <= appt_end):
                    is_available = False
                    break
                    
            if is_available:
                slots.append({
                    'time': current.strftime('%H:%M'),
                    'duration': service.duration,
                    'service': service.name,
                    'service_id': service.id,
                    'location_id': location.id
                })
                
            current += timedelta(minutes=30)
            
        return jsonify({'slots': slots})
        
    finally:
        db.close()

@bp.route('/appointments', methods=['POST'])
def book_appointment():
    """Book a new appointment"""
    data = request.json
    required_fields = ['service_id', 'location_id', 'datetime', 'name', 'email', 'phone']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
        
    db = SessionLocal()
    try:
        # Verify service exists
        service = db.query(SpaService).filter_by(id=data['service_id']).first()
        if not service:
            return jsonify({'error': 'Service not found'}), 404
            
        # Verify location exists
        location = db.query(Location).filter_by(id=data['location_id']).first()
        if not location:
            return jsonify({'error': 'Location not found'}), 404
            
        # Get spa's calendar type
        client = db.query(Client).filter_by(spa_id=location.spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404

        # Create appointment
        appointment = Appointment(
            service_id=data['service_id'],
            location_id=data['location_id'],
            appointment_datetime=datetime.fromisoformat(data['datetime'].replace('Z', '+00:00')),
            client_name=data['name'],
            client_email=data['email'],
            client_phone=data['phone'],
            notes=data.get('notes'),
            status='confirmed',
            spa_id=location.spa_id
        )
        
        db.add(appointment)
        db.commit()

        # Handle calendar-specific booking and notifications
        calendar_type = client.calendar_type
        if calendar_type in ['acuity', 'calendly', 'mindbody']:
            # Let the integrated calendar system handle notifications
            try:
                calendar = CalendarIntegration(location.spa_id)
                calendar.book_appointment({
                    'datetime': appointment.appointment_datetime,
                    'service_id': service.id,
                    'client_name': data['name'],
                    'client_email': data['email'],
                    'client_phone': data['phone'],
                    'notes': data.get('notes')
                })
            except Exception as e:
                print(f"Calendar integration error: {e}")
                # Even if calendar integration fails, we keep our booking
                # Just log the error and continue
        else:
            # For spas without integrated calendars, send our own notifications
            try:
                send_booking_notifications(appointment, service, location)
            except Exception as e:
                print(f"Failed to send notifications: {e}")
            
        return jsonify({'status': 'success', 'appointment_id': appointment.id})
        
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

def send_booking_notifications(appointment, service, location):
    """Send booking notifications for non-integrated calendar systems"""
    # Send confirmation to client
    send_email(
        to=appointment.client_email,
        subject=f"Booking Confirmation - {service.name}",
        template="booking_confirmation",
        data={
            'client_name': appointment.client_name,
            'service_name': service.name,
            'datetime': appointment.appointment_datetime,
            'location_name': location.name,
            'location_address': location.address,
            'spa_phone': location.phone
        }
    )
    
    # Send notification to spa
    send_email(
        to=location.email,
        subject=f"New Booking - {service.name}",
        template="new_booking_notification",
        data={
            'client_name': appointment.client_name,
            'service_name': service.name,
            'datetime': appointment.appointment_datetime,
            'client_phone': appointment.client_phone,
            'client_email': appointment.client_email,
            'notes': appointment.notes
        }
    )

@bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    """Upload and process a document."""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file or not file.filename:
            return jsonify({'error': 'Invalid file'}), 400
            
        # Get spa_id from JWT claims
        claims = get_jwt()
        spa_id = claims.get('spa_id', 'default')
        
        # Create document record first
        db = SessionLocal()
        try:
            # Read file content
            file_content = file.read()
            
            # Create document record
            doc = Document(
                spa_id=spa_id,
                name=file.filename,
                content=base64.b64encode(file_content).decode('utf-8') if not file.content_type.startswith('text/') else file_content.decode('utf-8'),
                doc_type=os.path.splitext(file.filename)[1][1:].lower(),
                uploaded_at=datetime.utcnow(),
                processed=False,
                doc_metadata={
                    'content_type': file.content_type,
                    'size': len(file_content)
                }
            )
            db.add(doc)
            db.commit()
            
            # Save file to temporary location and process it
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                # Reset file pointer to beginning
                file.seek(0)
                file.save(temp_file)
                temp_file.flush()
                
                try:
                    # Process document with document ID
                    print(f"\nProcessing document: {file.filename}")
                    result = process_document(temp_file.name, spa_id, doc.id)
                    
                    if result == "Error: Document record not found":
                        return jsonify({'error': 'Failed to process document: Document record not found'}), 500
                    
                    # Update document status
                    doc.processed = True
                    doc.processed_at = datetime.utcnow()
                    db.commit()
                    
                    return jsonify({
                        'message': 'Document uploaded and processed successfully',
                        'document_id': doc.id,
                        'result': result
                    }), 200
                    
                finally:
                    # Ensure file handle is closed before attempting deletion
                    temp_file.close()
                    try:
                        os.unlink(temp_file.name)
                    except Exception as e:
                        print(f"Error cleaning up temp file: {str(e)}")
                    
        except Exception as e:
            db.rollback()
            print(f"Error processing document: {str(e)}")
            return jsonify({'error': f'Error processing document: {str(e)}'}), 500
        finally:
            db.close()
                    
    except Exception as e:
        print(f"Error in upload route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0'
    })

@bp.route('/admin/bot-metrics', methods=['GET'])
@jwt_required()
def get_bot_metrics():
    print("\n=== Bot Metrics Request Debug ===")
    try:
        db = SessionLocal()
        try:
            # Get spa_id using the helper function and print for debugging
            spa_id = get_spa_id_from_request()
            print(f"Resolved spa_id: {spa_id}")
            
            # Debug all potential sources of spa_id
            claims = get_jwt()
            print(f"JWT claims: {claims}")
            print(f"JWT sub claim: {claims.get('sub')}")
            print(f"JWT spa_id claim: {claims.get('spa_id')}")
            print(f"X-Spa-ID header: {request.headers.get('X-Spa-ID')}")
            
            if not spa_id:
                print("No spa_id found in any source, returning 401")
                return jsonify({"error": "Unauthorized - No spa_id in token"}), 401
            
            # Get time range from query params (default to last 30 days)
            days = int(request.args.get('days', 30))
            start_date = datetime.now() - timedelta(days=days)
            print(f"Querying with spa_id: {spa_id}, start_date: {start_date}")
            
            # Rest of the function remains the same...
            # Get total conversations (all appointments)
            total_conversations = db.query(func.count(Appointment.id)).filter(
                Appointment.spa_id == spa_id,
                Appointment.created_at >= start_date
            ).scalar() or 0
            
            # Get successful bookings (confirmed appointments)
            successful_bookings = db.query(func.count(Appointment.id)).filter(
                Appointment.spa_id == spa_id,
                Appointment.status == 'confirmed',
                Appointment.created_at >= start_date
            ).scalar() or 0
            
            # Calculate conversion rate safely
            conversion_rate = (successful_bookings / total_conversations * 100) if total_conversations > 0 else 0
            
            # Get popular services with proper null handling
            popular_services = []
            services_query = db.query(
                SpaService.name,
                func.count(Appointment.id).label('booking_count')
            ).outerjoin(
                Appointment,
                and_(
                    Appointment.service_id == SpaService.id,
                    Appointment.spa_id == spa_id,
                    Appointment.created_at >= start_date
                )
            ).filter(
                SpaService.spa_id == spa_id
            ).group_by(
                SpaService.name
            ).order_by(
                func.count(Appointment.id).desc()
            ).limit(5).all()
            
            popular_services = [
                {'service': service_name, 'count': count}
                for service_name, count in services_query
            ]
            
            # Get peak booking hours with proper null handling
            peak_hours = []
            hours_query = db.query(
                func.strftime('%H', Appointment.appointment_datetime).label('hour'),
                func.count(Appointment.id).label('booking_count')
            ).filter(
                Appointment.spa_id == spa_id,
                Appointment.created_at >= start_date
            ).group_by(
                func.strftime('%H', Appointment.appointment_datetime)
            ).order_by(
                func.count(Appointment.id).desc()
            ).all()
            
            peak_hours = [
                {'hour': hour or '00', 'bookings': count}
                for hour, count in hours_query
            ]
            
            # Calculate average response time with safe default
            avg_response_time = db.query(
                func.avg(
                    func.julianday(Appointment.created_at) - 
                    func.julianday(Appointment.appointment_datetime)
                ) * 24 * 60  # Convert to minutes
            ).filter(
                Appointment.spa_id == spa_id,
                Appointment.created_at >= start_date
            ).scalar() or 0
            
            avg_response_time_str = f"{round(avg_response_time, 1)} min"
            
            # Prepare response data
            response_data = {
                'totalConversations': total_conversations,
                'successfulBookings': successful_bookings,
                'averageResponseTime': avg_response_time_str,
                'conversionRate': round(conversion_rate, 1),
                'popularServices': popular_services or [],
                'peakHours': peak_hours or []
            }
            
            print(f"Returning bot metrics: {response_data}")
            return jsonify(response_data)
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error in get_bot_metrics: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({
            'totalConversations': 0,
            'successfulBookings': 0,
            'averageResponseTime': '0 min',
            'conversionRate': 0,
            'popularServices': [],
            'peakHours': []
        }), 200  # Return empty metrics instead of 500 error

@bp.route('/payment/process', methods=['POST'])
def process_payment():
    try:
        data = request.json
        spa_id = data.get('spa_id')
        
        # Initialize Stripe with the spa's API key
        if not init_stripe(spa_id):
            return jsonify({'error': 'Stripe not configured for this spa'}), 400

        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=int(float(data['amount']) * 100),  # Convert to cents
            currency='usd',
            metadata={
                'spa_id': spa_id,
                'appointment_id': data.get('appointment_id'),
                'service_name': data.get('service_name')
            }
        )
        
        return jsonify({
            'clientSecret': payment_intent.client_secret,
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    

@bp.route('/payment/setup', methods=['POST'])
@jwt_required()
def setup_payment():
    """Setup Stripe account for a spa"""
    try:
        data = request.json
        spa_id = data.get('spa_id')
        stripe_secret_key = data.get('stripe_secret_key')
        
        if not spa_id or not stripe_secret_key:
            return jsonify({'error': 'Missing required fields'}), 400
            
        db = SessionLocal()
        try:
            client = db.query(Client).filter_by(spa_id=spa_id).first()
            if not client:
                return jsonify({'error': 'Spa not found'}), 404
                
            # Update the client's API keys
            api_keys = client.api_keys or {}
            api_keys['stripe_secret_key'] = stripe_secret_key
            client.api_keys = api_keys
            
            db.commit()
            return jsonify({'message': 'Payment setup successful'})
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/subscription/current', methods=['GET'])
@jwt_required()
def get_current_subscription():
    """Get the current subscription for a spa"""
    db = SessionLocal()
    try:
        spa_id = request.args.get('spa_id')
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        
        if not client:
            return jsonify({'error': 'Client not found'}), 404
            
        return jsonify({
            'plan': client.subscription_plan,
            'status': client.subscription_status,
            'trial_ends_at': client.trial_ends_at.isoformat() if client.trial_ends_at else None
        })
    finally:
        db.close()

@bp.route('/subscription/plans', methods=['GET'])
def get_subscription_plans():
    """Get all available subscription plans"""
    db = SessionLocal()
    try:
        plans = db.query(SubscriptionPlan).all()
        return jsonify({
            'plans': [{
                'id': plan.id,
                'name': plan.name,
                'monthly_price': plan.monthly_price,
                'features': plan.features
            } for plan in plans]
        })
    finally:
        db.close()

@bp.route('/subscription/create', methods=['POST'])
@jwt_required()
def create_subscription():
    """Create a new subscription for a spa"""
    data = request.json
    if not data or 'plan_id' not in data or 'spa_id' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
        
    db = SessionLocal()
    try:
        # Get the plan
        plan = db.query(SubscriptionPlan).filter_by(id=data['plan_id']).first()
        if not plan:
            return jsonify({'error': 'Invalid plan'}), 400
            
        # Get the client
        client = db.query(Client).filter_by(spa_id=data['spa_id']).first()
        if not client:
            return jsonify({'error': 'Client not found'}), 404
            
        # Create Stripe subscription
        try:
            # Initialize Stripe with platform's secret key
            stripe.api_key = os.getenv('STRIPE_PLATFORM_SECRET_KEY')
            
            # Create or get customer
            if not client.api_keys.get('stripe_customer_id'):
                customer = stripe.Customer.create(
                    email=client.email,
                    metadata={'spa_id': client.spa_id}
                )
                client.api_keys['stripe_customer_id'] = customer.id
                db.commit()
            
            # Create subscription
            subscription = stripe.Subscription.create(
                customer=client.api_keys['stripe_customer_id'],
                items=[{'price': plan.price_id}],
                payment_behavior='default_incomplete',
                expand=['latest_invoice.payment_intent']
            )
            
            # Update client subscription details
            client.subscription_plan = plan.name
            client.subscription_id = subscription.id
            client.subscription_status = subscription.status
            db.commit()
            
            return jsonify({
                'client_secret': subscription.latest_invoice.payment_intent.client_secret
            })
            
        except stripe.error.StripeError as e:
            return jsonify({'error': str(e)}), 400
            
    finally:
        db.close()

@bp.route('/subscription/webhook', methods=['POST'])
def handle_subscription_webhook():
    """Handle Stripe webhook events for subscription management"""
    try:
        event = stripe.Webhook.construct_event(
            payload=request.data,
            sig_header=request.headers.get('Stripe-Signature'),
            secret=os.getenv('STRIPE_WEBHOOK_SECRET')
        )
        
        if event.type in ['customer.subscription.updated', 'customer.subscription.deleted']:
            subscription = event.data.object
            
            db = SessionLocal()
            try:
                client = db.query(Client).filter(
                    Client.api_keys['stripe_customer_id'].astext == subscription.customer
                ).first()
                
                if client:
                    client.subscription_status = subscription.status
                    if subscription.status == 'canceled':
                        client.subscription_plan = 'canceled'
                    
                    db.commit()
            finally:
                db.close()
                
        return jsonify({'status': 'success'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/onboard/start', methods=['POST'])
def start_onboarding():
    data = request.json
    db = SessionLocal()
    try:
        # Validate required fields
        required_fields = ['spa_name', 'owner_name', 'email', 'phone', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Check if email already exists
        if db.query(Client).filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400

        # Generate spa_id
        spa_id = str(uuid.uuid4())

        # Create client record
        client = Client(
            spa_id=spa_id,
            name=data['spa_name'],
            email=data['email'],
            phone=data['phone'],
            subscription_plan='basic',
            subscription_status='trial',
            trial_ends_at=datetime.utcnow() + timedelta(days=14),
            config={
                'name': data['spa_name'],
                'owner_name': data['owner_name']
            },
            api_keys={},
            calendar_type='none',
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(client)

        # Create user record with hashed password
        password_hash = generate_password_hash(data['password'])
        user = User(
            spa_id=spa_id,
            email=data['email'],
            password_hash=password_hash,
            role='spa_admin',
            is_active=True,
            last_login=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(user)

        # Add locations
        for location_data in data.get('locations', []):
            location = Location(
                spa_id=spa_id,
                **location_data
            )
            db.add(location)

        db.commit()

        # Generate access token
        access_token = create_access_token(identity=spa_id)

        # Send welcome email
        send_welcome_email(
            spa_name=data['spa_name'],
            owner_name=data['owner_name'],
            to_email=data['email']
        )

        return jsonify({
            'message': 'Account created successfully',
            'access_token': access_token,
            'spa_id': spa_id
        })

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@bp.route('/onboard/setup-services', methods=['POST'])
@jwt_required()
def setup_services():
    """Setup initial spa services"""
    print("\n=== Setup Services Debug ===")
    
    # Get spa_id from JWT claims
    claims = get_jwt()
    jwt_spa_id = claims.get('spa_id')
    print(f"JWT claims: {claims}")
    print(f"Spa ID from claims: {jwt_spa_id}")
    
    try:
        data = request.json
        print(f"Request data: {data}")
        
        # Get spa_id from request or JWT
        spa_id = data.get('spa_id') or jwt_spa_id
        services = data.get('services', [])
        
        print(f"Using spa_id: {spa_id}")
        print(f"Services count: {len(services)}")
        
        if not spa_id:
            print("Missing spa_id")
            return jsonify({'error': 'Missing spa_id'}), 422
            
        if not services:
            print("No services provided")
            return jsonify({'error': 'No services provided'}), 422

        db = SessionLocal()
        try:
            # Check if spa exists
            client = db.query(Client).filter_by(spa_id=spa_id).first()
            if not client:
                print(f"No client found with spa_id: {spa_id}")
                return jsonify({'error': f'No client found with spa_id: {spa_id}'}), 422
            
            # Get default services
            default_services = db.query(SpaService).filter_by(spa_id=None).all()
            print(f"Found {len(default_services)} default services")
            
            # Create spa-specific services
            for service in services:
                print(f"Processing service: {service.get('name')}")
                
                # Find matching default service if exists
                default_service = next(
                    (s for s in default_services if s.name == service.get('name')), 
                    None
                )
                
                # Ensure required fields have default values
                new_service = SpaService(
                    spa_id=spa_id,
                    name=service.get('name', 'Unnamed Service'),
                    duration=service.get('duration') or (default_service.duration if default_service else 60.0),
                    price=service.get('price') or (default_service.price if default_service else 0.0),
                    description=service.get('description') or (default_service.description if default_service else ''),
                    benefits=service.get('benefits') or (default_service.benefits if default_service else []),
                    contraindications=service.get('contraindications') or (default_service.contraindications if default_service else [])
                )
                db.add(new_service)
                print(f"Added service: {new_service.name}")
            
            db.commit()
            print("Services setup completed successfully")
            return jsonify({'status': 'success', 'message': 'Services setup completed'})

        except Exception as e:
            print(f"Database error: {str(e)}")
            db.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500
        finally:
            db.close()

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/onboard/setup-calendar', methods=['POST'])
@jwt_required()
def setup_calendar():
    """Setup calendar integration"""
    print("\n=== Setup Calendar Debug ===")
    
    # Get spa_id from JWT claims
    claims = get_jwt()
    jwt_spa_id = claims.get('spa_id')
    print(f"JWT claims: {claims}")
    print(f"Spa ID from claims: {jwt_spa_id}")
    
    try:
        data = request.json
        print(f"Request data: {data}")
        
        # Get spa_id from request or JWT
        spa_id = data.get('spa_id') or jwt_spa_id
        calendar_type = data.get('calendar_type', 'none')
        calendar_settings = data.get('settings', {})
        
        print(f"Using spa_id: {spa_id}")
        print(f"Calendar type: {calendar_type}")
        print(f"Calendar settings: {calendar_settings}")

        if not spa_id:
            print("Missing spa_id")
            return jsonify({'error': 'Missing spa_id'}), 422

        db = SessionLocal()
        try:
            client = db.query(Client).filter_by(spa_id=spa_id).first()
            if not client:
                print(f"No client found with spa_id: {spa_id}")
                return jsonify({'error': f'No client found with spa_id: {spa_id}'}), 422

            client.calendar_type = calendar_type
            client.config['calendar_settings'] = calendar_settings
            client.updated_at = datetime.utcnow()
            
            print(f"Updating client {client.name} with calendar type: {calendar_type}")
            
            db.commit()
            print("Calendar setup completed successfully")
            return jsonify({'status': 'success', 'message': 'Calendar setup completed'})

        except Exception as e:
            print(f"Database error: {str(e)}")
            db.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500
        finally:
            db.close()

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/admin/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    # Get spa_id from JWT claims
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
        
    filter_type = request.args.get('filter', 'all')
    db = SessionLocal()
    
    try:
        # Start with base query filtered by spa_id
        query = db.query(Appointment).filter(Appointment.spa_id == spa_id)
        
        # Apply additional filters
        if filter_type == 'upcoming':
            query = query.filter(Appointment.appointment_datetime >= datetime.utcnow())
        elif filter_type == 'past':
            query = query.filter(Appointment.appointment_datetime < datetime.utcnow())
        elif filter_type == 'cancelled':
            query = query.filter(Appointment.status == 'cancelled')
            
        appointments = query.all()
        
        return jsonify([{
            'id': apt.id,
            'client_name': apt.client_name,
            'client_email': apt.client_email,
            'client_phone': apt.client_phone,
            'datetime': apt.appointment_datetime.isoformat(),
            'status': apt.status,
            'service': apt.service.name if apt.service else None,
            'location': apt.location.name if apt.location else None,
            'notes': apt.notes
        } for apt in appointments])
        
    except Exception as e:
        print(f"Error fetching appointments: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@bp.route('/documents', methods=['GET'])
@jwt_required()
def get_documents():
    """Get all documents for a spa"""
    print("\n=== Get Documents Debug ===")
    
    # Use our helper function to get spa_id from JWT or header
    spa_id = get_spa_id_from_request()
    print(f"Resolved spa_id: {spa_id}")
    print(f"Request headers: {dict(request.headers)}")
    
    if not spa_id:
        print("No spa_id found in JWT claims or headers")
        # Return empty list instead of error for new users
        return jsonify([]), 200
    
    db = SessionLocal()
    try:
        # Debug print to check if we can query the database
        print(f"Attempting to fetch documents for spa_id: {spa_id}")
        
        # Query documents
        documents = db.query(Document).filter_by(spa_id=spa_id).all()
        print(f"Found {len(documents)} documents")
        
        # Convert to list of dictionaries
        docs_list = [{
            'id': str(doc.id),
            'name': doc.name,
            'doc_type': doc.doc_type,
            'uploaded_at': doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            'processed': doc.processed
        } for doc in documents]
        
        return jsonify(docs_list)
    except Exception as e:
        print(f"Error in get_documents: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@bp.route('/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id):
    """Delete a document and its associated chunks."""
    # Get spa_id from JWT claims
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    
    if not spa_id:
        return jsonify({'error': 'spa_id not found in token'}), 401
        
    db = SessionLocal()
    try:
        # Find the document
        document = db.query(Document).filter_by(id=doc_id, spa_id=spa_id).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
            
        # Delete associated chunks first
        db.query(DocumentChunk).filter_by(document_id=doc_id).delete()
        
        # Delete the document
        db.delete(document)
        db.commit()
        
        return jsonify({'message': 'Document deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error deleting document: {str(e)}")
        db.rollback()
        return jsonify({'error': f'Failed to delete document: {str(e)}'}), 500
    finally:
        db.close()

@bp.route('/admin/brand-settings', methods=['GET'])
@jwt_required()
def get_brand_settings():
    """Get spa's brand settings"""
    print("\n=== Get Brand Settings Debug ===")
    
    # Get spa_id from JWT claims
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    print(f"JWT claims: {claims}")
    print(f"Spa ID from claims: {spa_id}")
    
    if not spa_id:
        print("No spa_id found in JWT claims")
        return jsonify({'error': 'No spa_id found in token'}), 422
    
    db = SessionLocal()
    try:
        settings = db.query(BrandSettings).filter_by(spa_id=spa_id).first()
        if not settings:
            # Create default settings if none exist
            print(f"Creating default brand settings for spa_id: {spa_id}")
            settings = BrandSettings(spa_id=spa_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        print(f"Returning brand settings for spa_id: {spa_id}")
        return jsonify({
            'logo_url': settings.logo_url,
            'primary_color': settings.primary_color,
            'secondary_color': settings.secondary_color,
            'font_family': settings.font_family,
            'faqs': settings.faqs,
            'services': settings.services
        })
    except Exception as e:
        print(f"Error getting brand settings: {str(e)}")
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@bp.route('/admin/update-colors', methods=['POST'])
@jwt_required()
def update_colors():
    """Update spa's brand colors"""
    spa_id = get_jwt_identity()
    data = request.json
    
    db = SessionLocal()
    try:
        settings = db.query(BrandSettings).filter_by(spa_id=spa_id).first()
        if not settings:
            settings = BrandSettings(spa_id=spa_id)
            db.add(settings)
        
        if 'primary_color' in data:
            settings.primary_color = data['primary_color']
        if 'secondary_color' in data:
            settings.secondary_color = data['secondary_color']
            
        db.commit()
        return jsonify({'message': 'Colors updated successfully'})
    finally:
        db.close()

@bp.route('/admin/upload-logo', methods=['POST'])
@jwt_required()
def upload_logo():
    """Upload spa's logo"""
    spa_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if file and allowed_file(file.filename, {'png', 'jpg', 'jpeg', 'gif'}):
        filename = secure_filename(file.filename)
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join('uploads', 'logos', spa_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # Update database
        db = SessionLocal()
        try:
            settings = db.query(BrandSettings).filter_by(spa_id=spa_id).first()
            if not settings:
                settings = BrandSettings(spa_id=spa_id)
                db.add(settings)
            
            settings.logo_url = f'/uploads/logos/{spa_id}/{filename}'
            db.commit()
            
            return jsonify({
                'message': 'Logo uploaded successfully',
                'logo_url': settings.logo_url
            })
        finally:
            db.close()
    
    return jsonify({'error': 'Invalid file type'}), 400

@bp.route('/admin/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get spa profile information"""
    spa_id = get_jwt_identity()
    
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        return jsonify({
            'business_name': client.name,
            'address': client.address,
            'city': client.city,
            'state': client.state,
            'zip_code': client.zip_code,
            'phone': client.phone,
            'email': client.email,
            'website': client.website,
            'description': client.description,
            'founded_year': client.founded_year,
            'onboarding_completed': client.onboarding_completed,
            'onboarding_step': client.onboarding_step
        })
    finally:
        db.close()

@bp.route('/admin/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update spa profile"""
    spa_id = get_jwt_identity()
    data = request.json
    
    db = SessionLocal()
    try:
        profile = db.query(SpaProfile).filter_by(spa_id=spa_id).first()
        if not profile:
            profile = SpaProfile(spa_id=spa_id)
            db.add(profile)
        
        # Update fields
        for field in ['business_name', 'address', 'city', 'state', 'zip_code', 
                     'phone', 'email', 'website', 'description', 'founded_year']:
            if field in data:
                setattr(profile, field, data[field])
        
        db.commit()
        return jsonify({'message': 'Profile updated successfully'})
    finally:
        db.close()

@bp.route('/onboarding/status', methods=['GET'])
@jwt_required()
def get_onboarding_status():
    """Get spa's onboarding status"""
    spa_id = get_jwt_identity()
    db = SessionLocal()
    try:
        profile = db.query(SpaProfile).filter_by(spa_id=spa_id).first()
        if not profile:
            return jsonify({
                'completed': False,
                'current_step': 1,
                'total_steps': 4,
                'steps': {
                    'business_info': False,
                    'services': False,
                    'calendar': False,
                    'branding': False
                }
            })
        
        # Calculate step completion
        steps_completed = {
            'business_info': bool(profile.business_name and profile.address and profile.phone),
            'services': bool(db.query(SpaService).filter_by(spa_id=spa_id).first()),
            'calendar': profile.onboarding_step > 2,
            'branding': bool(db.query(BrandSettings).filter_by(spa_id=spa_id).first())
        }
        
        return jsonify({
            'completed': profile.onboarding_completed,
            'current_step': profile.onboarding_step,
            'total_steps': 4,
            'steps': steps_completed,
            'next_step': next((i + 1 for i, (k, v) in enumerate(steps_completed.items()) if not v), None)
        })
    finally:
        db.close()

@bp.route('/onboarding/complete-step', methods=['POST'])
@jwt_required()
def complete_onboarding_step():
    """Mark current onboarding step as complete and move to next"""
    # Get spa_id from JWT claims instead of identity
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    
    # Debug logging
    print(f"\n=== Complete Onboarding Step Debug ===")
    print(f"JWT claims: {claims}")
    print(f"Spa ID from claims: {spa_id}")
    
    if not spa_id:
        print(f"No spa_id found in JWT claims")
        return jsonify({'error': 'No spa_id found in token'}), 422
    
    data = request.json
    step = data.get('step', 0)
    
    print(f"Completing step: {step}")
    
    db = SessionLocal()
    try:
        profile = db.query(SpaProfile).filter_by(spa_id=spa_id).first()
        if not profile:
            print(f"Creating new profile for spa_id: {spa_id}")
            profile = SpaProfile(spa_id=spa_id)
            db.add(profile)
        
        profile.onboarding_step = step + 1
        if step >= 4:  # All steps completed
            profile.onboarding_completed = True
        
        db.commit()
        print(f"Step completed. New step: {profile.onboarding_step}")
        return jsonify({
            'current_step': profile.onboarding_step,
            'completed': profile.onboarding_completed
        })
    except Exception as e:
        print(f"Error completing step: {str(e)}")
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@bp.route('/auth/register', methods=['POST'])
def register():
    """Register a new spa"""
    print("\n=== Registration Debug ===")
    try:
        data = request.get_json()
        print(f"Received data: {data}")
        
        if not data:
            print("No data received in request")
            return jsonify({'error': 'No data provided'}), 400
            
        required_fields = ['businessName', 'email', 'password']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            print(f"Missing required fields: {missing_fields}")
            print(f"Received fields: {list(data.keys())}")
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Validate email format
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not email_pattern.match(data['email']):
            print(f"Invalid email format: {data['email']}")
            return jsonify({'error': 'Invalid email format. Please use a valid email address (e.g., example@domain.com)'}), 400
        
        print("Creating database session...")
        db = SessionLocal()
        try:
            # Check if email already exists
            existing_user = db.query(User).filter_by(email=data['email']).first()
            if existing_user:
                print(f"Email {data['email']} already exists")
                return jsonify({'error': 'Email already registered'}), 409
                
            # Generate unique spa_id
            spa_id = str(uuid.uuid4())
            print(f"Generated spa_id: {spa_id}")
            
            # Create spa client
            print("Creating spa client...")
            spa = Client(
                spa_id=spa_id,
                name=data['businessName'],
                email=data['email'],
                subscription_plan='basic',
                subscription_status='active',
                trial_ends_at=datetime.utcnow() + timedelta(days=14),
                config={
                    'name': data['businessName'],
                    'business_hours': {
                        'weekday': {'open': '09:00', 'close': '17:00'},
                        'weekend': {'open': '10:00', 'close': '15:00'}
                    }
                },
                api_keys={},
                calendar_type='none',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(spa)
            
            # Create admin user
            print("Creating admin user...")
            password_hash = generate_password_hash(data['password'])
            user = User(
                spa_id=spa_id,
                email=data['email'],
                password_hash=password_hash,
                role='spa_admin',
                is_active=True,
                last_login=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(user)
            
            # Create initial spa profile
            print("Creating spa profile...")
            profile = SpaProfile(
                spa_id=spa_id,
                business_name=data['businessName'],
                email=data['email'],
                onboarding_completed=False,
                onboarding_step=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(profile)
            
            # Create default brand settings
            print("Creating brand settings...")
            brand_settings = BrandSettings(
                spa_id=spa_id,
                primary_color="#8CAC8D",
                secondary_color="#A7B5A0",
                font_family="Poppins",
                faqs=[],
                services=[],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(brand_settings)
            
            print("Committing to database...")
            db.commit()
            db.refresh(user)
            
            # Generate access token
            print("Generating access token...")
            access_token = create_access_token(
                identity=spa_id,
                additional_claims={
                    "user_id": str(user.id),
                    "spa_id": spa_id,
                    "requires_onboarding": True,
                    "onboarding_step": 1
                }
            )
            
            print("Registration successful")
            return jsonify({
                'message': 'Registration successful',
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'role': user.role,
                    'spa_id': spa_id
                },
                'onboarding': {
                    'required': True,
                    'current_step': 1,
                    'total_steps': 4
                }
            }), 201
            
        except Exception as e:
            print(f"Database error: {str(e)}")
            db.rollback()
            return jsonify({'error': f'Registration failed: {str(e)}'}), 500
        finally:
            db.close()
            
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@bp.route('/admin/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """Get spa's general and notification settings"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        # Get or create settings from client config
        config = client.config or {}
        
        # Set default values if not present
        if 'general' not in config:
            config['general'] = {
                'timezone': 'UTC',
                'language': 'en',
                'dateFormat': 'MM/DD/YYYY',
                'timeFormat': '12h',
                'currency': 'USD'
            }
            
        if 'notifications' not in config:
            config['notifications'] = {
                'emailNotifications': {
                    'newBookings': True,
                    'cancellations': True,
                    'reminders': True,
                    'marketing': False
                },
                'pushNotifications': {
                    'newBookings': True,
                    'cancellations': True,
                    'reminders': False
                },
                'reminderTiming': {
                    'beforeAppointment': 24,
                    'followupAfter': 48
                }
            }
            
            # Save default config if it was created
            client.config = config
            db.commit()
            
        return jsonify({
            'general': config.get('general', {}),
            'notifications': config.get('notifications', {})
        }), 200
        
    except Exception as e:
        print(f"Error fetching settings: {str(e)}")
        return jsonify({'error': 'Failed to fetch settings'}), 500
    finally:
        db.close()

@bp.route('/admin/settings/general', methods=['PUT'])
@jwt_required()
def update_general_settings():
    """Update spa's general settings"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
        
    data = request.json
    db = SessionLocal()
    
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        # Initialize config if needed
        config = client.config or {}
        if 'general' not in config:
            config['general'] = {}
            
        # Update general settings
        for field in ['timezone', 'language', 'dateFormat', 'timeFormat', 'currency']:
            if field in data:
                config['general'][field] = data[field]
                
        client.config = config
        db.commit()
        
        return jsonify({'message': 'General settings updated successfully'})
    except Exception as e:
        db.rollback()
        print(f"Error updating general settings: {str(e)}")
        return jsonify({'error': 'Failed to update general settings'}), 500
    finally:
        db.close()

@bp.route('/admin/settings/notifications', methods=['PUT'])
@jwt_required()
def update_notification_settings():
    """Update notification settings for a spa"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
        
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        data = request.get_json()
        if not data or 'type' not in data or 'field' not in data or 'value' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
            
        notification_type = data['type']
        field = data['field']
        value = data['value']
        
        # Initialize config if needed
        config = client.config or {}
        if 'notifications' not in config:
            config['notifications'] = {
                'emailNotifications': {
                    'newBookings': True,
                    'cancellations': True,
                    'reminders': True,
                    'marketing': False
                },
                'pushNotifications': {
                    'newBookings': True,
                    'cancellations': True,
                    'reminders': False
                },
                'reminderTiming': {
                    'beforeAppointment': 24,
                    'followupAfter': 48
                }
            }
            
        # Update the specific notification setting
        if notification_type not in config['notifications']:
            config['notifications'][notification_type] = {}
        config['notifications'][notification_type][field] = value
        
        client.config = config
        db.commit()
        return jsonify({'message': 'Notification settings updated successfully'}), 200
        
    except Exception as e:
        db.rollback()
        print(f"Error updating notification settings: {str(e)}")
        return jsonify({'error': 'Failed to update notification settings'}), 500
    finally:
        db.close()

@bp.route('/admin/settings/notifications/timing', methods=['PUT'])
@jwt_required()
def update_reminder_timing():
    """Update reminder timing settings for a spa"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
        
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        data = request.get_json()
        if not data or 'field' not in data or 'hours' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
            
        field = data['field']
        hours = data['hours']
        
        # Validate hours value
        if not isinstance(hours, int) or hours < 0:
            return jsonify({'error': 'Invalid hours value'}), 400
            
        # Initialize config if needed
        config = client.config or {}
        if 'notifications' not in config:
            config['notifications'] = {
                'reminderTiming': {
                    'beforeAppointment': 24,
                    'followupAfter': 48
                }
            }
        elif 'reminderTiming' not in config['notifications']:
            config['notifications']['reminderTiming'] = {
                'beforeAppointment': 24,
                'followupAfter': 48
            }
            
        # Update the reminder timing
        config['notifications']['reminderTiming'][field] = hours
        
        client.config = config
        db.commit()
        return jsonify({'message': 'Reminder timing updated successfully'}), 200
        
    except Exception as e:
        db.rollback()
        print(f"Error updating reminder timing: {str(e)}")
        return jsonify({'error': 'Failed to update reminder timing'}), 500
    finally:
        db.close()

@bp.route('/public/branding', methods=['GET'])
def get_public_branding():
    """Get public branding information for a spa"""
    try:
        spa_id = request.args.get('spa_id', 'default')
        
        db = SessionLocal()
        try:
            # Get brand settings
            brand_settings = db.query(BrandSettings).filter_by(spa_id=spa_id).first()
            
            if not brand_settings:
                return jsonify({
                    'logo_url': None,
                    'primary_color': '#8CAC8D',
                    'secondary_color': '#A7B5A0'
                })
            
            return jsonify({
                'logo_url': brand_settings.logo_url,
                'primary_color': brand_settings.primary_color,
                'secondary_color': brand_settings.secondary_color
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error fetching public branding: {str(e)}")
        return jsonify({
            'logo_url': None,
            'primary_color': '#8CAC8D',
            'secondary_color': '#A7B5A0'
        })

@bp.route('/public/chat', methods=['POST'])
@track_request_performance
def public_chat():
    """Public endpoint for chat - no authentication required"""
    try:
        data = request.json
        message = data.get('message')
        conversation_history = data.get('conversation_history', [])

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        # Generate response using OpenAI
        response = generate_response(
            message=message,
            conversation_history=conversation_history
        )

        return jsonify({
            'response': response,
            'intent': 'booking' if any(word in message.lower() for word in ['book', 'appointment', 'schedule']) else 'general'
        })

    except Exception as e:
        print(f"Error in public chat: {str(e)}")
        return jsonify({'error': 'Failed to process chat message'}), 500

@bp.route('/admin/business-profile', methods=['GET'])
@jwt_required()
def get_business_profile():
    """Get spa's business profile"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        # Get business profile from client config
        config = client.config or {}
        business_profile = config.get('business_profile', {
            'businessName': '',
            'description': '',
            'address': '',
            'phone': '',
            'email': '',
            'website': ''
        })
            
        return jsonify(business_profile), 200
        
    except Exception as e:
        print(f"Error fetching business profile: {str(e)}")
        return jsonify({'error': 'Failed to fetch business profile'}), 500
    finally:
        db.close()

@bp.route('/admin/business-profile', methods=['PUT'])
@jwt_required()
def update_business_profile():
    """Update spa's business profile"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        # Update business profile in client config
        config = client.config or {}
        business_profile = config.get('business_profile', {})
        business_profile.update(data)
        config['business_profile'] = business_profile
        client.config = config
        
        db.commit()
        return jsonify({'message': 'Business profile updated successfully'}), 200
        
    except Exception as e:
        db.rollback()
        print(f"Error updating business profile: {str(e)}")
        return jsonify({'error': 'Failed to update business profile'}), 500
    finally:
        db.close()

@bp.route('/admin/settings/validate-calendar', methods=['POST'])
@jwt_required()
def validate_calendar_settings():
    """Validate calendar connection settings"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json()
    calendar_type = data.get('calendar_type')
    calendar_settings = data.get('calendar_settings', {})
    
    try:
        # Initialize calendar integration
        calendar = CalendarIntegration(spa_id)
        
        # Test connection based on calendar type
        if calendar_type == 'google_calendar':
            # Validate Google Calendar credentials
            is_valid = calendar.validate_google_calendar(calendar_settings)
        elif calendar_type == 'acuity':
            # Validate Acuity credentials
            is_valid = calendar.validate_acuity(calendar_settings)
        elif calendar_type == 'calendly':
            # Validate Calendly credentials
            is_valid = calendar.validate_calendly(calendar_settings)
        elif calendar_type == 'custom':
            # Validate custom calendar API
            is_valid = calendar.validate_custom_calendar(calendar_settings)
        elif calendar_type == 'internal_calendar':
            # Internal calendar doesn't need validation
            is_valid = True
        else:
            return jsonify({
                'valid': False,
                'error': 'Unsupported calendar type'
            }), 400
            
        return jsonify({
            'valid': is_valid,
            'error': None if is_valid else 'Failed to validate calendar credentials'
        })
        
    except Exception as e:
        print(f"Error validating calendar: {str(e)}")
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 500

@bp.route('/admin/settings/calendar', methods=['DELETE'])
@jwt_required()
def disconnect_calendar():
    """Disconnect calendar integration"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
        
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        # Reset calendar settings
        config = client.config or {}
        if 'calendar_settings' in config:
            del config['calendar_settings']
        client.calendar_type = 'none'
        client.config = config
        
        db.commit()
        return jsonify({'message': 'Calendar disconnected successfully'})
        
    except Exception as e:
        db.rollback()
        print(f"Error disconnecting calendar: {str(e)}")
        return jsonify({'error': 'Failed to disconnect calendar'}), 500
    finally:
        db.close()

def require_super_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        user_id = claims.get('user_id')
        
        db = SessionLocal()
        try:
            # Convert user_id to integer for database query
            user = db.query(User).filter_by(id=int(user_id)).first()
            if not user or user.role != 'super_admin':
                return jsonify({'error': 'Super admin access required'}), 403
        finally:
            db.close()
            
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/admin/platform/spas', methods=['GET'])
@jwt_required()
@require_super_admin
def get_all_spas():
    """Get list of all spas (super admin only)"""
    db = SessionLocal()
    try:
        spas = db.query(Client).all()
        result = []
        
        for spa in spas:
            # Safely calculate last_active time
            last_active = None
            if spa.users:
                # Filter out None values and find max
                login_times = [user.last_login for user in spa.users if user.last_login is not None]
                if login_times:
                    last_active = max(login_times).isoformat()
            
            result.append({
                'id': spa.id,
                'spa_id': spa.spa_id,
                'name': spa.name,
                'email': spa.email,
                'subscription_plan': spa.subscription_plan or 'free',
                'subscription_status': spa.subscription_status or 'inactive',
                'created_at': spa.created_at.isoformat() if spa.created_at else None,
                'last_active': last_active
            })
        
        return jsonify(result)
    except Exception as e:
        # Log the exception for debugging
        print(f"Error in get_all_spas: {str(e)}")
        return jsonify({'error': f'Failed to fetch spas: {str(e)}'}), 500
    finally:
        db.close()

@bp.route('/admin/platform/metrics', methods=['GET'])
@jwt_required()
@require_super_admin
def get_platform_metrics():
    """Get platform-wide metrics (super admin only)"""
    db = SessionLocal()
    try:
        # Get latest metrics
        metrics = db.query(PlatformMetrics).order_by(PlatformMetrics.metrics_date.desc()).first()
        
        # Get real-time counts
        total_spas = db.query(func.count(Client.id)).scalar() or 0
        active_spas = db.query(func.count(Client.id)).filter(Client.subscription_status == 'active').scalar() or 0
        
        # Safely get metrics values with fallbacks
        total_bookings = 0
        total_revenue = 0.0
        last_updated = None
        
        if metrics:
            try:
                total_bookings = metrics.total_bookings or 0
                total_revenue = metrics.total_revenue or 0.0
                if hasattr(metrics, 'updated_at') and metrics.updated_at:
                    last_updated = metrics.updated_at.isoformat()
            except Exception as attr_err:
                print(f"Error accessing metrics attributes: {str(attr_err)}")
        
        return jsonify({
            'total_spas': total_spas,
            'active_spas': active_spas,
            'total_bookings': total_bookings,
            'total_revenue': total_revenue,
            'last_updated': last_updated
        })
    except Exception as e:
        # Log the exception for debugging
        print(f"Error in get_platform_metrics: {str(e)}")
        return jsonify({'error': f'Failed to fetch metrics: {str(e)}'}), 500
    finally:
        db.close()

@bp.route('/admin/platform/spa/<string:spa_id>', methods=['GET'])
@jwt_required()
@require_super_admin
def get_spa_details(spa_id):
    """Get detailed information about a specific spa (super admin only)"""
    db = SessionLocal()
    try:
        spa = db.query(Client).filter_by(spa_id=spa_id).first()
        if not spa:
            return jsonify({'error': 'Spa not found'}), 404
            
        return jsonify({
            'id': spa.id,
            'spa_id': spa.spa_id,
            'name': spa.name,
            'email': spa.email,
            'subscription_plan': spa.subscription_plan,
            'subscription_status': spa.subscription_status,
            'trial_ends_at': spa.trial_ends_at.isoformat() if spa.trial_ends_at else None,
            'created_at': spa.created_at.isoformat(),
            'config': spa.config,
            'users': [{
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'last_login': user.last_login.isoformat() if user.last_login else None
            } for user in spa.users],
            'profile': {
                'business_name': spa.profile.business_name if spa.profile else None,
                'address': spa.profile.address if spa.profile else None,
                'phone': spa.profile.phone if spa.profile else None,
                'onboarding_completed': spa.profile.onboarding_completed if spa.profile else False
            } if spa.profile else None
        })
    finally:
        db.close()

@bp.route('/admin/platform/spa/<string:spa_id>/suspend', methods=['POST'])
@jwt_required()
@require_super_admin
def suspend_spa(spa_id):
    """Suspend a spa's access (super admin only)"""
    db = SessionLocal()
    try:
        spa = db.query(Client).filter_by(spa_id=spa_id).first()
        if not spa:
            return jsonify({'error': 'Spa not found'}), 404
            
        spa.subscription_status = 'suspended'
        db.commit()
        
        return jsonify({'message': 'Spa suspended successfully'})
    finally:
        db.close()

@bp.route('/admin/metrics/daily', methods=['GET'])
@jwt_required()
def get_daily_metrics():
    print("\n=== Daily Metrics Request Debug ===")
    db = SessionLocal()
    try:
        # Get spa_id using the helper function
        spa_id = get_spa_id_from_request()
        
        # Get role from claims for logging
        claims = get_jwt()
        role = claims.get('role')
        
        print(f"JWT Claims: {claims}")
        print(f"Resolved Spa ID: {spa_id}")
        print(f"Role: {role}")
        print(f"Request headers: {dict(request.headers)}")
        
        if not spa_id:
            print("No spa_id found - returning empty metrics for new user")
            # Return empty metrics for new users instead of error
            return jsonify({
                "total_appointments": 0,
                "completed_appointments": 0,
                "revenue_today": 0,
                "upcoming_appointments": 0
            }), 200

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        print(f"Querying appointments between {today} and {tomorrow}")
        
        # Get all appointments for today
        appointments = db.query(Appointment).filter(
            Appointment.spa_id == spa_id,
            Appointment.appointment_datetime >= today,
            Appointment.appointment_datetime < tomorrow
        ).all()
        
        print(f"Found {len(appointments)} total appointments")
        
        # Calculate metrics
        completed = sum(1 for apt in appointments if apt.status == 'completed')
        upcoming = sum(1 for apt in appointments if apt.status == 'confirmed')
        
        # Calculate revenue (only from completed appointments with valid services)
        revenue = sum(
            apt.service.price 
            for apt in appointments 
            if apt.status == 'completed' and apt.service and apt.service.price
        )
        
        response_data = {
            'total_appointments': len(appointments),
            'completed_appointments': completed,
            'upcoming_appointments': upcoming,
            'revenue_today': revenue
        }
        
        print(f"Response data: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in get_daily_metrics: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@bp.route('/admin/appointments/today', methods=['GET'])
@jwt_required()
def get_today_appointments():
    print("\n=== Today's Appointments Request ===")
    db = SessionLocal()
    try:
        claims = get_jwt()
        spa_id = claims.get('spa_id')
        role = claims.get('role')
        
        print(f"JWT Claims: {claims}")
        print(f"Spa ID from claims: {spa_id}")
        print(f"Role: {role}")
        
        if not spa_id:
            print("No spa_id found in JWT claims - returning empty list for new user")
            # Return empty list for new users instead of error
            return jsonify([]), 200
            
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        print(f"Querying appointments between {today} and {tomorrow}")
        
        # Get all appointments for today
        appointments = db.query(Appointment).filter(
            Appointment.spa_id == spa_id,
            Appointment.appointment_datetime >= today,
            Appointment.appointment_datetime < tomorrow
        ).order_by(Appointment.appointment_datetime.asc()).all()
        
        print(f"Found {len(appointments)} appointments")
        
        response = [{
            'id': apt.id,
            'client_name': apt.client_name,
            'service': apt.service.name if apt.service else 'No service specified',
            'datetime': apt.appointment_datetime.isoformat(),
            'status': apt.status,
            'source': 'calendar' if apt.calendar_id else 'bot'
        } for apt in appointments]
        
        print(f"Response data: {response}")
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in get_today_appointments: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@bp.route('/admin/staff', methods=['GET'])
@jwt_required()
def get_staff_members():
    """Get all staff members for a spa"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    db = SessionLocal()
    try:
        staff = db.query(User).filter(
            User.spa_id == spa_id,
            User.role.in_(['staff', 'therapist'])
        ).all()
        
        return jsonify([{
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'created_at': user.created_at.isoformat()
        } for user in staff])
    finally:
        db.close()

@bp.route('/admin/staff', methods=['POST'])
@jwt_required()
def create_staff_member():
    """Create a new staff member"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.json
    if not data or not all(k in data for k in ['email', 'password', 'role']):
        return jsonify({'error': 'Missing required fields'}), 400
        
    if data['role'] not in ['staff', 'therapist']:
        return jsonify({'error': 'Invalid role'}), 400
    
    db = SessionLocal()
    try:
        # Check if email already exists
        if db.query(User).filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 409
            
        # Create new staff member
        password_hash = generate_password_hash(data['password'])
        user = User(
            spa_id=spa_id,
            email=data['email'],
            password_hash=password_hash,
            role=data['role'],
            is_active=True,
            last_login=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return jsonify({
            'message': 'Staff member created successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat()
            }
        }), 201
    finally:
        db.close()

@bp.route('/admin/staff/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_staff_member(user_id):
    """Update a staff member"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id, spa_id=spa_id).first()
        if not user:
            return jsonify({'error': 'Staff member not found'}), 404
            
        # Update allowed fields
        if 'email' in data:
            # Check if email is already taken
            existing = db.query(User).filter_by(email=data['email']).first()
            if existing and existing.id != user_id:
                return jsonify({'error': 'Email already taken'}), 409
            user.email = data['email']
            
        if 'role' in data:
            if data['role'] not in ['staff', 'therapist']:
                return jsonify({'error': 'Invalid role'}), 400
            user.role = data['role']
            
        if 'is_active' in data:
            user.is_active = data['is_active']
            
        if 'password' in data:
            user.password_hash = generate_password_hash(data['password'])
            
        user.updated_at = datetime.utcnow()
        db.commit()
        
        return jsonify({
            'message': 'Staff member updated successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'updated_at': user.updated_at.isoformat()
            }
        })
    finally:
        db.close()

@bp.route('/admin/staff/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_staff_member(user_id):
    """Delete a staff member"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id, spa_id=spa_id).first()
        if not user:
            return jsonify({'error': 'Staff member not found'}), 404
            
        db.delete(user)
        db.commit()
        
        return jsonify({'message': 'Staff member deleted successfully'})
    finally:
        db.close()

@bp.route('/admin/widget/status', methods=['GET'])
@jwt_required()
def get_widget_status():
    """Get the current status of the chat widget"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        # Get widget status from client config
        config = client.config or {}
        widget_config = config.get('widget', {})
        is_enabled = widget_config.get('enabled', False)
            
        return jsonify({'enabled': is_enabled}), 200
        
    except Exception as e:
        print(f"Error fetching widget status: {str(e)}")
        return jsonify({'error': 'Failed to fetch widget status'}), 500
    finally:
        db.close()

@bp.route('/admin/widget/toggle', methods=['POST'])
@jwt_required()
def toggle_widget():
    """Toggle the chat widget on/off"""
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    if not spa_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json()
    if not isinstance(data.get('enabled'), bool):
        return jsonify({'error': 'Missing or invalid enabled status'}), 400
    
    db = SessionLocal()
    try:
        client = db.query(Client).filter_by(spa_id=spa_id).first()
        if not client:
            return jsonify({'error': 'Spa not found'}), 404
            
        # Update widget status in client config
        config = client.config or {}
        if 'widget' not in config:
            config['widget'] = {}
        config['widget']['enabled'] = data['enabled']
        client.config = config
        
        db.commit()
        return jsonify({'message': 'Widget status updated successfully', 'enabled': data['enabled']}), 200
        
    except Exception as e:
        db.rollback()
        print(f"Error updating widget status: {str(e)}")
        return jsonify({'error': 'Failed to update widget status'}), 500
    finally:
        db.close() 

# Mock Calendar Routes for Testing
@bp.route('/mock/appointments/available', methods=['GET'])
def get_mock_available_slots():
    """Get available slots from mock calendar for testing"""
    date_str = request.args.get('date')
    duration = request.args.get('duration', 60, type=int)
    therapist_id = request.args.get('therapist_id')
    
    if not date_str:
        return jsonify({'error': 'Date is required'}), 400
        
    try:
        date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        mock_calendar = MockCalendarService()
        slots = mock_calendar.get_available_slots(date, duration, therapist_id)
        return jsonify({'slots': slots})
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    except Exception as e:
        print(f"Error getting mock slots: {str(e)}")
        return jsonify({'error': 'Failed to get available slots'}), 500

@bp.route('/mock/appointments', methods=['POST'])
def create_mock_appointment():
    """Create a mock appointment for testing"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Validate required fields
    required_fields = {
        'start_time': str,
        'duration': int,
        'customer_info': dict,
        'service_info': dict
    }

    for field, field_type in required_fields.items():
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
        if not isinstance(data[field], field_type):
            return jsonify({'error': f'Invalid type for field: {field}'}), 400

    # Validate customer information
    required_customer_info = ['name', 'email', 'phone']
    for field in required_customer_info:
        if field not in data['customer_info']:
            return jsonify({'error': f'Missing required customer information: {field}'}), 400
        if not data['customer_info'][field]:
            return jsonify({'error': f'Customer {field} cannot be empty'}), 400

    try:
        start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        
        mock_calendar = MockCalendarService()
        appointment = mock_calendar.create_appointment(
            start_time=start_time,
            duration=data['duration'],
            customer_info=data['customer_info'],
            service_info=data['service_info']
        )
        
        return jsonify(appointment), 201
        
    except ValueError as e:
        return jsonify({'error': f'Invalid datetime format: {str(e)}'}), 400
    except Exception as e:
        print(f"Error creating mock appointment: {str(e)}")
        return jsonify({'error': 'Failed to create appointment'}), 500

@bp.route('/mock/appointments/<int:appointment_id>', methods=['DELETE'])
def cancel_mock_appointment(appointment_id):
    """Cancel a mock appointment for testing"""
    try:
        mock_calendar = MockCalendarService()
        if mock_calendar.cancel_appointment(appointment_id):
            return jsonify({'message': 'Appointment cancelled successfully'}), 200
        return jsonify({'error': 'Appointment not found'}), 404
    except Exception as e:
        print(f"Error cancelling mock appointment: {str(e)}")
        return jsonify({'error': 'Failed to cancel appointment'}), 500

@bp.route('/spa/context', methods=['GET'])
@jwt_required()
def get_spa_context_route():
    """Get the spa context for the current spa."""
    try:
        # Get spa_id from JWT claims
        claims = get_jwt()
        spa_id = claims.get('spa_id')
        
        if not spa_id:
            return jsonify({"error": "No spa_id found in token"}), 400
        
        # Create UpsellService instance
        upsell_service = UpsellService(spa_id)
        
        # Get spa context
        context = upsell_service.get_spa_context()
        
        return jsonify({
            "success": True,
            "context": context
        })
    except Exception as e:
        current_app.logger.error(f"Error getting spa context: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/upsell/recommendations', methods=['POST'])
@jwt_required()
def get_upsell_recommendations():
    """Get personalized upsell recommendations for a service."""
    try:
        # Get spa_id from JWT claims
        claims = get_jwt()
        spa_id = claims.get('spa_id')
        
        if not spa_id:
            return jsonify({"error": "No spa_id found in token"}), 400
        
        # Get request data
        data = request.json
        service_type = data.get('service_type')
        customer_history = data.get('customer_history', [])
        price_sensitivity = data.get('price_sensitivity')
        
        if not service_type:
            return jsonify({"error": "service_type is required"}), 400
        
        # Create UpsellService instance
        upsell_service = UpsellService(spa_id)
        
        # Get upsell recommendations asynchronously
        recommendations = asyncio.run(upsell_service.get_personalized_upsell(
            service_type=service_type,
            customer_history=customer_history,
            price_sensitivity=price_sensitivity
        ))
        
        # Format recommendations into messages if requested
        if data.get('format_messages', False):
            formatted_recommendations = []
            for rec in recommendations:
                message = upsell_service.format_upsell_message(service_type, rec)
                formatted_recommendations.append({
                    **rec,
                    "message": message
                })
            recommendations = formatted_recommendations
        
        return jsonify({
            "success": True,
            "recommendations": recommendations
        })
    except Exception as e:
        current_app.logger.error(f"Error getting upsell recommendations: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/chatbot/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations for a spa"""
    spa_id = get_jwt_identity()
    
    db = SessionLocal()
    try:
        # Get all conversations for the spa
        conversations = db.query(ChatConversation).filter_by(spa_id=spa_id).all()
        
        result = []
        for conv in conversations:
            result.append({
                'id': conv.id,
                'session_id': conv.session_id,
                'client_name': conv.client_name,
                'client_email': conv.client_email,
                'created_at': conv.created_at.isoformat(),
                'updated_at': conv.updated_at.isoformat(),
                'message_count': len(conv.messages)
            })
            
        return jsonify(result)
    finally:
        db.close()

@bp.route('/chatbot/conversations/<int:conversation_id>', methods=['GET'])
@jwt_required()
def get_conversation(conversation_id):
    """Get a specific conversation with all messages"""
    spa_id = get_jwt_identity()
    
    db = SessionLocal()
    try:
        # Get the conversation
        conversation = db.query(ChatConversation).filter_by(
            id=conversation_id, 
            spa_id=spa_id
        ).first()
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
            
        # Get all messages for the conversation
        messages = []
        for msg in conversation.messages:
            messages.append({
                'id': msg.id,
                'content': msg.content,
                'is_user': msg.is_user,
                'timestamp': msg.timestamp.isoformat(),
                'metadata': msg.metadata
            })
            
        return jsonify({
            'id': conversation.id,
            'session_id': conversation.session_id,
            'client_name': conversation.client_name,
            'client_email': conversation.client_email,
            'created_at': conversation.created_at.isoformat(),
            'updated_at': conversation.updated_at.isoformat(),
            'messages': messages
        })
    finally:
        db.close()

@bp.route('/chatbot/message', methods=['POST'])
@jwt_required()
@track_request_performance
def chatbot_message():
    """Handle chatbot messages with conversation persistence"""
    spa_id = get_jwt_identity()
    claims = get_jwt()
    user_id = claims.get('user_id')
    
    try:
        data = request.json
        message = data.get('message')
        session_id = data.get('session_id', str(uuid.uuid4()))
        conversation_history = data.get('conversation_history', [])
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
            
        db = SessionLocal()
        try:
            # Find or create conversation
            conversation = db.query(ChatConversation).filter_by(
                session_id=session_id,
                spa_id=spa_id
            ).first()
            
            if not conversation:
                conversation = ChatConversation(
                    session_id=session_id,
                    spa_id=spa_id,
                    user_id=user_id,
                    created_at=datetime.utcnow()
                )
                db.add(conversation)
                db.flush()
                
            # Add user message to database
            user_message = ChatMessage(
                conversation_id=conversation.id,
                content=message,
                is_user=True,
                timestamp=datetime.utcnow()
            )
            db.add(user_message)
            
            # Generate response
            response = generate_response(
                message=message,
                spa_id=spa_id,
                conversation_history=conversation_history
            )
            
            # Add bot message to database
            bot_message = ChatMessage(
                conversation_id=conversation.id,
                content=response.get('response', ''),
                is_user=False,
                timestamp=datetime.utcnow(),
                metadata={'actions': response.get('actions', [])}
            )
            db.add(bot_message)
            
            # Update conversation timestamp
            conversation.updated_at = datetime.utcnow()
            db.commit()
            
            return jsonify({
                'session_id': session_id,
                'response': response.get('response', ''),
                'actions': response.get('actions', [])
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error in chatbot message: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/admin/settings/calendar', methods=['GET'])
@jwt_required()
def get_calendar_settings():
    """Get calendar integration settings"""
    try:
        claims = get_jwt()
        spa_id = claims.get('spa_id')
        
        if not spa_id:
            # Return default settings for new users
            return jsonify({
                "calendar_type": "none",
                "business_hours": {
                    "weekday": {"open": "09:00", "close": "17:00"},
                    "weekend": {"open": "10:00", "close": "16:00"}
                }
            }), 200
            
        db = SessionLocal()
        try:
            client = db.query(Client).filter_by(spa_id=spa_id).first()
            if not client:
                return jsonify({"error": "Spa not found"}), 404
                
            # Get calendar settings from client config
            config = client.config or {}
            calendar_type = config.get('calendar_type', 'none')
            
            # Return calendar settings
            return jsonify({
                "calendar_type": calendar_type,
                "business_hours": config.get('business_hours', {
                    "weekday": {"open": "09:00", "close": "17:00"},
                    "weekend": {"open": "10:00", "close": "16:00"}
                })
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error getting calendar settings: {str(e)}")
        return jsonify({"error": "Failed to get calendar settings"}), 500

@bp.route('/admin/settings/calendar', methods=['POST'])
@jwt_required()
def save_calendar_settings():
    """Save calendar integration settings"""
    try:
        claims = get_jwt()
        spa_id = claims.get('spa_id')
        
        if not spa_id:
            return jsonify({"error": "No spa_id found in token"}), 401
            
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        calendar_type = data.get('calendar_type')
        if not calendar_type:
            return jsonify({"error": "Calendar type is required"}), 400
            
        db = SessionLocal()
        try:
            client = db.query(Client).filter_by(spa_id=spa_id).first()
            if not client:
                return jsonify({"error": "Spa not found"}), 404
                
            # Update client config
            config = client.config or {}
            config['calendar_type'] = calendar_type
            
            # Update business hours
            if 'business_hours' in data:
                config['business_hours'] = data['business_hours']
                
            # Store API credentials securely if provided
            if calendar_type != 'none':
                if 'api_key' in data:
                    # Store API key securely
                    pass
                    
                # Store other settings
                for key in ['api_url', 'auth_type', 'slots_endpoint', 'slots_method', 
                           'booking_endpoint', 'booking_method', 'slots_response_path',
                           'start_time_field', 'duration_field', 'company_login']:
                    if key in data and data[key]:
                        config[key] = data[key]
            
            client.config = config
            db.commit()
            
            return jsonify({"success": True}), 200
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error saving calendar settings: {str(e)}")
        return jsonify({"error": "Failed to save calendar settings"}), 500

# Helper function to get spa_id from either JWT claims or custom header
def get_spa_id_from_request():
    """
    Gets spa_id from JWT claims or X-Spa-ID header.
    Returns spa_id if found, None otherwise.
    """
    # First check JWT claims (primary source)
    claims = get_jwt()
    spa_id = claims.get('spa_id')
    
    # If not in claims, check if it's in the sub claim
    if not spa_id and 'sub' in claims:
        spa_id = claims.get('sub')
    
    # If still not found, check custom header (backup)
    if not spa_id:
        spa_id = request.headers.get('X-Spa-ID')
        if spa_id:
            print(f"Using spa_id from X-Spa-ID header: {spa_id}")
    
    return spa_id