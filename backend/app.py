import os
import sys
import logging
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import traceback

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables first
load_dotenv(override=True)

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from models.database import init_db, engine
    from flask_jwt_extended import JWTManager
    from sqlalchemy import text
    from cors_test import cors_bp
    from api import api_bp
    logger.info("All modules imported successfully")
except Exception as e:
    logger.error(f"Error importing modules: {str(e)}")
    logger.error(traceback.format_exc())
    raise

def test_db_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def create_app(test_config=None):
    logger.info("Starting application creation...")
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"Python path: {sys.path}")
    logger.info(f"Environment variables: {dict(os.environ)}")
    
    app = Flask(__name__)

    # Configure CORS
    CORS(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Origin", "Content-Type", "Accept", "Authorization", "X-Request-With", "spa-id"],
            "expose_headers": ["Authorization"],
            "supports_credentials": True
        }
    })

    logger.info("CORS configured")

    # Debug request logging
    @app.before_request
    def log_request():
        logger.info(f"Request: {request.method} {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")
        logger.info(f"Body: {request.get_data()}")

    @app.after_request
    def log_response(response):
        logger.info(f"Response Status: {response.status}")
        logger.info(f"Response Headers: {dict(response.headers)}")
        return response

    # Health check endpoint
    @app.route('/health')
    def health_check():
        try:
            db_status = test_db_connection()
            response = {
                "status": "healthy" if db_status else "unhealthy",
                "database": "connected" if db_status else "disconnected",
                "environment": os.getenv('FLASK_ENV', 'unknown'),
                "port": os.getenv('PORT', 'default'),
                "debug": app.debug,
                "cwd": os.getcwd(),
                "python_path": sys.path,
                "request_headers": dict(request.headers)
            }
            logger.info(f"Health check response: {response}")
            return jsonify(response)
        except Exception as e:
            logger.error(f"Health check error: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                "status": "error",
                "message": str(e),
                "traceback": traceback.format_exc()
            }), 500

    # Add root route for API verification
    @app.route('/')
    def root():
        return jsonify({
            "status": "success",
            "message": "WellnessFlow API is running",
            "environment": os.getenv('FLASK_ENV', 'unknown'),
            "debug": app.debug
        })

    # Get OpenAI API key but don't fail if not available
    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        logger.warning("OpenAI API key not found in environment")
        logger.warning("Chat functionality will be limited")
    else:
        try:
            logger.info("Configuring OpenAI...")
            import openai
            openai.api_key = openai_api_key
            # Test OpenAI configuration
            openai.Model.list()
            logger.info("OpenAI configuration successful")
        except Exception as e:
            logger.error(f"OpenAI configuration failed: {str(e)}")
            logger.error(traceback.format_exc())
    
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
            test_db_connection()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        logger.error(traceback.format_exc())

    # Register blueprints
    try:
        app.register_blueprint(api_bp)
        app.register_blueprint(cors_bp)
        logger.info("All blueprints registered successfully")
        logger.info(f"Available routes: {[str(rule) for rule in app.url_map.iter_rules()]}")
    except Exception as e:
        logger.error(f"Failed to register blueprints: {str(e)}")
        logger.error(traceback.format_exc())

    logger.info("Application creation completed")
    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f"Starting app on port {port}")
    app.run(host='0.0.0.0', port=port)