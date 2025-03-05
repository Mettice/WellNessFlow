from datetime import datetime, timedelta
from typing import List, Dict, Optional
import random

class MockCalendarService:
    def __init__(self):
        self.appointments = []
        self.business_hours = {
            'weekday': {'open': '09:00', 'close': '17:00'},
            'weekend': {'open': '10:00', 'close': '15:00'}
        }
    
    def get_available_slots(
        self, 
        date: datetime,
        duration: int = 60,
        therapist_id: Optional[str] = None
    ) -> List[Dict]:
        """Get available time slots for a given date."""
        slots = []
        is_weekend = date.weekday() >= 5
        hours = self.business_hours['weekend' if is_weekend else 'weekday']
        
        start = datetime.strptime(f"{date.date()} {hours['open']}", "%Y-%m-%d %H:%M")
        end = datetime.strptime(f"{date.date()} {hours['close']}", "%Y-%m-%d %H:%M")
        
        current = start
        while current + timedelta(minutes=duration) <= end:
            if random.random() < 0.7:  # 70% chance slot is available
                slots.append({
                    'start_time': current.isoformat(),
                    'duration': duration,
                    'therapist_id': therapist_id
                })
            current += timedelta(minutes=30)
        
        return slots
    
    def create_appointment(
        self,
        start_time: datetime,
        duration: int,
        customer_info: Dict,
        service_info: Dict
    ) -> Dict:
        """Create a mock appointment."""
        appointment = {
            'id': len(self.appointments) + 1,
            'start_time': start_time.isoformat(),
            'duration': duration,
            'customer_info': customer_info,
            'service_info': service_info,
            'status': 'confirmed'
        }
        self.appointments.append(appointment)
        return appointment
    
    def cancel_appointment(self, appointment_id: int) -> bool:
        """Cancel a mock appointment."""
        for apt in self.appointments:
            if apt['id'] == appointment_id:
                apt['status'] = 'cancelled'
                return True
        return False 