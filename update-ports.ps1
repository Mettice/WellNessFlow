# Script to update the docker-compose.yml file to use different ports
Write-Host "Updating docker-compose.yml to use different ports..." -ForegroundColor Cyan

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "Error: docker-compose.yml file not found" -ForegroundColor Red
    exit 1
}

# Read the file
$dockerCompose = Get-Content "docker-compose.yml"

# Create a backup of the docker-compose.yml file
Copy-Item "docker-compose.yml" "docker-compose.yml.backup"
Write-Host "Created backup of docker-compose.yml at docker-compose.yml.backup" -ForegroundColor Green

# Update the ports
$updatedCompose = $dockerCompose -replace '- "80:80"', '- "8080:80"'
$updatedCompose = $updatedCompose -replace '- "5432:5432"', '- "5433:5432"'

# Write the updated content back to the file
$updatedCompose | Set-Content "docker-compose.yml"
Write-Host "Updated docker-compose.yml with new port mappings" -ForegroundColor Green

# Display the changes
Write-Host "`nPort mappings updated:" -ForegroundColor Cyan
Write-Host "- Frontend port changed from 80 to 8080" -ForegroundColor Green
Write-Host "- Database port changed from 5432 to 5433" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Run .\check-env.ps1 to verify there are no more port conflicts" -ForegroundColor Yellow
Write-Host "2. Run .\deploy.ps1 to deploy the application" -ForegroundColor Yellow
Write-Host "3. Access the application at:" -ForegroundColor Yellow
Write-Host "   - Frontend: http://localhost:8080" -ForegroundColor Yellow
Write-Host "   - Backend API: http://localhost:5000" -ForegroundColor Yellow 