@echo off
echo Running Docker check script...
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0check-docker.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo Error running PowerShell script. Error code: %ERRORLEVEL%
    echo Try running the script directly with: 
    echo.
    echo     .\check-docker.ps1
    echo.
    echo Or with full path:
    echo.
    echo     %~dp0check-docker.ps1
)
pause 