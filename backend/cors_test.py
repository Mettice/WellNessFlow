from flask import Blueprint, jsonify, request
import logging

logger = logging.getLogger(__name__)

cors_bp = Blueprint('cors', __name__, url_prefix='/cors-test')

@cors_bp.route('/', methods=['GET', 'OPTIONS'])
def test_cors():
    """Endpoint for testing CORS configuration"""
    logger.info(f"CORS Test Request - Method: {request.method}")
    logger.info(f"CORS Test Headers: {dict(request.headers)}")
    
    return jsonify({
        "success": True,
        "message": "CORS test passed successfully",
        "origin": request.headers.get('Origin', 'Unknown'),
        "method": request.method,
        "headers_received": dict(request.headers)
    })

@cors_bp.route('/echo', methods=['GET', 'POST', 'OPTIONS'])
def echo():
    """Echo endpoint that returns request details"""
    return jsonify({
        "success": True,
        "method": request.method,
        "headers": dict(request.headers),
        "data": request.get_json() if request.is_json else None,
        "args": dict(request.args),
        "origin": request.headers.get('Origin', 'Unknown')
    }) 