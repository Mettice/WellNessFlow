from datetime import datetime
from typing import Dict, List
from api.integrations.calendar_connector import CalendarConnector
from models.database import SessionLocal, Client
import requests
import base64

class CalendarIntegration:
    def __init__(self, spa_id: str):
        self.spa_id = spa_id
        self._init_calendar_connector()

    def _init_calendar_connector(self):
        """Initialize the appropriate calendar connector based on spa settings"""
        db = SessionLocal()
        try:
            # Get spa's calendar settings from database
            client = db.query(Client).filter_by(spa_id=self.spa_id).first()
            calendar_type = client.config.get('calendar_type', 'none') if client else 'none'
            
            self.connector = CalendarConnector(self.spa_id, calendar_type)
        finally:
            db.close()

    def get_available_slots(self, date: datetime) -> List[Dict]:
        """Get available appointment slots for a given date"""
        return self.connector.get_available_slots(date)

    def book_appointment(self, appointment_data: Dict) -> bool:
        """Book an appointment slot"""
        return self.connector.book_appointment(appointment_data)

    def validate_acuity(self, settings: Dict) -> bool:
        """Validate Acuity Scheduling credentials"""
        try:
            api_key = settings.get('api_key')
            if not api_key:
                raise ValueError("API key is required for Acuity integration")

            # Make a real API call to Acuity to validate the key
            # Split User ID and API key
            user_id, api_key = api_key.split(':') if ':' in api_key else ('', api_key)
            
            # Create the Basic Auth header
            credentials = base64.b64encode(f"{user_id}:{api_key}".encode()).decode()
            headers = {
                'Authorization': f'Basic {credentials}',
                'Accept': 'application/json'
            }
            
            print(f"Attempting to validate Acuity credentials...")
            print(f"User ID: {user_id}")
            print(f"Using endpoint: https://acuityscheduling.com/api/v1/availability/dates")
            
            # First try to get appointment types
            types_response = requests.get(
                'https://acuityscheduling.com/api/v1/appointment-types',
                headers=headers
            )
            
            print(f"Appointment types response status: {types_response.status_code}")
            if types_response.status_code == 200:
                appointment_types = types_response.json()
                if appointment_types:
                    appointment_type_id = appointment_types[0]['id']
                else:
                    appointment_type_id = None
            else:
                appointment_type_id = None
            
            # Then check availability
            response = requests.get(
                'https://acuityscheduling.com/api/v1/availability/dates',
                headers=headers,
                params={
                    'month': datetime.now().strftime('%Y-%m'),
                    'appointmentTypeID': appointment_type_id or 1
                }
            )
            
            print(f"Availability response status: {response.status_code}")
            if response.status_code != 200:
                print(f"Response content: {response.text}")
            
            if response.status_code == 401:
                raise ValueError("Invalid Acuity credentials - please check your User ID and API key")
            elif response.status_code == 403:
                raise ValueError("Access forbidden - please verify API access is enabled in your Acuity account")
            elif response.status_code != 200:
                raise ValueError(f"Acuity API error {response.status_code}: {response.text}")

            return True
        except ValueError as ve:
            print(f"Acuity validation error: {str(ve)}")
            return False
        except Exception as e:
            print(f"Acuity validation error: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            return False

    def validate_calendly(self, settings: Dict) -> bool:
        """Validate Calendly credentials"""
        try:
            api_key = settings.get('api_key')
            if not api_key:
                raise ValueError("API key is required for Calendly integration")

            # Test the API key by making a simple request
            response = self.connector._handle_calendly('get_slots', datetime.now())
            return isinstance(response, list)
        except Exception as e:
            print(f"Calendly validation error: {str(e)}")
            return False

    def validate_google_calendar(self, settings: Dict) -> bool:
        """Validate Google Calendar credentials"""
        try:
            # Test connection by attempting to fetch slots
            response = self.connector._handle_google_calendar('get_slots', datetime.now())
            return isinstance(response, list)
        except Exception as e:
            print(f"Google Calendar validation error: {str(e)}")
            return False

    def validate_custom_calendar(self, settings: Dict) -> bool:
        """Validate custom calendar API"""
        try:
            api_key = settings.get('api_key')
            api_url = settings.get('api_url')
            
            if not api_key or not api_url:
                raise ValueError("API key and URL are required for custom calendar integration")

            # Test the connection by making a simple request
            response = self.connector._handle_custom_calendar('get_slots', datetime.now())
            return isinstance(response, list)
        except Exception as e:
            print(f"Custom calendar validation error: {str(e)}")
            return False 