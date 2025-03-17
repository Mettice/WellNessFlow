FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create instance directory
RUN mkdir -p instance && chmod 777 instance

# Copy the backend application
COPY backend/ .

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Default port
ENV PORT=5000

# Expose the port
EXPOSE $PORT

# Run migrations and start the application
CMD python scripts/migrate_db.py && gunicorn --bind 0.0.0.0:$PORT app:app --workers 4 --threads 2 