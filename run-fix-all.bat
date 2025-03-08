@echo off
echo Starting environment and port fixes...
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0update-env.ps1"
echo.
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0update-ports.ps1"
echo.
echo All fixes applied. Press any key to continue...
pause 