from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }
})

@app.before_request
def log_request():
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")

@app.after_request
def log_response(response):
    logger.info(f"Response: {response.status}")
    return response

@app.route('/')
def home():
    logger.info('Home endpoint called')
    return jsonify({
        'status': 'ok',
        'message': 'Debug app is running',
        'headers': dict(request.headers)
    })

@app.route('/health')
def health():
    logger.info('Health check called')
    return jsonify({
        'status': 'healthy',
        'env': os.environ.get('FLASK_ENV'),
        'port': os.environ.get('PORT'),
        'headers': dict(request.headers)
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f'Starting debug app on port {port}')
    app.run(host='0.0.0.0', port=port, debug=True) 