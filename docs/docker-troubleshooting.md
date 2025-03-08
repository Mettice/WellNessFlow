# Docker Troubleshooting Guide

This guide addresses common issues encountered when deploying the Spa Chat Widget using Docker.

## Environment Variables

### Issue: Missing Environment Variables

**Error:**
```
The "DB_USER" variable is not set. Defaulting to a blank string.
The "DB_PASSWORD" variable is not set. Defaulting to a blank string.
The "DB_NAME" variable is not set. Defaulting to a blank string.
```

**Solution:**
1. Create a `.env` file in the root directory of the project
2. Copy the contents from `.env.example`
3. Fill in all required values
4. Make sure the `.env` file is in the same directory as your `docker-compose.yml` file

## Docker Connection Issues

### Issue: Docker Desktop Not Running

**Error:**
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/...": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Solution:**
1. Start Docker Desktop application
2. Wait for Docker Desktop to fully initialize
3. Verify Docker is running with `docker info` command
4. Try running `docker-compose up -d` again

### Issue: Docker Network Not Found

**Error:**
```
network spa-network not found
```

**Solution:**
1. Create the network manually: `docker network create spa-network`
2. Run `docker-compose up -d` again

## Docker Compose Version Issues

### Issue: Version Attribute Obsolete

**Warning:**
```
the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
```

**Solution:**
1. Edit your `docker-compose.yml` file
2. Remove the `version: '3.8'` line at the top
3. Save the file and run `docker-compose up -d` again

## Container Build Issues

### Issue: Build Fails for Backend Container

**Solution:**
1. Try building just the backend: `docker-compose build backend`
2. Check the error messages for specific issues
3. Verify that all required files are present in the backend directory
4. Check that the Dockerfile is correctly formatted

### Issue: Build Fails for Frontend Container

**Solution:**
1. Try building just the frontend: `docker-compose build frontend`
2. Check the error messages for specific issues
3. Verify that all required files are present in the frontend directory
4. Check that the Dockerfile is correctly formatted

## Database Connection Issues

### Issue: Backend Can't Connect to Database

**Error:**
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not connect to server: Connection refused
```

**Solution:**
1. Verify the database container is running: `docker ps | grep spa-db`
2. Check database logs: `docker-compose logs db`
3. Verify environment variables are correctly set in `.env` file
4. Try restarting the containers: `docker-compose restart`

## Port Conflicts

### Issue: Port Already in Use

**Error:**
```
Bind for 0.0.0.0:5000 failed: port is already allocated
```

**Solution:**
1. Find the process using the port: 
   - Windows: `netstat -ano | findstr :5000`
   - Linux/Mac: `lsof -i :5000`
2. Stop the process or change the port in `docker-compose.yml`
3. Run `docker-compose up -d` again

## Volume Mounting Issues

### Issue: Volume Mount Fails

**Solution:**
1. Check if the directory exists on the host machine
2. Verify permissions on the directory
3. Try using absolute paths in the volume definition
4. Restart Docker Desktop

## Running the Troubleshooting Script

We've provided a troubleshooting script to help diagnose Docker issues:

```powershell
# Run the Docker status check script
./check-docker.ps1
```

This script will:
1. Verify Docker is installed and running
2. Check Docker Compose installation
3. List all Docker networks, volumes, images, and containers

## Using the Deployment Script

For a guided deployment process, use our deployment script:

```powershell
# Run the deployment script
./deploy.ps1
```

This script will:
1. Check for the `.env` file
2. Verify Docker is running
3. Create the required network
4. Build and start all containers
5. Verify containers are running
6. Optionally initialize the database
7. Optionally deploy the monitoring stack

## Getting Additional Help

If you continue to experience issues after trying these solutions, please:

1. Collect the output of `docker-compose logs`
2. Run `./check-docker.ps1` and save the output
3. Contact support with these logs for further assistance 