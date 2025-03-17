import os
import sys
from dotenv import load_dotenv
from flask import Flask, jsonify, request
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables first
load_dotenv(override=True)

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models.database import init_db, engine
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from sqlalchemy import text

def test_db_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        return False

def create_app(test_config=None):
    logger.info("Starting application creation...")
    app = Flask(__name__)
    
    # Configure CORS - More permissive for debugging
    CORS(app, 
         supports_credentials=True,
         resources={r"/*": {"origins": "*"}})

    logger.info("CORS configured")

    # Debug CORS requests
    @app.before_request
    def debug_request():
        logger.info(f"\nIncoming request: {request.method} {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")

    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin', '*')
        
        # Debug response
        logger.info(f"\nOutgoing response: {response.status}")
        
        # Set CORS headers
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Origin, Content-Type, Accept, Authorization, X-Request-With, spa-id'
        
        return response

    # Health check endpoint
    @app.route('/health')
    def health_check():
        db_status = test_db_connection()
        return jsonify({
            "status": "healthy" if db_status else "unhealthy",
            "database": "connected" if db_status else "disconnected",
            "environment": os.getenv('FLASK_ENV', 'unknown')
        })

    # Add root route for API verification
    @app.route('/')
    def root():
        return jsonify({
            "status": "success",
            "message": "WellnessFlow API is running",
            "environment": os.getenv('FLASK_ENV', 'unknown')
        })

    # Get OpenAI API key but don't fail if not available
    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        logger.warning("OpenAI API key not found in environment")
    else:
        logger.info("OpenAI API key configured")
        import openai
        openai.api_key = openai_api_key
    
    # Basic app configuration
    jwt_secret = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    logger.info("Configuring JWT")
    
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
    logger.info("JWT initialized")

    # Initialize database
    try:
        with app.app_context():
            init_db()
            test_db_connection()  # Test connection after initialization
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        # Don't fail startup, let health check endpoint report the issue

    # Register blueprints
    try:
        from api.routes import bp as api_bp
        app.register_blueprint(api_bp)
        logger.info("API routes registered")
    except Exception as e:
        logger.error(f"Failed to register blueprints: {str(e)}")

    logger.info("Application creation completed")
    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)