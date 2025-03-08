# Script to update the main .env file with values from backend/.env
Write-Host "Updating .env file with values from backend/.env..." -ForegroundColor Cyan

# Check if both files exist
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found in root directory" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "backend/.env")) {
    Write-Host "Error: backend/.env file not found" -ForegroundColor Red
    exit 1
}

# Read the files
$mainEnv = Get-Content ".env"
$backendEnv = Get-Content "backend/.env"

# Extract values from backend/.env
$jwtSecret = ($backendEnv | Select-String -Pattern "^JWT_SECRET_KEY=(.+)$").Matches.Groups[1].Value
$openaiKey = ($backendEnv | Select-String -Pattern "^OPENAI_API_KEY=(.+)$").Matches.Groups[1].Value

# Check if values were found
if (-not $jwtSecret) {
    Write-Host "Warning: JWT_SECRET_KEY not found in backend/.env" -ForegroundColor Yellow
} else {
    Write-Host "Found JWT_SECRET_KEY in backend/.env" -ForegroundColor Green
}

if (-not $openaiKey) {
    Write-Host "Warning: OPENAI_API_KEY not found in backend/.env" -ForegroundColor Yellow
} else {
    Write-Host "Found OPENAI_API_KEY in backend/.env" -ForegroundColor Green
}

# Create a backup of the main .env file
Copy-Item ".env" ".env.before-update"
Write-Host "Created backup of .env at .env.before-update" -ForegroundColor Green

# Update the main .env file
$updatedEnv = $mainEnv

# Update JWT_SECRET_KEY if found
if ($jwtSecret) {
    $updatedEnv = $updatedEnv -replace "JWT_SECRET_KEY=your_jwt_secret_key", "JWT_SECRET_KEY=$jwtSecret"
    $updatedEnv = $updatedEnv -replace "JWT_SECRET_KEY=your_jwt_secret_key_replace_this_with_a_secure_random_string", "JWT_SECRET_KEY=$jwtSecret"
}

# Update OPENAI_API_KEY if found
if ($openaiKey) {
    $updatedEnv = $updatedEnv -replace "OPENAI_API_KEY=your_openai_api_key", "OPENAI_API_KEY=$openaiKey"
}

# Set a secure password for the database
$dbPassword = "postgres_" + [Guid]::NewGuid().ToString().Substring(0, 8)
$updatedEnv = $updatedEnv -replace "DB_PASSWORD=your_secure_password", "DB_PASSWORD=$dbPassword"

# Generate a metrics API key if needed
$metricsKey = "metrics_" + [Guid]::NewGuid().ToString()
$updatedEnv = $updatedEnv -replace "METRICS_API_KEY=your_metrics_api_key", "METRICS_API_KEY=$metricsKey"

# Write the updated content back to the file
$updatedEnv | Set-Content ".env"
Write-Host "Updated .env file with values from backend/.env" -ForegroundColor Green

# Display the changes
Write-Host "`nEnvironment variables updated:" -ForegroundColor Cyan
if ($jwtSecret) {
    Write-Host "- JWT_SECRET_KEY: Updated with value from backend/.env" -ForegroundColor Green
}
if ($openaiKey) {
    Write-Host "- OPENAI_API_KEY: Updated with value from backend/.env" -ForegroundColor Green
}
Write-Host "- DB_PASSWORD: Set to a secure random value" -ForegroundColor Green
Write-Host "- METRICS_API_KEY: Set to a secure random value" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Run .\check-env.ps1 to verify the environment variables" -ForegroundColor Yellow
Write-Host "2. Resolve port conflicts (80 and 5432) before deployment" -ForegroundColor Yellow
Write-Host "3. Run .\deploy.ps1 to deploy the application" -ForegroundColor Yellow 