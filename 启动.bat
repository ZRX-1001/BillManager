@echo off
title Expense Tracker
cd /d "%~dp0"

echo ============================
echo   Expense Tracker Launcher
echo ============================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo Please install Node.js: https://nodejs.org
    pause
    exit /b 1
)
echo Node.js:
node -v
echo.

if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Check your network.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Dependencies OK.
)

echo.
if not exist "dist" (
    echo [2/2] Building...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
) else (
    echo [2/2] Build OK.
)

echo.
echo Starting server at http://localhost:4173 ...
start "ExpenseTracker" /min cmd /c "cd /d "%~dp0" && node server.cjs"
timeout /t 2 /nobreak >nul
start http://localhost:4173
echo Done.
pause
exit
