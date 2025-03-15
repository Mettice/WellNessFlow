FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy backend directory
COPY backend/ .

# Install Python dependencies
RUN pip install -r requirements.txt

# Create instance directory
RUN mkdir -p instance && chmod 777 instance

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Expose the port
EXPOSE $PORT

# Run the application
CMD gunicorn --bind 0.0.0.0:$PORT app:app 