Write-Host "Checking Docker status..." -ForegroundColor Cyan

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    $dockerInfo = docker info
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "Docker Compose is installed: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker Compose is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "All Docker components are ready" -ForegroundColor Green

# List Docker networks
Write-Host "`nDocker Networks:" -ForegroundColor Cyan
docker network ls

# List Docker volumes
Write-Host "`nDocker Volumes:" -ForegroundColor Cyan
docker volume ls

# List Docker images
Write-Host "`nDocker Images:" -ForegroundColor Cyan
docker images

# List Docker containers
Write-Host "`nDocker Containers:" -ForegroundColor Cyan
docker ps -a 