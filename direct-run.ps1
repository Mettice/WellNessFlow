# This script provides a menu to run the various deployment scripts directly

function Show-Menu {
    Clear-Host
    Write-Host "================ Docker Deployment Menu ================" -ForegroundColor Cyan
    Write-Host "1: Check Docker Installation" -ForegroundColor Green
    Write-Host "2: Check Environment Variables" -ForegroundColor Green
    Write-Host "3: Consolidate Environment Files" -ForegroundColor Green
    Write-Host "4: Deploy Application" -ForegroundColor Green
    Write-Host "Q: Quit" -ForegroundColor Red
    Write-Host "====================================================" -ForegroundColor Cyan
}

function Run-Script {
    param (
        [string]$ScriptPath
    )
    
    if (Test-Path $ScriptPath) {
        Write-Host "Running $ScriptPath..." -ForegroundColor Cyan
        try {
            & $ScriptPath
        }
        catch {
            Write-Host "Error running script: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Script not found: $ScriptPath" -ForegroundColor Red
    }
    
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Main loop
do {
    Show-Menu
    $selection = Read-Host "Please make a selection"
    
    switch ($selection) {
        '1' {
            Run-Script -ScriptPath "$PSScriptRoot\check-docker.ps1"
        }
        '2' {
            Run-Script -ScriptPath "$PSScriptRoot\check-env.ps1"
        }
        '3' {
            Run-Script -ScriptPath "$PSScriptRoot\consolidate-env.ps1"
        }
        '4' {
            Run-Script -ScriptPath "$PSScriptRoot\deploy.ps1"
        }
        'q' {
            return
        }
        default {
            Write-Host "Invalid selection. Please try again." -ForegroundColor Red
            Start-Sleep -Seconds 2
        }
    }
} while ($selection -ne 'q') 