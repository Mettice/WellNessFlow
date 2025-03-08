import time
import os
from functools import wraps
from flask import request, g
from logger import logger

# Dictionary to store metrics
api_metrics = {
    'requests': 0,
    'errors': 0,
    'endpoints': {},
    'response_times': []
}

# Maximum number of response times to keep
MAX_RESPONSE_TIMES = 1000

def track_request_performance(f):
    """Decorator to track API request performance"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Start timer
        start_time = time.time()
        
        # Set request start time in g
        g.start_time = start_time
        
        # Increment request counter
        api_metrics['requests'] += 1
        
        # Get endpoint
        endpoint = request.endpoint or 'unknown'
        
        # Initialize endpoint metrics if not exists
        if endpoint not in api_metrics['endpoints']:
            api_metrics['endpoints'][endpoint] = {
                'count': 0,
                'errors': 0,
                'total_time': 0,
                'avg_time': 0,
                'min_time': float('inf'),
                'max_time': 0
            }
        
        try:
            # Execute the original function
            response = f(*args, **kwargs)
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Update endpoint metrics
            api_metrics['endpoints'][endpoint]['count'] += 1
            api_metrics['endpoints'][endpoint]['total_time'] += execution_time
            api_metrics['endpoints'][endpoint]['avg_time'] = (
                api_metrics['endpoints'][endpoint]['total_time'] / 
                api_metrics['endpoints'][endpoint]['count']
            )
            
            # Update min/max times
            if execution_time < api_metrics['endpoints'][endpoint]['min_time']:
                api_metrics['endpoints'][endpoint]['min_time'] = execution_time
            if execution_time > api_metrics['endpoints'][endpoint]['max_time']:
                api_metrics['endpoints'][endpoint]['max_time'] = execution_time
            
            # Add to response times list (with limit)
            api_metrics['response_times'].append({
                'endpoint': endpoint,
                'time': execution_time,
                'status': response.status_code,
                'timestamp': time.time()
            })
            
            # Trim response times list if needed
            if len(api_metrics['response_times']) > MAX_RESPONSE_TIMES:
                api_metrics['response_times'] = api_metrics['response_times'][-MAX_RESPONSE_TIMES:]
            
            # Log performance data
            logger.info(
                f"API Request completed: endpoint={endpoint}, execution_time={execution_time:.4f}s, status_code={response.status_code}"
            )
            
            return response
            
        except Exception as e:
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Update error metrics
            api_metrics['errors'] += 1
            api_metrics['endpoints'][endpoint]['errors'] += 1
            
            # Log error
            logger.error(
                f"API Request failed: endpoint={endpoint}, execution_time={execution_time:.4f}s, error={str(e)}"
            )
            
            # Re-raise the exception
            raise
            
    return decorated_function

def get_metrics():
    """Get current API metrics"""
    return {
        'total_requests': api_metrics['requests'],
        'total_errors': api_metrics['errors'],
        'error_rate': api_metrics['errors'] / api_metrics['requests'] if api_metrics['requests'] > 0 else 0,
        'endpoints': api_metrics['endpoints'],
        'recent_response_times': api_metrics['response_times'][-10:] if api_metrics['response_times'] else []
    }

def reset_metrics():
    """Reset all metrics (for testing)"""
    global api_metrics
    api_metrics = {
        'requests': 0,
        'errors': 0,
        'endpoints': {},
        'response_times': []
    }

def export_metrics_prometheus():
    """Export metrics in Prometheus format"""
    lines = []
    
    # Total requests
    lines.append('# HELP api_total_requests Total number of API requests')
    lines.append('# TYPE api_total_requests counter')
    lines.append(f'api_total_requests {api_metrics["requests"]}')
    
    # Total errors
    lines.append('# HELP api_total_errors Total number of API errors')
    lines.append('# TYPE api_total_errors counter')
    lines.append(f'api_total_errors {api_metrics["errors"]}')
    
    # Error rate
    lines.append('# HELP api_error_rate API error rate')
    lines.append('# TYPE api_error_rate gauge')
    error_rate = api_metrics['errors'] / api_metrics['requests'] if api_metrics['requests'] > 0 else 0
    lines.append(f'api_error_rate {error_rate}')
    
    # Endpoint metrics
    lines.append('# HELP api_endpoint_requests Total requests by endpoint')
    lines.append('# TYPE api_endpoint_requests counter')
    lines.append('# HELP api_endpoint_errors Total errors by endpoint')
    lines.append('# TYPE api_endpoint_errors counter')
    lines.append('# HELP api_endpoint_avg_time Average response time by endpoint')
    lines.append('# TYPE api_endpoint_avg_time gauge')
    
    for endpoint, metrics in api_metrics['endpoints'].items():
        lines.append(f'api_endpoint_requests{{endpoint="{endpoint}"}} {metrics["count"]}')
        lines.append(f'api_endpoint_errors{{endpoint="{endpoint}"}} {metrics["errors"]}')
        lines.append(f'api_endpoint_avg_time{{endpoint="{endpoint}"}} {metrics["avg_time"]}')
    
    return '\n'.join(lines) 