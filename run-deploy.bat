@echo off
echo Starting deployment process...
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0run-deploy.ps1"
pause 