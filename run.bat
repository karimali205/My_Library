@echo off
cd /d "%~dp0"
title My Library - Local Server

echo ===================================================
echo           My Library - Local Web Server
echo ===================================================
echo.
echo Launching application in your default web browser...
start http://localhost:8000/index.html

echo.
echo Starting local web server on port 8000...
echo Press Ctrl+C at any time to stop the server.
echo.

python -m http.server 8000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python failed or not found, trying Node.js serve...
    npx --yes serve -l 8000 .
)

pause
