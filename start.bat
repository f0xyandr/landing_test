@echo off
if /i "%~1"=="--run" goto run
start "Lesnoy - Frontend + Backend" cmd /k ""%~f0" --run"
exit /b

:run
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing
where npm >nul 2>nul
if errorlevel 1 goto missing
node scripts\launch.cjs
exit /b %errorlevel%

:missing
echo.
echo Welcome to Lesnoy!
echo Node.js 22+ and npm are required. Install Node.js from https://nodejs.org
exit /b 1
