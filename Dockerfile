FROM python:3.11-slim

WORKDIR /app

# Install minimal dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Create instance directory
RUN mkdir -p instance && chmod 777 instance

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV FLASK_DEBUG=0
ENV PYTHONUNBUFFERED=1

# Expose port (this is just documentation, use Railway's PORT)
EXPOSE 8080

# Start Flask using gunicorn for production
CMD gunicorn --bind 0.0.0.0:$PORT app:app