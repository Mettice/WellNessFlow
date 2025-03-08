import os
import sys
import uuid
from dotenv import load_dotenv
from flask import jsonify, request, g

# Load environment variables first
load_dotenv(override=True)

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models.database import init_db
from flask_jwt_extended import JWTManager, jwt_required
from flask_cors import CORS
from logger import logger, log_request_info, log_response_info, log_exception
from monitoring import get_metrics, export_metrics_prometheus

def create_app(test_config=None):
    app = Flask(__name__)
    # Configure CORS to allow all origins and methods with no restrictions
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    
    # Get OpenAI API key and ensure it's available
    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        logger.error("OpenAI API key not found in environment")
        raise ValueError("OpenAI API key not found in environment variables")
    
    if not (openai_api_key.startswith('sk-') or openai_api_key.startswith('sk-proj-')):
        logger.error("Invalid OpenAI API key format")
        raise ValueError("OpenAI API key must start with 'sk-' or 'sk-proj-'")
    
    logger.info("OpenAI API key validation successful")
    
    # Store API key in app config
    app.config['OPENAI_API_KEY'] = openai_api_key
    
    # Configure OpenAI client
    import openai
    openai.api_key = openai_api_key
    
    # Basic app configuration
    jwt_secret = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    logger.info(f"JWT Configuration initialized. Using default: {jwt_secret == 'dev-jwt-secret'}")
    
    app.config.from_mapping(
        SECRET_KEY=os.getenv('SECRET_KEY', 'dev'),
        JWT_SECRET_KEY=jwt_secret,
        JWT_TOKEN_LOCATION=['headers'],
        JWT_ACCESS_TOKEN_EXPIRES=86400,  # 24 hours
        JWT_HEADER_NAME="Authorization",
        JWT_HEADER_TYPE="Bearer"
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.update(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Initialize JWT
    jwt = JWTManager(app)
    
    # Add JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):  # noqa: F811
        logger.warning("Expired token", _payload=jwt_payload)
        return jsonify({
            'status': 401,
            'sub_status': 42,
            'message': 'The token has expired',
            'error': 'token_expired'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):  # noqa: F811
        logger.warning(f"Invalid token: {str(error)}")
        return jsonify({
            'status': 422,
            'sub_status': 42,
            'message': 'Signature verification failed',
            'error': 'invalid_token'
        }), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):  # noqa: F811
        logger.warning(f"Missing token: {str(error)}")
        return jsonify({
            'status': 401,
            'sub_status': 42,
            'message': 'Missing Authorization Header',
            'error': 'authorization_header_missing'
        }), 401
        
    @jwt.token_verification_failed_loader
    def token_verification_failed_callback():  # noqa: F811
        logger.warning("Token verification failed")
        return jsonify({
            'status': 422,
            'sub_status': 42,
            'message': 'Token verification failed',
            'error': 'token_verification_failed'
        }), 422

    # Add request ID middleware
    @app.before_request
    def before_request():
        g.request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        log_request_info()

    # Add response logging middleware
    @app.after_request
    def after_request(response):
        return log_response_info(response)

    # Add exception logging
    @app.errorhandler(Exception)
    def handle_exception(e):
        log_exception(e)
        return jsonify({
            'status': 500,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }), 500

    # Register blueprints
    from api.routes import bp
    app.register_blueprint(bp, url_prefix='/api')
    
    # Add a simple test endpoint
    @app.route('/test', methods=['GET'])
    def test():
        return jsonify({"message": "Backend server is running!"}), 200

    # Initialize database
    with app.app_context():
        init_db()

    return app

app = create_app()

# Add a simple route to list all routes
@app.route('/api/routes', methods=['GET'])
def list_routes():
    """List all available routes in the API"""
    routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            routes.append({
                'endpoint': rule.endpoint,
                'methods': [method for method in rule.methods if method not in ['HEAD', 'OPTIONS']],
                'path': str(rule)
            })
    logger.info(f"Listed {len(routes)} routes")
    return jsonify(routes)

# Add a health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'version': os.getenv('APP_VERSION', '1.0.0')
    })

# Add metrics endpoints
@app.route('/api/admin/metrics', methods=['GET'])
@jwt_required()
def api_metrics():
    """Get API metrics in JSON format (authenticated)"""
    return jsonify(get_metrics())

@app.route('/metrics', methods=['GET'])
def prometheus_metrics():
    """Get API metrics in Prometheus format"""
    # Check for metrics API key for security
    api_key = request.headers.get('X-Metrics-Key')
    if not api_key or api_key != os.getenv('METRICS_API_KEY'):
        return jsonify({'error': 'Unauthorized'}), 401
        
    return export_metrics_prometheus(), 200, {'Content-Type': 'text/plain'}

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 