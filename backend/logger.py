import os
import json
import logging
import traceback
from datetime import datetime
from logging.handlers import RotatingFileHandler
from flask import request, has_request_context, g as flask_g

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Configure logger
logger = logging.getLogger('spa_app')
logger.setLevel(logging.INFO)

# Set log level from environment variable
log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
logger.setLevel(getattr(logging, log_level))

# Create console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create file handler for rotating logs
file_handler = RotatingFileHandler(
    'logs/app.log', 
    maxBytes=10485760,  # 10MB
    backupCount=10
)
file_handler.setLevel(logging.INFO)

# Create JSON formatter
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add request information if available
        try:
            if has_request_context() and hasattr(flask_g, 'request_id'):
                log_record['request_id'] = flask_g.request_id
        except (RuntimeError, ImportError):
            # Handle case when outside of application context
            pass
            
        if request:
            try:
                log_record['request'] = {
                    'method': request.method,
                    'path': request.path,
                    'remote_addr': request.remote_addr,
                    'user_agent': request.user_agent.string if request.user_agent else None
                }
            except:
                pass
                
        # Add exception info if available
        if record.exc_info:
            log_record['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }
            
        # Add extra fields from record
        for key, value in record.__dict__.items():
            if key.startswith('_') and not key.startswith('__'):
                log_record[key[1:]] = value
                
        return json.dumps(log_record)

# Set formatter for handlers
json_formatter = JsonFormatter()
console_handler.setFormatter(json_formatter)
file_handler.setFormatter(json_formatter)

# Add handlers to logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)

def log_request_info():
    """Log request information as middleware"""
    if not request.path.startswith('/static'):
        logger.info(f"Request: {request.method} {request.path}")

def log_response_info(response):
    """Log response information as middleware"""
    if not request.path.startswith('/static'):
        logger.info(f"Response: {response.status_code}")
    return response

def log_exception(exception):
    """Log exception information"""
    logger.error(f"Exception: {str(exception)}", exc_info=True) 