# Script to run the deployment with proper error handling
Write-Host "Starting deployment process..." -ForegroundColor Cyan

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Cyan
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Error: Docker is not running. Please start Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check if environment variables are properly set
Write-Host "Checking environment variables..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content ".env"
$requiredVars = @("DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET_KEY", "OPENAI_API_KEY")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not ($envContent | Select-String -Pattern "$var=.+")) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "Error: The following required environment variables are not set:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    Write-Host "Please run .\update-env.ps1 to set these variables" -ForegroundColor Yellow
    exit 1
}

# Update VITE_API_URL for container communication
Write-Host "Updating VITE_API_URL for container communication..." -ForegroundColor Cyan
.\update-frontend-env.ps1

# Create the spa-network if it doesn't exist
Write-Host "Creating Docker network if it doesn't exist..." -ForegroundColor Cyan
$networkExists = docker network ls --filter name=spa-network -q
if (-not $networkExists) {
    docker network create spa-network
    Write-Host "Created spa-network" -ForegroundColor Green
} else {
    Write-Host "spa-network already exists" -ForegroundColor Green
}

# Build and start the containers
Write-Host "Building and starting containers..." -ForegroundColor Cyan
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check if containers are running
Write-Host "Checking container status..." -ForegroundColor Cyan
Start-Sleep -Seconds 5  # Give containers time to start
$backendRunning = docker ps --filter name=spa-backend --filter status=running -q
$frontendRunning = docker ps --filter name=spa-frontend --filter status=running -q
$dbRunning = docker ps --filter name=spa-db --filter status=running -q

if ($backendRunning -and $frontendRunning -and $dbRunning) {
    Write-Host "All containers are running" -ForegroundColor Green
} else {
    Write-Host "Some containers failed to start" -ForegroundColor Red
    docker-compose logs
    
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if ports 5000, 8080, and 5433 are available" -ForegroundColor Yellow
    Write-Host "2. Check Docker logs for more details: docker-compose logs" -ForegroundColor Yellow
    Write-Host "3. Try stopping any conflicting services and run this script again" -ForegroundColor Yellow
    exit 1
}

# Initialize the database (first time only)
Write-Host "Do you want to initialize the database? (y/n)" -ForegroundColor Yellow
$initDb = Read-Host
if ($initDb -eq "y") {
    Write-Host "Initializing database..." -ForegroundColor Cyan
    docker-compose exec backend flask init-db
    Write-Host "Database initialized" -ForegroundColor Green
}

Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan

# Ask if user wants to deploy monitoring
Write-Host "`nDo you want to deploy monitoring stack (Prometheus, Grafana, Loki)? (y/n)" -ForegroundColor Yellow
$deployMonitoring = Read-Host
if ($deployMonitoring -eq "y") {
    Write-Host "Deploying monitoring stack..." -ForegroundColor Cyan
    
    # Check if monitoring directory exists
    if (-not (Test-Path monitoring)) {
        Write-Host "Error: monitoring directory not found" -ForegroundColor Red
        exit 1
    }
    
    # Start monitoring services
    docker-compose -f docker-compose.monitoring.yml down
    docker-compose -f docker-compose.monitoring.yml up -d
    
    Write-Host "Monitoring stack deployed" -ForegroundColor Green
    Write-Host "Prometheus: http://localhost:9090" -ForegroundColor Cyan
    Write-Host "Grafana: http://localhost:3000 (default credentials: admin/admin)" -ForegroundColor Cyan
    Write-Host "Loki: http://localhost:3100" -ForegroundColor Cyan
} 