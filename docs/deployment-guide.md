# Spa Chat Widget Deployment Guide

This guide provides detailed instructions for deploying the Spa Chat Widget to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Railway Deployment](#railway-deployment)
5. [Vercel Deployment](#vercel-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- Docker and Docker Compose installed (for local deployment)
- Git repository access
- Railway.app account (for backend deployment)
- Vercel account (for frontend deployment)
- PostgreSQL database credentials
- OpenAI API key
- SendGrid API key (optional, for email notifications)
- Stripe API keys (optional, for payment processing)

## Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/spa-chatbot.git
   cd spa-chatbot
   ```

2. Create a `.env` file based on the `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Fill in all required environment variables in the `.env` file:
   - Database credentials
   - JWT secret key
   - OpenAI API key
   - Other service API keys

## Docker Deployment

### Local Docker Deployment

1. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

2. Initialize the database (first time only):
   ```bash
   docker-compose exec backend flask init-db
   ```

3. Access the application:
   - Frontend: http://localhost:80
   - Backend API: http://localhost:5000

### Production Docker Deployment

For production, we recommend using Docker with a container orchestration platform like Kubernetes or Docker Swarm.

1. Build production images:
   ```bash
   docker build -t yourusername/spa-backend:latest ./backend
   docker build -t yourusername/spa-frontend:latest ./frontend
   ```

2. Push to Docker registry:
   ```bash
   docker push yourusername/spa-backend:latest
   docker push yourusername/spa-frontend:latest
   ```

3. Deploy using your container orchestration platform of choice.

## Railway Deployment

### Backend Deployment on Railway

1. Create a new project in Railway.app

2. Connect your GitHub repository

3. Configure environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET_KEY`: Secure random string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `FLASK_ENV`: production
   - Other required variables from `.env.example`

4. Set up the build command:
   ```
   cd backend && pip install -r requirements.txt && gunicorn --bind 0.0.0.0:$PORT app:app
   ```

5. Deploy the application

6. Set up a PostgreSQL database service in Railway and link it to your application

### Database Migration

After deploying to Railway:

1. Access the Railway shell for your backend service
2. Run database initialization:
   ```bash
   flask init-db
   ```

## Vercel Deployment

### Frontend Deployment on Vercel

1. Create a new project in Vercel

2. Connect your GitHub repository

3. Configure build settings:
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`

4. Configure environment variables:
   - `VITE_API_URL`: Your Railway backend URL

5. Deploy the application

## Monitoring Setup

### Setting Up Prometheus and Grafana

1. Create a `monitoring` directory:
   ```bash
   mkdir -p monitoring
   ```

2. Create a `prometheus.yml` file:
   ```yaml
   global:
     scrape_interval: 15s
   
   scrape_configs:
     - job_name: 'spa-api'
       metrics_path: '/metrics'
       static_configs:
         - targets: ['backend:5000']
       bearer_token: 'your-metrics-api-key'
   ```

3. Create a `docker-compose.monitoring.yml` file:
   ```yaml
   version: '3.8'
   
   services:
     prometheus:
       image: prom/prometheus
       ports:
         - "9090:9090"
       volumes:
         - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
         - prometheus_data:/prometheus
       networks:
         - spa-network
   
     grafana:
       image: grafana/grafana
       ports:
         - "3000:3000"
       volumes:
         - grafana_data:/var/lib/grafana
       networks:
         - spa-network
   
   networks:
     spa-network:
       external: true
   
   volumes:
     prometheus_data:
     grafana_data:
   ```

4. Start monitoring services:
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

5. Access Grafana at http://localhost:3000 (default credentials: admin/admin)

6. Add Prometheus as a data source in Grafana:
   - URL: http://prometheus:9090
   - Access: Server

7. Import dashboards for API monitoring

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database credentials
   - Ensure database service is running
   - Verify network connectivity between services

2. **API Key Issues**
   - Verify OpenAI API key is valid
   - Check for API rate limiting

3. **Docker Deployment Issues**
   - Check Docker logs: `docker-compose logs -f`
   - Verify port mappings and network configuration

4. **Railway Deployment Issues**
   - Check deployment logs in Railway dashboard
   - Verify environment variables are set correctly

5. **Frontend Connection Issues**
   - Check CORS configuration
   - Verify API URL is correct in frontend environment

### Logs and Debugging

- Backend logs are stored in `logs/app.log`
- Use the `/api/health` endpoint to check API status
- Use the `/api/admin/metrics` endpoint to check API performance
- For Prometheus metrics, use the `/metrics` endpoint

## Security Considerations

1. **API Keys and Secrets**
   - Never commit API keys to the repository
   - Use environment variables for all secrets
   - Rotate keys regularly

2. **JWT Configuration**
   - Use a strong JWT secret key
   - Set appropriate token expiration times
   - Implement token refresh mechanism

3. **Database Security**
   - Use strong passwords
   - Restrict database access to application IP
   - Enable SSL for database connections

4. **Network Security**
   - Use HTTPS for all communications
   - Configure proper CORS settings
   - Implement rate limiting

## Scaling Considerations

As your application grows, consider:

1. **Horizontal Scaling**
   - Deploy multiple backend instances
   - Use a load balancer

2. **Database Scaling**
   - Implement database read replicas
   - Consider database sharding for large datasets

3. **Caching**
   - Implement Redis for caching frequent requests
   - Cache API responses where appropriate

4. **CDN Integration**
   - Use a CDN for static assets
   - Configure proper cache headers 