Write-Host "Consolidating environment files..." -ForegroundColor Cyan

# Define all possible env file locations
$envFiles = @(
    @{Path = ".env"; Name = "Root .env"; Priority = 1},
    @{Path = "backend/.env"; Name = "Backend .env"; Priority = 2},
    @{Path = "frontend/.env"; Name = "Frontend .env"; Priority = 3},
    @{Path = ".env.example"; Name = ".env.example"; Priority = 4}
)

# Check which files exist
$existingEnvFiles = @()
foreach ($file in $envFiles) {
    if (Test-Path $file.Path) {
        $file.Exists = $true
        $file.Content = Get-Content $file.Path
        $existingEnvFiles += $file
        Write-Host "Found $($file.Name) file" -ForegroundColor Green
    } else {
        $file.Exists = $false
        Write-Host "$($file.Name) file not found" -ForegroundColor Yellow
    }
}

if ($existingEnvFiles.Count -eq 0) {
    Write-Host "No environment files found. Please create at least one .env file." -ForegroundColor Red
    exit 1
}

# Define required variables for each component
$requiredVars = @{
    Backend = @("DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET_KEY", "OPENAI_API_KEY", "LOG_LEVEL", "METRICS_API_KEY")
    Frontend = @("VITE_API_URL")
    Monitoring = @("GRAFANA_ADMIN_USER", "GRAFANA_ADMIN_PASSWORD")
}

# Create a consolidated variables dictionary
$consolidatedVars = @{}

# Function to extract variable from a file
function Get-EnvVar {
    param (
        [string]$VarName,
        [string[]]$Content
    )
    
    $match = $Content | Select-String -Pattern "^$VarName=(.+)$"
    if ($match) {
        return $match.Matches.Groups[1].Value
    }
    return $null
}

# Process files in priority order (highest priority first)
foreach ($component in @("Backend", "Frontend", "Monitoring")) {
    Write-Host "`nChecking $component variables:" -ForegroundColor Cyan
    
    foreach ($varName in $requiredVars[$component]) {
        $value = $null
        $source = "None"
        
        # Try to find the variable in each file, respecting priority
        foreach ($file in ($existingEnvFiles | Sort-Object -Property Priority)) {
            $tempValue = Get-EnvVar -VarName $varName -Content $file.Content
            if ($tempValue) {
                $value = $tempValue
                $source = $file.Name
                break
            }
        }
        
        # Store the result
        $consolidatedVars[$varName] = @{
            Value = $value
            Source = $source
            Required = $true
            Component = $component
        }
        
        # Display the result
        if ($value) {
            # Check if it's a placeholder
            if ($value -match "your_|replace_this|example") {
                Write-Host "  - $varName = $value (from $source) - PLACEHOLDER VALUE" -ForegroundColor Yellow
            } else {
                Write-Host "  - $varName = $($value.Substring(0, [Math]::Min(3, $value.Length)))*** (from $source)" -ForegroundColor Green
            }
        } else {
            Write-Host "  - $varName = NOT FOUND" -ForegroundColor Red
        }
    }
}

# Create consolidated .env file
Write-Host "`nWould you like to create a consolidated .env file? (y/n)" -ForegroundColor Yellow
$createConsolidated = Read-Host

if ($createConsolidated -eq "y") {
    $outputPath = ".env.consolidated"
    $output = @()
    
    # Group variables by component
    foreach ($component in @("Backend", "Frontend", "Monitoring")) {
        $output += "# $component Configuration"
        
        foreach ($varName in $requiredVars[$component]) {
            $var = $consolidatedVars[$varName]
            if ($var.Value) {
                $output += "$varName=$($var.Value)"
            } else {
                $output += "# $varName=MISSING_VALUE"
            }
        }
        
        $output += ""  # Add empty line between sections
    }
    
    # Write to file
    $output | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "Consolidated environment file created at $outputPath" -ForegroundColor Green
    
    # Ask if user wants to use this as the main .env file
    Write-Host "Would you like to use this as the main .env file for Docker deployment? (y/n)" -ForegroundColor Yellow
    $useAsMain = Read-Host
    
    if ($useAsMain -eq "y") {
        if (Test-Path ".env") {
            Copy-Item ".env" ".env.backup"
            Write-Host "Existing .env file backed up to .env.backup" -ForegroundColor Yellow
        }
        
        Copy-Item $outputPath ".env"
        Write-Host "Consolidated file copied to .env" -ForegroundColor Green
    }
}

# Check for missing or placeholder values
$missingVars = @()
$placeholderVars = @()

foreach ($varName in $consolidatedVars.Keys) {
    $var = $consolidatedVars[$varName]
    if (-not $var.Value) {
        $missingVars += $varName
    } elseif ($var.Value -match "your_|replace_this|example") {
        $placeholderVars += $varName
    }
}

# Summary
Write-Host "`nEnvironment Consolidation Summary:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($missingVars.Count -gt 0) {
    Write-Host "`nMissing Variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var (required for $($consolidatedVars[$var].Component))" -ForegroundColor Red
    }
}

if ($placeholderVars.Count -gt 0) {
    Write-Host "`nPlaceholder Values Detected:" -ForegroundColor Yellow
    Write-Host "The following variables have placeholder values and should be updated:" -ForegroundColor Yellow
    foreach ($var in $placeholderVars) {
        Write-Host "  - $var = $($consolidatedVars[$var].Value) (required for $($consolidatedVars[$var].Component))" -ForegroundColor Yellow
    }
}

if ($missingVars.Count -eq 0 -and $placeholderVars.Count -eq 0) {
    Write-Host "`nAll required environment variables are properly set!" -ForegroundColor Green
    Write-Host "You can proceed with Docker deployment by running ./deploy.ps1" -ForegroundColor Green
} else {
    Write-Host "`nPlease fix the missing or placeholder variables before proceeding with deployment." -ForegroundColor Yellow
    Write-Host "You can edit the .env file manually or use the consolidated file created by this script." -ForegroundColor Yellow
} 