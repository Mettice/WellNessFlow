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
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application code
COPY backend/ .

# Create instance directory
RUN mkdir -p instance && chmod 777 instance

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV FLASK_DEBUG=1
ENV PYTHONUNBUFFERED=1
ENV GUNICORN_CMD_ARGS="--timeout 120 --log-level debug --access-logfile - --error-logfile - --capture-output --enable-stdio-inheritance"

# Expose port (Railway will set the PORT env var)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:${PORT:-5000}", "--workers", "1", "app:app"]