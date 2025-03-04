from typing import Dict, List, Optional
import requests
from datetime import datetime, timedelta
import os
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.database import Appointment, Client, SessionLocal
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

class CalendarConnector:
    """
    Flexible calendar connector that can integrate with various calendar systems.
    For unknown calendar types, it expects the spa to provide their API endpoint and credentials.
    """
    def __init__(self, spa_id: str, calendar_type: str):
        self.spa_id = spa_id
        self.calendar_type = calendar_type.lower()
        
        # Get API configuration
        self.api_key = os.getenv(f'{calendar_type.upper()}_API_KEY')
        self.api_base_url = os.getenv(f'{calendar_type.upper()}_API_URL')
        
        # Known calendar types
        self.SUPPORTED_CALENDARS = {
            'none': self._handle_internal_calendar,
            'acuity': self._handle_acuity,
            'calendly': self._handle_calendly,
            'google_calendar': self._handle_google_calendar,
            'mindbody': self._handle_mindbody
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
        Expects the spa to provide their calendar API endpoint and authentication.
        """
        if not self.api_base_url or not self.api_key:
            logger.error(f"Missing API configuration for calendar type: {self.calendar_type}")
            return [] if action == 'get_slots' else False

        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            if action == 'get_slots':
                endpoint = f"{self.api_base_url}/available-slots"
                response = requests.get(
                    endpoint,
                    params={'date': data.strftime('%Y-%m-%d')},
                    headers=headers
                )
            else:  # book
                endpoint = f"{self.api_base_url}/appointments"
                response = requests.post(
                    endpoint,
                    json=data,
                    headers=headers
                )

            if response.status_code in (200, 201):
                return response.json().get('slots', []) if action == 'get_slots' else True
            else:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return [] if action == 'get_slots' else False

        except Exception as e:
            logger.error(f"Error with custom calendar API: {str(e)}")
            return [] if action == 'get_slots' else False

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
                    func.date(Appointment.datetime) == date.date()
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
                        appointment.datetime == current_slot
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
                    datetime=data['datetime'],
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