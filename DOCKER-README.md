# Docker Deployment Guide for Spa Chat Widget

This guide provides instructions for deploying the Spa Chat Widget using Docker, with special attention to preserving your existing environment variables.

## Quick Start

For the easiest deployment experience, simply run:

```
run-menu.bat
```

This will open an interactive menu where you can:
1. Check Docker Installation
2. Check Environment Variables
3. Consolidate Environment Files
4. Deploy Application

## Prerequisites

- Docker Desktop installed and running
- PowerShell (for Windows users)
- Git repository cloned locally

## Available Scripts

We've provided several scripts to help with the deployment process:

1. **check-docker.ps1**: Checks if Docker is properly installed and running
2. **check-env.ps1**: Checks if your environment variables are properly configured
3. **consolidate-env.ps1**: Consolidates environment variables from multiple .env files
4. **deploy.ps1**: Deploys the application using Docker Compose
5. **direct-run.ps1**: Interactive menu to run all scripts

For easier execution, we've also included batch file wrappers:
- **run-menu.bat**: Opens the interactive menu (recommended)
- **run-docker-check.bat**: Runs the Docker check script
- **run-check-env.bat**: Runs the environment check script
- **run-consolidate-env.bat**: Runs the environment consolidation script
- **run-deploy.bat**: Runs the deployment script

## Deployment Steps

### 1. Check Docker Installation

First, make sure Docker is properly installed and running:

```
run-docker-check.bat
```

or if using PowerShell directly:

```powershell
.\check-docker.ps1
```

This script will:
- Verify Docker is installed
- Check if Docker is running
- List Docker networks, volumes, images, and containers

### 2. Consolidate Environment Variables

If you have multiple environment files (root .env, backend/.env, frontend/.env), you can consolidate them:

```
run-consolidate-env.bat
```

or if using PowerShell directly:

```powershell
.\consolidate-env.ps1
```

This script will:
- Check all environment files in the project
- Extract variables based on priority (root > backend > frontend > example)
- Create a consolidated .env file with all required variables
- Optionally set this as the main .env file for deployment

### 3. Deploy the Application

Once your environment is ready, deploy the application:

```
run-deploy.bat
```

or if using PowerShell directly:

```powershell
.\deploy.ps1
```

This script will:
- Check for multiple environment files and offer to consolidate them
- Verify required environment variables are set
- Check for port conflicts
- Create the required Docker network
- Build and start all containers
- Verify containers are running
- Optionally initialize the database
- Optionally deploy the monitoring stack

## Troubleshooting PowerShell Script Execution

If you encounter issues running the PowerShell scripts directly, try one of these solutions:

1. **Use the interactive menu** by running `run-menu.bat` (recommended)
2. **Run from the root directory** of the project
3. **Use the dot-source method** in PowerShell:
   ```powershell
   . .\check-docker.ps1
   ```
4. **Set the execution policy** temporarily:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```

## Environment Variables

The application requires several environment variables to function properly:

### Backend Variables
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `JWT_SECRET_KEY`: Secret key for JWT authentication
- `OPENAI_API_KEY`: OpenAI API key for chat functionality
- `LOG_LEVEL`: Logging level (INFO, DEBUG, etc.)
- `METRICS_API_KEY`: API key for metrics endpoint

### Frontend Variables
- `VITE_API_URL`: URL of the backend API

### Monitoring Variables
- `GRAFANA_ADMIN_USER`: Grafana admin username
- `GRAFANA_ADMIN_PASSWORD`: Grafana admin password

## Using Existing Environment Variables

The deployment process is designed to preserve your existing environment variables:

1. If you have multiple .env files, the consolidation script will prioritize variables in this order:
   - Root .env file
   - Backend .env file
   - Frontend .env file
   - .env.example file

2. The deployment script will check for missing required variables and prompt you to add them.

3. You can choose whether to use the consolidated environment file or keep your existing setup.

## Troubleshooting

If you encounter issues during deployment, refer to the troubleshooting guide:

```
docs/docker-troubleshooting.md
```

This guide covers common issues such as:
- Missing environment variables
- Docker connection issues
- Port conflicts
- Container build failures
- Database connection problems

## Accessing the Application

After successful deployment, you can access the application at:

- Frontend: http://localhost:80
- Backend API: http://localhost:5000
- Monitoring (if deployed):
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3000 (default credentials: admin/admin)
  - Loki: http://localhost:3100 