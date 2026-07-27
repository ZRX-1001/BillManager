@echo off
chcp 65001 >nul
title 记账本 - 开发模式
cd /d "%~dp0"

if not exist "node_modules" (
    echo 安装依赖中...
    call npm install
    echo.
)

echo ╔══════════════════════════════╗
echo ║  💰 记账本 开发模式 (热更新) ║
echo ╚══════════════════════════════╝
echo.
echo 修改源码后页面自动刷新。
echo 按 Ctrl+C 停止。
echo.

start "" http://localhost:5173
call npm run dev
