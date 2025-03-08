Write-Host "Starting deployment process..." -ForegroundColor Cyan

# Check if environment files exist and offer to consolidate them
$envFiles = @(".env", "backend/.env", "frontend/.env", ".env.example")
$existingEnvFiles = $envFiles | Where-Object { Test-Path $_ }

if ($existingEnvFiles.Count -gt 1) {
    Write-Host "Multiple environment files detected:" -ForegroundColor Yellow
    foreach ($file in $existingEnvFiles) {
        Write-Host "  - $file" -ForegroundColor Yellow
    }
    
    Write-Host "Would you like to consolidate these environment files? (y/n)" -ForegroundColor Yellow
    $consolidate = Read-Host
    
    if ($consolidate -eq "y") {
        Write-Host "Running environment consolidation script..." -ForegroundColor Cyan
        & ./consolidate-env.ps1
        
        # Check if the consolidated file was created and set as main
        if (-not (Test-Path ".env")) {
            Write-Host "Error: .env file not found after consolidation. Please create it manually." -ForegroundColor Red
            exit 1
        }
    }
} elseif ($existingEnvFiles.Count -eq 0) {
    Write-Host "No environment files found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "Created .env file from .env.example. Please edit it with your actual values." -ForegroundColor Green
        Write-Host "Press any key to continue after editing the .env file..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Host "Error: .env.example file not found. Please create a .env file manually." -ForegroundColor Red
        exit 1
    }
}

# Check if required environment variables are set
$envContent = Get-Content .env
$requiredVars = @("DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET_KEY", "OPENAI_API_KEY")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not ($envContent -match "$var=.+")) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "Warning: The following required environment variables are not set in .env:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Yellow
    }
    Write-Host "Please edit the .env file to set these variables." -ForegroundColor Yellow
    Write-Host "Press any key to continue after editing the .env file..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Check Docker status
Write-Host "Checking Docker status..." -ForegroundColor Cyan
try {
    $dockerInfo = docker info
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check for running backend processes that might conflict
Write-Host "Checking for conflicting processes..." -ForegroundColor Cyan
$ports = @(5000, 80, 5432)
$conflictingPorts = @()

foreach ($port in $ports) {
    try {
        $netstat = netstat -ano | findstr ":$port "
        if ($netstat) {
            $conflictingPorts += $port
        }
    } catch {
        Write-Host "Could not check port $port" -ForegroundColor Yellow
    }
}

if ($conflictingPorts.Count -gt 0) {
    Write-Host "Warning: The following ports are already in use and may cause conflicts:" -ForegroundColor Yellow
    foreach ($port in $conflictingPorts) {
        Write-Host "  - Port $port" -ForegroundColor Yellow
    }
    Write-Host "Do you want to continue anyway? (y/n)" -ForegroundColor Yellow
    $continue = Read-Host
    
    if ($continue -ne "y") {
        Write-Host "Deployment aborted. Please free up the required ports and try again." -ForegroundColor Red
        exit 1
    }
}

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
$backendRunning = docker ps --filter name=spa-backend --filter status=running -q
$frontendRunning = docker ps --filter name=spa-frontend --filter status=running -q
$dbRunning = docker ps --filter name=spa-db --filter status=running -q

if ($backendRunning -and $frontendRunning -and $dbRunning) {
    Write-Host "All containers are running" -ForegroundColor Green
} else {
    Write-Host "Some containers failed to start" -ForegroundColor Red
    docker-compose logs
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

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:80" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan

# Ask if user wants to deploy monitoring
Write-Host "Do you want to deploy monitoring stack (Prometheus, Grafana, Loki)? (y/n)" -ForegroundColor Yellow
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