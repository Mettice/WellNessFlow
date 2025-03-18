# cors_test.py

from flask import Blueprint, jsonify, request

cors_bp = Blueprint('cors', __name__, url_prefix='/cors-test')

@cors_bp.route('/')
def test_cors():
    """Endpoint for testing CORS configuration"""
    return jsonify({
        "success": True,
        "message": "CORS test passed successfully",
        "origin": request.headers.get('Origin', 'Unknown'),
        "headers_received": dict(request.headers)
    })

# Then register this blueprint in your app.py:
# from cors_test import cors_bp
# app.register_blueprint(cors_bp)