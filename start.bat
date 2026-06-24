@echo off
chcp 65001 >nul
title 视频解析器
cd /d "%~dp0"

echo.
echo ================================
echo   视频解析器 - 启动中...
echo ================================
echo.

:: 检查 node_modules 是否存在
if not exist "node_modules\" (
    echo [首次运行] 正在安装依赖...
    node\npm.cmd install --production --registry=https://registry.npmmirror.com
    echo.
    echo 依赖安装完成！
    echo.
)

:: 启动服务并自动打开浏览器
echo 启动服务: http://localhost:3457
start http://localhost:3457
node\node.exe server.js

pause
