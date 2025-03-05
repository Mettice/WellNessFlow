from flask import Blueprint, request, jsonify
from datetime import datetime
import requests
import os
import hmac
import hashlib
import json
from models.database import SessionLocal, Appointment

webhook_bp = Blueprint('webhooks', __name__, url_prefix='/webhooks')

def verify_webhook_signature(request_data, signature, secret):
    """Verify Make.com webhook signature"""
    computed_signature = hmac.new(
        secret.encode('utf-8'),
        request_data,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed_signature, signature)

@webhook_bp.route('/make/calendar', methods=['POST'])
def handle_calendar_webhook():
    try:
        # Verify webhook signature
        signature = request.headers.get('X-Make-Signature')
        if not signature or not verify_webhook_signature(
            request.get_data(),
            signature,
            os.getenv('MAKE_WEBHOOK_SECRET')
        ):
            return jsonify({'error': 'Invalid signature'}), 401

        data = request.json
        event_type = data.get('type')
        
        if event_type == 'appointment.created':
            # Handle new appointment
            db = SessionLocal()
            try:
                appointment = Appointment(
                    spa_id=data['spa_id'],
                    client_name=data['client_name'],
                    client_email=data['client_email'],
                    client_phone=data.get('client_phone'),
                    service_id=data['service_id'],
                    therapist_id=data['therapist_id'],
                    datetime=datetime.fromisoformat(data['datetime']),
                    status='confirmed'
                )
                db.add(appointment)
                db.commit()
                
                # Trigger SMS notification via Twilio
                send_appointment_confirmation(appointment)
                
            finally:
                db.close()
                
        elif event_type == 'appointment.cancelled':
            # Handle cancellation
            db = SessionLocal()
            try:
                appointment = db.query(Appointment).filter_by(id=data['appointment_id']).first()
                if appointment:
                    appointment.status = 'cancelled'
                    db.commit()
                    
                    # Notify client about cancellation
                    send_cancellation_notification(appointment)
            finally:
                db.close()
                
        return jsonify({'status': 'success'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def send_appointment_confirmation(appointment):
    """Send confirmation SMS via Twilio"""
    try:
        # Make.com webhook for SMS notification
        webhook_url = os.getenv('MAKE_SMS_WEBHOOK_URL')
        if webhook_url:
            requests.post(webhook_url, json={
                'type': 'sms.send',
                'phone': appointment.client_phone,
                'message': f"Hi {appointment.client_name}! Your appointment at Serenity Spa is confirmed for {appointment.datetime.strftime('%B %d at %I:%M %p')}. Reply YES to confirm or NO to cancel."
            })
    except Exception as e:
        print(f"Error sending SMS: {e}")

def send_cancellation_notification(appointment):
    """Send cancellation notification"""
    try:
        webhook_url = os.getenv('MAKE_SMS_WEBHOOK_URL')
        if webhook_url:
            requests.post(webhook_url, json={
                'type': 'sms.send',
                'phone': appointment.client_phone,
                'message': f"Hi {appointment.client_name}, your appointment at Serenity Spa for {appointment.datetime.strftime('%B %d at %I:%M %p')} has been cancelled. Please call us to reschedule."
            })
    except Exception as e:
        print(f"Error sending cancellation SMS: {e}")

@webhook_bp.route('/facebook', methods=['GET', 'POST'])
def facebook_webhook():
    if request.method == 'GET':
        # Handle webhook verification from Facebook
        verify_token = request.args.get('hub.verify_token')
        if verify_token == os.getenv('FACEBOOK_VERIFY_TOKEN'):
            return request.args.get('hub.challenge')
        return 'Invalid verification token', 403

    # Handle incoming messages
    try:
        data = request.json
        
        # Verify the request is from Facebook
        signature = request.headers.get('X-Hub-Signature-256')
        if not verify_facebook_signature(request.get_data(), signature):
            return jsonify({'error': 'Invalid signature'}), 401

        # Process each entry/message
        for entry in data['entry']:
            for messaging in entry['messaging']:
                sender_id = messaging['sender']['id']
                if 'message' in messaging:
                    message_text = messaging.get('message', {}).get('text')
                    if message_text:
                        # Process message using existing chatbot logic
                        response = generate_response(
                            message=message_text,
                            conversation_history=[]  # You might want to fetch history for this user
                        )
                        
                        # Send response back to Facebook
                        send_facebook_message(sender_id, response)

        return 'OK', 200
    except Exception as e:
        print(f"Error handling Facebook message: {e}")
        return jsonify({'error': str(e)}), 500

def verify_facebook_signature(payload: bytes, signature_header: str) -> bool:
    """Verify that the webhook request came from Facebook."""
    if not signature_header:
        return False
    
    expected_signature = 'sha256=' + hmac.new(
        os.getenv('FACEBOOK_APP_SECRET').encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature_header, expected_signature)

def send_facebook_message(recipient_id: str, message_text: str):
    """Send message back to Facebook Messenger"""
    try:
        url = f"https://graph.facebook.com/v18.0/me/messages"
        payload = {
            'recipient': {'id': recipient_id},
            'message': {'text': message_text}
        }
        params = {'access_token': os.getenv('FACEBOOK_PAGE_ACCESS_TOKEN')}
        
        response = requests.post(url, json=payload, params=params)
        response.raise_for_status()
    except Exception as e:
        print(f"Error sending message to Facebook: {e}") 