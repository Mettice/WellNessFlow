FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update
RUN apt-get install -y build-essential
RUN rm -rf /var/lib/apt/lists/*

# Create instance directory for SQLite database
RUN mkdir -p instance
RUN chmod 777 instance

# Copy the entire application
COPY . /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Expose the port the app runs on (will be overridden by $PORT)
EXPOSE 5000

# Command to run the application using Gunicorn with PORT environment variable
CMD gunicorn --bind 0.0.0.0:$PORT app:app 