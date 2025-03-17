import os
import sys
from dotenv import load_dotenv
from flask import Flask, jsonify, request

# Load environment variables first
load_dotenv(override=True)

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models.database import init_db
from flask_jwt_extended import JWTManager
from flask_cors import CORS

def create_app(test_config=None):
    app = Flask(__name__)
    
    # Configure CORS
    origins = [
        "http://localhost:5000",
        "http://localhost:5173",
        "https://wellnessflow-git-spacontent-dions-projects-0087c2a0.vercel.app",
        "https://wellnessflow.vercel.app",
        "https://wellnessflow-production.up.railway.app"
        
    ]
    
    CORS(app, resources={
        r"/*": {
            "origins": origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "spa-id"],
            "expose_headers": ["Authorization"],
            "supports_credentials": True
        }
    })

    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        if origin in origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    # Add debug route to list all registered routes
    @app.route('/debug/routes')
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'path': str(rule)
            })
        return jsonify(routes)

    # Add root route for API verification
    @app.route('/')
    def root():
        return jsonify({
            "status": "success",
            "message": "WellnessFlow API is running"
        })

    # Get OpenAI API key and ensure it's available
    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        print("Warning: OpenAI API key not found in environment")
        raise ValueError("OpenAI API key not found in environment variables")
    
    if not (openai_api_key.startswith('sk-') or openai_api_key.startswith('sk-proj-')):
        print("Warning: Invalid OpenAI API key format")
        raise ValueError("OpenAI API key must start with 'sk-' or 'sk-proj-'")
    
    print(f"OpenAI API key validation:")
    print(f"- Length: {len(openai_api_key)}")
    print(f"- Format: {'Valid' if openai_api_key.startswith('sk-') or openai_api_key.startswith('sk-proj-') else 'Invalid'}")
    
    # Store API key in app config
    app.config['OPENAI_API_KEY'] = openai_api_key
    
    # Configure OpenAI client
    import openai
    openai.api_key = openai_api_key
    
    # Basic app configuration
    jwt_secret = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    print(f"\nJWT Configuration:")
    print(f"- Secret key length: {len(jwt_secret)}")
    print(f"- Using default: {'Yes' if jwt_secret == 'dev-jwt-secret' else 'No'}")
    
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

    # Initialize database
    with app.app_context():
        init_db()

    # Add error handling middleware
    @app.errorhandler(422)
    def handle_validation_error(error):
        return jsonify({
            'error': 'Invalid request data',
            'message': str(error.description)
        }), 422

    # Register blueprints
    from api.routes import bp as api_bp
    app.register_blueprint(api_bp)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)