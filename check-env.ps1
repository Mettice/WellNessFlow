Write-Host "Checking environment compatibility..." -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "Error: .env file not found. Please create it before running this script." -ForegroundColor Red
    exit 1
}

# Read .env file
$envContent = Get-Content .env

# Check required variables
$requiredVars = @(
    "DB_USER", 
    "DB_PASSWORD", 
    "DB_NAME", 
    "JWT_SECRET_KEY", 
    "OPENAI_API_KEY"
)

$missingVars = @()
$placeholderVars = @()

foreach ($var in $requiredVars) {
    $match = $envContent | Select-String -Pattern "^$var=(.+)$"
    
    if (-not $match) {
        $missingVars += $var
    } else {
        $value = $match.Matches.Groups[1].Value
        if ($value -match "your_|replace_this|example") {
            $placeholderVars += $var
        }
    }
}

# Display results
Write-Host "`nEnvironment Variables Check:" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

if ($missingVars.Count -gt 0) {
    Write-Host "`nMissing Variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
}

if ($placeholderVars.Count -gt 0) {
    Write-Host "`nPlaceholder Values Detected:" -ForegroundColor Yellow
    Write-Host "The following variables appear to have placeholder values and should be updated:" -ForegroundColor Yellow
    foreach ($var in $placeholderVars) {
        $match = $envContent | Select-String -Pattern "^$var=(.+)$"
        $value = $match.Matches.Groups[1].Value
        Write-Host "  - $var = $value" -ForegroundColor Yellow
    }
}

# Check Docker environment compatibility
Write-Host "`nDocker Environment Compatibility:" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Check if backend is running
$backendRunning = $false
try {
    $backendProcess = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "flask" }
    if ($backendProcess) {
        $backendRunning = $true
        Write-Host "Backend is currently running as a process" -ForegroundColor Yellow
        Write-Host "You may need to stop it before running in Docker to avoid port conflicts" -ForegroundColor Yellow
    } else {
        Write-Host "No conflicting backend process detected" -ForegroundColor Green
    }
} catch {
    Write-Host "Could not check for running backend processes" -ForegroundColor Yellow
}

# Check for port conflicts
$ports = @(5000, 80, 5432)
$conflictingPorts = @()

foreach ($port in $ports) {
    $portInUse = $false
    try {
        $netstat = netstat -ano | findstr ":$port "
        if ($netstat) {
            $portInUse = $true
            $conflictingPorts += $port
        }
    } catch {
        Write-Host "Could not check port $port" -ForegroundColor Yellow
    }
}

if ($conflictingPorts.Count -gt 0) {
    Write-Host "`nPort Conflicts Detected:" -ForegroundColor Red
    Write-Host "The following ports are already in use and may cause conflicts:" -ForegroundColor Red
    foreach ($port in $conflictingPorts) {
        Write-Host "  - Port $port" -ForegroundColor Red
        Write-Host "    Run this to find the process: netstat -ano | findstr :$port" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nNo port conflicts detected" -ForegroundColor Green
}

# Summary
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "========" -ForegroundColor Cyan

if ($missingVars.Count -eq 0 -and $placeholderVars.Count -eq 0 -and $conflictingPorts.Count -eq 0 -and -not $backendRunning) {
    Write-Host "Environment is compatible with Docker deployment" -ForegroundColor Green
    Write-Host "You can proceed with running ./deploy.ps1" -ForegroundColor Green
} else {
    Write-Host "Some issues need to be addressed before Docker deployment:" -ForegroundColor Yellow
    
    if ($missingVars.Count -gt 0) {
        Write-Host "  - Add missing environment variables to .env file" -ForegroundColor Yellow
    }
    
    if ($placeholderVars.Count -gt 0) {
        Write-Host "  - Replace placeholder values in .env file with actual values" -ForegroundColor Yellow
    }
    
    if ($conflictingPorts.Count -gt 0) {
        Write-Host "  - Resolve port conflicts by stopping services using ports: $($conflictingPorts -join ', ')" -ForegroundColor Yellow
    }
    
    if ($backendRunning) {
        Write-Host "  - Stop the currently running backend process" -ForegroundColor Yellow
    }
} 