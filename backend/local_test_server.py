from flask import Flask, jsonify, request
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS
origins = [
    "https://wellnessflow-git-spacontent-dions-projects-0087c2a0.vercel.app",
    "http://localhost:5174",
    "http://localhost:5173",
]

CORS(app, 
     resources={
         r"/*": {
             "origins": origins,
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Origin", "Content-Type", "Accept", "Authorization", "X-Request-With", "spa-id"],
             "expose_headers": ["Authorization"],
             "supports_credentials": True,
             "max_age": 3600
         }
     })

@app.route('/test')
def test():
    return jsonify({
        "message": "CORS test server running",
        "allowed_origins": origins
    })

@app.route('/echo', methods=['GET', 'POST', 'OPTIONS'])
def echo():
    return jsonify({
        "method": request.method,
        "headers": dict(request.headers),
        "origin": request.headers.get('Origin')
    })

if __name__ == '__main__':
    print("Starting test server on http://localhost:5001")
    print(f"Allowed origins: {origins}")
    app.run(host='0.0.0.0', port=5001, debug=True)