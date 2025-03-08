from typing import Dict, List, Optional
import requests
from datetime import datetime, timedelta
import os
import logging
from sqlalchemy import func
from models.database import Appointment, Client, SessionLocal
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from cryptography.fernet import Fernet
import base64

logger = logging.getLogger(__name__)

# Encryption key for sensitive data
# In production, this should be stored in a secure vault or environment variable
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')

class CalendarConnector:
    """
    Flexible calendar connector that can integrate with various calendar systems.
    For unknown calendar types, it expects the spa to provide their API endpoint and credentials.
    """
    def __init__(self, spa_id: str, calendar_type: str):
        self.spa_id = spa_id
        self.calendar_type = calendar_type.lower()
        
        # Get API configuration - use secure methods
        self.api_key = self._get_secure_credential(f'{calendar_type.upper()}_API_KEY')
        self.api_base_url = os.getenv(f'{calendar_type.upper()}_API_URL')
        
        # Known calendar types
        self.SUPPORTED_CALENDARS = {
            'none': self._handle_internal_calendar,
            'acuity': self._handle_acuity,
            'calendly': self._handle_calendly,
            'google_calendar': self._handle_google_calendar,
            'mindbody': self._handle_mindbody,
            'simplybook': self._handle_simplybook   
        }

    def get_available_slots(self, date: datetime) -> List[Dict]:
        """Fetch available slots from the calendar system"""
        try:
            if self.calendar_type in self.SUPPORTED_CALENDARS:
                return self.SUPPORTED_CALENDARS[self.calendar_type]('get_slots', date)
            else:
                return self._handle_custom_calendar('get_slots', date)
                
        except Exception as e:
            logger.error(f"Error fetching slots for {self.calendar_type}: {str(e)}")
            return []

    def book_appointment(self, appointment_data: Dict) -> bool:
        """Book an appointment in the calendar system"""
        try:
            if self.calendar_type in self.SUPPORTED_CALENDARS:
                return self.SUPPORTED_CALENDARS[self.calendar_type]('book', appointment_data)
            else:
                return self._handle_custom_calendar('book', appointment_data)
                
        except Exception as e:
            logger.error(f"Error booking appointment for {self.calendar_type}: {str(e)}")
            return False

    def _handle_custom_calendar(self, action: str, data: any) -> any:
        """
        Handle calendar systems that aren't directly supported.
        Uses the custom configuration provided by the spa.
        """
        # Get configuration from database
        db = SessionLocal()
        try:
            client = db.query(Client).filter_by(spa_id=self.spa_id).first()
            if not client or not client.config or 'calendar_settings' not in client.config:
                logger.error(f"Missing calendar configuration for spa: {self.spa_id}")
                return [] if action == 'get_slots' else False
            
            settings = client.config['calendar_settings']
            
            # Get authentication details
            auth_type = settings.get('auth_type', 'api_key')
            api_key = self._get_secure_credential(f'CUSTOM_API_KEY_{self.spa_id}')
            api_base_url = settings.get('api_url', '')
            
            if not api_base_url:
                logger.error(f"Missing API URL for custom calendar: {self.spa_id}")
                return [] if action == 'get_slots' else False
            
            # Set up headers based on auth type
            headers = {'Content-Type': 'application/json'}
            
            if auth_type == 'api_key':
                # API Key in header
                headers['Authorization'] = f'Bearer {api_key}'
            elif auth_type == 'basic_auth':
                # Basic Auth
                username = settings.get('username', '')
                password = self._get_secure_credential(f'CUSTOM_API_PASSWORD_{self.spa_id}')
                auth_string = base64.b64encode(f"{username}:{password}".encode()).decode()
                headers['Authorization'] = f'Basic {auth_string}'
            
            # Get endpoint and method based on action
            if action == 'get_slots':
                endpoint = settings.get('slots_endpoint', '/available-slots')
                method = settings.get('slots_method', 'GET')
                
                # Format date parameter based on settings
                date_format = settings.get('date_format', '%Y-%m-%d')
                date_param = data.strftime(date_format)
                
                # Build URL and params
                url = f"{api_base_url.rstrip('/')}{endpoint}"
                params = {settings.get('date_param_name', 'date'): date_param}
                
                # Make request
                if method == 'GET':
                    response = requests.get(url, params=params, headers=headers)
                else:
                    response = requests.post(url, json=params, headers=headers)
                
                # Process response based on format
                if response.status_code in (200, 201):
                    # Extract slots based on response mapping
                    slots_path = settings.get('slots_response_path', 'slots')
                    response_data = response.json()
                    
                    # Navigate to the slots in the response
                    slots_data = response_data
                    for key in slots_path.split('.'):
                        if key in slots_data:
                            slots_data = slots_data[key]
                        else:
                            slots_data = []
                            break
                    
                    # Map response to standard format
                    available_slots = []
                    for slot in slots_data:
                        # Map fields based on configuration
                        start_time_field = settings.get('start_time_field', 'start_time')
                        duration_field = settings.get('duration_field', 'duration')
                        
                        start_time = slot.get(start_time_field)
                        duration = slot.get(duration_field, 60)
                        
                        # Format start time if needed
                        if start_time and isinstance(start_time, str):
                            try:
                                start_time_format = settings.get('start_time_format', '')
                                if start_time_format:
                                    start_time = datetime.strptime(start_time, start_time_format).isoformat()
                            except Exception as e:
                                logger.error(f"Error formatting start time: {e}")
                        
                        available_slots.append({
                            'start_time': start_time,
                            'duration': duration,
                            'original_data': slot  # Keep original data for booking
                        })
                    
                    return available_slots
                else:
                    logger.error(f"API error: {response.status_code} - {response.text}")
                    return []
            
            # Similar logic for booking appointments
            # ...
            
        except Exception as e:
            logger.error(f"Error with custom calendar API: {str(e)}")
            return [] if action == 'get_slots' else False
        finally:
            db.close()

    def _handle_acuity(self, action: str, data: any) -> any:
        """Handle Acuity Scheduling API"""
        if not self.api_key:
            return [] if action == 'get_slots' else False
            
        try:
            if action == 'get_slots':
                response = requests.get(
                    'https://acuityscheduling.com/api/v1/availability/times',
                    params={
                        'date': data.strftime('%Y-%m-%d'),
                        'calendarID': self.spa_id
                    },
                    headers={'Authorization': f'Bearer {self.api_key}'}
                )
                
                return [
                    {
                        'time': slot['time'],
                        'duration': slot['duration'],
                        'service': slot['service']
                    }
                    for slot in (response.json() if response.status_code == 200 else [])
                ]
            else:
                response = requests.post(
                    'https://acuityscheduling.com/api/v1/appointments',
                    json=data,
                    headers={'Authorization': f'Bearer {self.api_key}'}
                )
                return response.status_code == 201
                
        except Exception as e:
            logger.error(f"Acuity API error: {str(e)}")
            return [] if action == 'get_slots' else False

    def _handle_calendly(self, action: str, data: any) -> any:
        """Handle Calendly API"""
        if not self.api_key:
            return [] if action == 'get_slots' else False
            
        try:
            if action == 'get_slots':
                response = requests.get(
                    'https://api.calendly.com/scheduled_events/available_times',
                    params={
                        'start_time': data.isoformat(),
                        'end_time': data.replace(hour=23, minute=59).isoformat()
                    },
                    headers={'Authorization': f'Bearer {self.api_key}'}
                )
                
                if response.status_code == 200:
                    return [
                        {
                            'time': slot['start_time'],
                            'duration': 60,
                            'service': data.get('service', 'Consultation')
                        }
                        for slot in response.json()['collection']
                    ]
                return []
            else:
                response = requests.post(
                    'https://api.calendly.com/scheduled_events',
                    json=data,
                    headers={'Authorization': f'Bearer {self.api_key}'}
                )
                return response.status_code == 201
                
        except Exception as e:
            logger.error(f"Calendly API error: {str(e)}")
            return [] if action == 'get_slots' else False

    def _handle_google_calendar(self, action: str, data: any) -> any:
        """Handle Google Calendar API"""
        try:
            if action == 'get_slots':
                service = build('calendar', 'v3', credentials=self._get_google_credentials())
                
                # Get start and end of day
                start_time = data.replace(hour=0, minute=0, second=0).isoformat() + 'Z'
                end_time = data.replace(hour=23, minute=59, second=59).isoformat() + 'Z'
                
                # Get busy periods
                body = {
                    'timeMin': start_time,
                    'timeMax': end_time,
                    'items': [{'id': 'primary'}]
                }
                
                events_result = service.freebusy().query(body=body).execute()
                busy_slots = events_result['calendars']['primary']['busy']
                
                # Convert busy slots to available slots
                available_slots = self._get_available_slots(busy_slots, data)
                return available_slots
                
            elif action == 'book':
                service = build('calendar', 'v3', credentials=self._get_google_credentials())
                
                event = {
                    'summary': f"Spa Appointment - {data['service']}",
                    'description': f"Client: {data['client_name']}\nPhone: {data['client_phone']}",
                    'start': {
                        'dateTime': data['datetime'].isoformat(),
                        'timeZone': 'UTC',
                    },
                    'end': {
                        'dateTime': (data['datetime'] + timedelta(minutes=data['duration'])).isoformat(),
                        'timeZone': 'UTC',
                    }
                }
                
                event = service.events().insert(calendarId='primary', body=event).execute()
                return bool(event.get('id'))
                
        except Exception as e:
            logger.error(f"Google Calendar API error: {str(e)}")
            return [] if action == 'get_slots' else False

    def _handle_mindbody(self, action: str, data: any) -> any:
        """Handle MINDBODY API"""
        # TODO: Implement MINDBODY integration
        logger.warning("MINDBODY integration not implemented yet")
        return [] if action == 'get_slots' else False

    def _handle_internal_calendar(self, action: str, data: any) -> any:
        """Handle internal calendar system"""
        db = SessionLocal()
        try:
            if action == 'get_slots':
                date = data
                # Get all appointments for this spa on this date
                appointments = db.query(Appointment).filter(
                    Appointment.spa_id == self.spa_id,
                    func.date(Appointment.appointment_datetime) == date.date()
                ).all()
                
                # Get spa's business hours
                client = db.query(Client).filter_by(spa_id=self.spa_id).first()
                if not client:
                    return []
                    
                business_hours = client.config.get('business_hours', {
                    'weekday': {'open': '09:00', 'close': '20:00'},
                    'weekend': {'open': '10:00', 'close': '18:00'}
                })
                
                # Generate available slots based on business hours and existing appointments
                # This is a simplified version - you might want to add more complex logic
                is_weekend = date.weekday() >= 5
                hours = business_hours['weekend'] if is_weekend else business_hours['weekday']
                
                open_time = datetime.strptime(hours['open'], '%H:%M').time()
                close_time = datetime.strptime(hours['close'], '%H:%M').time()
                
                current_slot = datetime.combine(date.date(), open_time)
                end_time = datetime.combine(date.date(), close_time)
                
                slots = []
                while current_slot < end_time:
                    # Check if slot is available (not booked)
                    is_available = not any(
                        appointment.appointment_datetime == current_slot
                        for appointment in appointments
                    )
                    
                    if is_available:
                        slots.append({
                            'time': current_slot.strftime('%H:%M'),
                            'duration': 60,  # Default duration
                            'service': None
                        })
                    
                    current_slot += timedelta(minutes=60)  # 1-hour slots
                
                return slots
                
            else:  # book
                # Create new appointment
                appointment = Appointment(
                    spa_id=self.spa_id,
                    client_name=data['client_name'],
                    client_email=data['client_email'],
                    client_phone=data.get('client_phone'),
                    service_id=data['service_id'],
                    appointment_datetime=data['datetime'],
                    status='confirmed'
                )
                db.add(appointment)
                db.commit()
                return True
                
        except Exception as e:
            logger.error(f"Internal calendar error: {str(e)}")
            return [] if action == 'get_slots' else False
        finally:
            db.close() 

    def _handle_simplybook(self, action: str, data: any) -> any:
        """Handle SimplyBook.me API"""
        if not self.api_key:
            return [] if action == 'get_slots' else False
        
        try:
            # Get authentication token
            company_login = os.getenv('SIMPLYBOOK_COMPANY_LOGIN')
            auth_url = 'https://user-api.simplybook.me/login'
            auth_response = requests.post(
                auth_url,
                json={
                    "jsonrpc": "2.0",
                    "method": "getToken",
                    "params": [company_login, self.api_key],
                    "id": 1
                }
            )
            
            if auth_response.status_code != 200:
                logger.error(f"SimplyBook.me authentication error: {auth_response.text}")
                return [] if action == 'get_slots' else False
            
            token = auth_response.json().get('result')
            
            # Set up headers for API calls
            headers = {
                'X-Company-Login': company_login,
                'X-Token': token,
                'Content-Type': 'application/json'
            }
            
            api_url = 'https://user-api.simplybook.me'
            
            if action == 'get_slots':
                # Get services (events)
                events_response = requests.post(
                    api_url,
                    headers=headers,
                    json={
                        "jsonrpc": "2.0",
                        "method": "getEventList",
                        "params": [],
                        "id": 2
                    }
                )
                
                if events_response.status_code != 200:
                    logger.error(f"SimplyBook.me events error: {events_response.text}")
                    return []
                
                events = events_response.json().get('result', {})
                
                # Get providers (units)
                units_response = requests.post(
                    api_url,
                    headers=headers,
                    json={
                        "jsonrpc": "2.0",
                        "method": "getUnitList",
                        "params": [],
                        "id": 3
                    }
                )
                
                if units_response.status_code != 200:
                    logger.error(f"SimplyBook.me units error: {units_response.text}")
                    return []
                
                units = units_response.json().get('result', {})
                
                # Get first working day
                date_obj = data  # This is a datetime object
                year = date_obj.year
                month = date_obj.month
                
                # Get work calendar for the month
                work_calendar_response = requests.post(
                    api_url,
                    headers=headers,
                    json={
                        "jsonrpc": "2.0",
                        "method": "getWorkCalendar",
                        "params": [year, month, None],  # None for all providers
                        "id": 4
                    }
                )
                
                if work_calendar_response.status_code != 200:
                    logger.error(f"SimplyBook.me work calendar error: {work_calendar_response.text}")
                    return []
                
                work_calendar = work_calendar_response.json().get('result', {})
                
                # Format date for API
                date_str = date_obj.strftime('%Y-%m-%d')
                
                # Get available time slots
                slots_response = requests.post(
                    api_url,
                    headers=headers,
                    json={
                        "jsonrpc": "2.0",
                        "method": "getStartTimeList",
                        "params": [date_str, None, None],  # date, service_id, provider_id
                        "id": 5
                    }
                )
                
                if slots_response.status_code != 200:
                    logger.error(f"SimplyBook.me slots error: {slots_response.text}")
                    return []
                
                time_slots = slots_response.json().get('result', [])
                
                # Format slots for our system
                available_slots = []
                for slot in time_slots:
                    slot_time = datetime.strptime(f"{date_str} {slot}", "%Y-%m-%d %H:%M")
                    available_slots.append({
                        'start_time': slot_time.isoformat(),
                        'duration': 60,  # Default duration
                        'service_id': None,
                        'provider_id': None
                    })
                
                return available_slots
                
            elif action == 'book':
                # Book appointment
                appointment_data = data
                
                # Extract data
                start_time = datetime.fromisoformat(appointment_data['datetime'])
                date_str = start_time.strftime('%Y-%m-%d')
                time_str = start_time.strftime('%H:%M')
                
                # Book appointment
                booking_response = requests.post(
                    api_url,
                    headers=headers,
                    json={
                        "jsonrpc": "2.0",
                        "method": "bookAppointment",
                        "params": [
                            date_str,
                            time_str,
                            appointment_data.get('service_id'),
                            appointment_data.get('provider_id'),
                            {
                                'name': appointment_data['client_name'],
                                'email': appointment_data.get('client_email', ''),
                                'phone': appointment_data.get('client_phone', '')
                            }
                        ],
                        "id": 6
                    }
                )
                
                if booking_response.status_code != 200:
                    logger.error(f"SimplyBook.me booking error: {booking_response.text}")
                    return False
                
                booking_result = booking_response.json().get('result')
                return bool(booking_result)
                
        except Exception as e:
            logger.error(f"SimplyBook.me API error: {str(e)}")
            return [] if action == 'get_slots' else False

    def _get_google_credentials(self) -> Credentials:
        """
        Retrieve Google OAuth2 credentials for the spa.
        This method fetches stored credentials from the database or environment.
        """
        try:
            # Get credentials from database or environment variables
            token = os.getenv('GOOGLE_CALENDAR_TOKEN')
            refresh_token = os.getenv('GOOGLE_CALENDAR_REFRESH_TOKEN')
            client_id = os.getenv('GOOGLE_CLIENT_ID')
            client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
            token_uri = 'https://oauth2.googleapis.com/token'
            
            # If we don't have the necessary credentials, try to get them from the database
            if not (token and refresh_token and client_id and client_secret):
                db = SessionLocal()
                try:
                    client = db.query(Client).filter_by(spa_id=self.spa_id).first()
                    if client and client.integrations and 'google_calendar' in client.integrations:
                        google_config = client.integrations['google_calendar']
                        token = google_config.get('token')
                        refresh_token = google_config.get('refresh_token')
                        client_id = google_config.get('client_id')
                        client_secret = google_config.get('client_secret')
                finally:
                    db.close()
            
            if not (token and refresh_token and client_id and client_secret):
                raise ValueError("Missing Google Calendar credentials")
                
            # Create and return the credentials object
            return Credentials(
                token=token,
                refresh_token=refresh_token,
                token_uri=token_uri,
                client_id=client_id,
                client_secret=client_secret,
                scopes=['https://www.googleapis.com/auth/calendar']
            )
        except Exception as e:
            logger.error(f"Error getting Google credentials: {str(e)}")
            raise

    def _get_available_slots(self, busy_slots: List[Dict], date: datetime) -> List[Dict]:
        """
        Convert busy time slots to available time slots.
        This is a helper method for Google Calendar integration.
        """
        # Define business hours (9 AM to 5 PM by default)
        business_start = date.replace(hour=9, minute=0, second=0)
        business_end = date.replace(hour=17, minute=0, second=0)
        
        # Convert busy slots to datetime objects
        busy_periods = []
        for slot in busy_slots:
            start = datetime.fromisoformat(slot['start'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(slot['end'].replace('Z', '+00:00'))
            busy_periods.append((start, end))
        
        # Sort busy periods by start time
        busy_periods.sort(key=lambda x: x[0])
        
        # Find available slots
        available_slots = []
        current_time = business_start
        
        for busy_start, busy_end in busy_periods:
            # If there's time before the busy period, it's available
            if current_time < busy_start:
                while current_time < busy_start:
                    available_slots.append({
                        'time': current_time.strftime('%H:%M'),
                        'duration': 60,  # Default 1-hour slots
                        'service': None
                    })
                    current_time += timedelta(minutes=60)
            
            # Move current time to after the busy period
            current_time = max(current_time, busy_end)
        
        # Add any remaining time after the last busy period
        while current_time < business_end:
            available_slots.append({
                'time': current_time.strftime('%H:%M'),
                'duration': 60,
                'service': None
            })
            current_time += timedelta(minutes=60)
        
        return available_slots 

    def _get_secure_credential(self, key_name: str) -> Optional[str]:
        """Securely retrieve credentials, with decryption if needed"""
        # First try environment variable
        value = os.getenv(key_name)
        
        # If not in environment, try database with decryption
        if not value:
            db = SessionLocal()
            try:
                client = db.query(Client).filter_by(spa_id=self.spa_id).first()
                if client and client.credentials and key_name in client.credentials:
                    encrypted_value = client.credentials.get(key_name)
                    if encrypted_value:
                        value = self._decrypt_value(encrypted_value)
            finally:
                db.close()
                
        return value
    
    def _encrypt_value(self, value: str) -> str:
        """Encrypt sensitive values before storage"""
        if not ENCRYPTION_KEY:
            logger.warning("No encryption key set. Storing credentials unencrypted.")
            return value
            
        try:
            f = Fernet(self._get_or_create_key())
            return f.encrypt(value.encode()).decode()
        except Exception as e:
            logger.error(f"Encryption error: {str(e)}")
            return value
    
    def _decrypt_value(self, encrypted_value: str) -> str:
        """Decrypt sensitive values after retrieval"""
        if not ENCRYPTION_KEY:
            logger.warning("No encryption key set. Using credentials as-is.")
            return encrypted_value
            
        try:
            f = Fernet(self._get_or_create_key())
            return f.decrypt(encrypted_value.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption error: {str(e)}")
            return encrypted_value
    
    def _get_or_create_key(self) -> bytes:
        """Get or create a Fernet key for encryption/decryption"""
        if ENCRYPTION_KEY:
            # Ensure the key is valid for Fernet (32 url-safe base64-encoded bytes)
            key = ENCRYPTION_KEY.encode()
            if len(base64.urlsafe_b64encode(base64.urlsafe_b64decode(key))) != 44:
                # If not properly formatted, derive a valid key
                key = base64.urlsafe_b64encode(key.ljust(32)[:32])
            return key
        else:
            # Generate a new key - this should be stored securely!
            key = Fernet.generate_key()
            logger.warning(f"Generated new encryption key: {key.decode()}. Store this securely!")
            return key 