@echo off
title 记账本
cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
)
if not exist "dist" (
    echo [2/2] Building...
    call npm run build
)

echo Starting server...
start "记账本" /min cmd /c "cd /d "%~dp0" && node server.cjs"
timeout /t 2 /nobreak >nul
start http://localhost:4173
echo Done.
exit
