# Script to update VITE_API_URL in environment files
Write-Host "Updating VITE_API_URL in environment files..." -ForegroundColor Cyan

# Check if root .env exists
if (Test-Path ".env") {
    $rootEnv = Get-Content ".env"
    
    # Update VITE_API_URL to point to the backend container
    $updatedRootEnv = $rootEnv -replace "VITE_API_URL=http://localhost:5000", "VITE_API_URL=http://backend:5000"
    
    # Write the updated content back to the file
    $updatedRootEnv | Set-Content ".env"
    Write-Host "Updated VITE_API_URL in root .env file to point to backend container" -ForegroundColor Green
} else {
    Write-Host "Warning: Root .env file not found" -ForegroundColor Yellow
}

# Check if frontend/.env exists
if (Test-Path "frontend/.env") {
    $frontendEnv = Get-Content "frontend/.env"
    
    # Check if VITE_API_URL exists in frontend/.env
    $viteApiUrlExists = $frontendEnv | Select-String -Pattern "^VITE_API_URL=" -Quiet
    
    if ($viteApiUrlExists) {
        # Update existing VITE_API_URL
        $updatedFrontendEnv = $frontendEnv -replace "VITE_API_URL=.*", "VITE_API_URL=http://backend:5000"
        $updatedFrontendEnv | Set-Content "frontend/.env"
        Write-Host "Updated VITE_API_URL in frontend/.env file" -ForegroundColor Green
    } else {
        # Add VITE_API_URL
        Add-Content "frontend/.env" "`nVITE_API_URL=http://backend:5000"
        Write-Host "Added VITE_API_URL to frontend/.env file" -ForegroundColor Green
    }
} else {
    # Create frontend/.env if it doesn't exist
    New-Item -Path "frontend/.env" -ItemType File -Force | Out-Null
    Add-Content "frontend/.env" "VITE_API_URL=http://backend:5000"
    Write-Host "Created frontend/.env file with VITE_API_URL" -ForegroundColor Green
}

Write-Host "`nImportant Note:" -ForegroundColor Yellow
Write-Host "For Docker container communication, VITE_API_URL has been set to 'http://backend:5000'" -ForegroundColor Yellow
Write-Host "This allows the frontend container to communicate with the backend container" -ForegroundColor Yellow
Write-Host "If you're running the frontend outside of Docker, you'll need to use 'http://localhost:5000' instead" -ForegroundColor Yellow

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Run .\check-env.ps1 to verify the environment variables" -ForegroundColor Yellow
Write-Host "2. Run .\deploy.ps1 to deploy the application" -ForegroundColor Yellow 