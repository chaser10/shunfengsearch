@echo off
chcp 65001 >nul

echo 🚀 顺丰快递批量查询系统 - 快速启动
echo ==================================

REM 检查Node.js
echo 📋 检查环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js ^(^>= 16.0.0^)
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%

REM 检查npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 npm
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm 版本: %NPM_VERSION%

REM 安装依赖
echo.
echo 📦 安装依赖...
npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo ✅ 依赖安装完成

REM 检查环境变量文件
echo.
echo 🔧 检查配置...
if not exist ".env" (
    echo 📝 创建环境变量文件...
    copy .env.example .env >nul
    echo ✅ 已创建 .env 文件
    echo.
    echo ⚠️  重要提示：
    echo    请编辑 .env 文件，填入您的顺丰API配置信息
    echo    如果没有API配置，系统将使用模拟数据进行演示
    echo.
) else (
    echo ✅ 环境变量文件已存在
)

REM 启动开发服务器
echo.
echo 🎯 启动开发服务器...
echo    应用将在 http://localhost:3000 启动
echo    按 Ctrl+C 停止服务器
echo.

npm start
