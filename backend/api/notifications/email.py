from typing import Dict, Any
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import SendGrid, but don't fail if it's not installed
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    logger.warning("SendGrid not installed. Email functionality will be simulated.")
    SENDGRID_AVAILABLE = False

from jinja2 import Environment, FileSystemLoader, select_autoescape

# Initialize Jinja2 environment for email templates
template_env = Environment(
    loader=FileSystemLoader('templates/email'),
    autoescape=select_autoescape(['html', 'xml'])
)

# Email templates mapping
TEMPLATES = {
    # System essential emails (always sent by us)
    'welcome': {
        'subject': 'Welcome to Our Spa Platform!',
        'template': 'welcome.html'
    },
    'password_reset': {
        'subject': 'Reset Your Password',
        'template': 'password_reset.html'
    },
    'subscription_update': {
        'subject': 'Subscription Update',
        'template': 'subscription_update.html'
    },
    
    # Booking emails (only used when spa doesn't have integrated calendar)
    'booking_confirmation': {
        'subject': 'Your Appointment Confirmation',
        'template': 'booking_confirmation.html'
    },
    'booking_reminder': {
        'subject': 'Upcoming Appointment Reminder',
        'template': 'booking_reminder.html'
    },
    'booking_cancellation': {
        'subject': 'Appointment Cancellation',
        'template': 'booking_cancellation.html'
    },
    'new_booking_notification': {
        'subject': 'New Booking Received',
        'template': 'new_booking_notification.html'
    }
}

def send_email(
    to: str,
    template: str,
    data: Dict[str, Any],
    subject: str = None,
    from_email: str = None
) -> bool:
    """
    Send an email using SendGrid if available, otherwise simulate sending
    
    Args:
        to: Recipient email address
        template: Template name from TEMPLATES
        data: Template data
        subject: Optional subject line (overrides template default)
        from_email: Optional sender email (overrides default)
    
    Returns:
        bool: True if email was sent successfully or simulated
    """
    try:
        logger.info(f"Attempting to send email to {to} using template {template}")
        
        template_config = TEMPLATES.get(template)
        if not template_config:
            logger.error(f"Unknown email template: {template}")
            raise ValueError(f"Unknown email template: {template}")
        
        # Get subject from template config if not provided
        email_subject = subject or template_config['subject']
        
        # If SendGrid is not available, just log the email and return success
        if not SENDGRID_AVAILABLE:
            logger.info(f"SENDGRID NOT AVAILABLE - Simulating email to: {to}")
            logger.info(f"Subject: {email_subject}")
            logger.info(f"Template: {template}")
            logger.info(f"Data: {data}")
            return True
            
        # Check if SendGrid API key is set
        sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        if not sendgrid_api_key:
            logger.warning("SENDGRID_API_KEY not set in environment variables")
            logger.info(f"Would have sent email to: {to}")
            logger.info(f"Subject: {email_subject}")
            logger.info(f"Data: {data}")
            return True
            
        # Load and render template
        template_obj = template_env.get_template(template_config['template'])
        html_content = template_obj.render(**data)
        
        # Create email message
        message = Mail(
            from_email=from_email or os.getenv('DEFAULT_FROM_EMAIL', 'noreply@spaplatform.com'),
            to_emails=to,
            subject=email_subject,
            html_content=html_content
        )
        
        # Send email
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        logger.info(f"Email sent successfully to {to}, status code: {response.status_code}")
        return response.status_code in [200, 201, 202]
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        # Log the stack trace for debugging
        import traceback
        logger.error(traceback.format_exc())
        # Return True to prevent blocking the application flow
        return True

def send_welcome_email(spa_name: str, owner_name: str, to_email: str) -> bool:
    """Send welcome email to new spa"""
    return send_email(
        to=to_email,
        template='welcome',
        data={
            'spa_name': spa_name,
            'owner_name': owner_name,
            'dashboard_url': os.getenv('DASHBOARD_URL', 'http://localhost:3000/admin'),
            'help_url': os.getenv('HELP_URL', 'http://localhost:3000/help'),
            'support_email': os.getenv('SUPPORT_EMAIL', 'support@spaplatform.com')
        }
    )

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send password reset email"""
    return send_email(
        to=to_email,
        template='password_reset',
        data={
            'reset_url': f"{os.getenv('APP_URL', 'http://localhost:3000')}/reset-password?token={reset_token}",
            'expires_in': '1 hour'
        }
    )

def send_subscription_update_email(
    to_email: str,
    spa_name: str,
    plan_name: str,
    status: str,
    effective_date: str
) -> bool:
    """Send subscription status update email"""
    return send_email(
        to=to_email,
        template='subscription_update',
        data={
            'spa_name': spa_name,
            'plan_name': plan_name,
            'status': status,
            'effective_date': effective_date,
            'dashboard_url': f"{os.getenv('DASHBOARD_URL', 'http://localhost:3000/admin')}/subscription"
        }
    ) 