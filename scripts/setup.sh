#!/bin/bash

# 顺丰快递批量查询系统 - 快速启动脚本

echo "🚀 顺丰快递批量查询系统 - 快速启动"
echo "=================================="

# 检查Node.js版本
echo "📋 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js (>= 16.0.0)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ 错误: Node.js 版本过低，当前版本: $NODE_VERSION，要求版本: >= $REQUIRED_VERSION"
    exit 1
fi

echo "✅ Node.js 版本: $NODE_VERSION"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm 版本: $NPM_VERSION"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 检查环境变量文件
echo ""
echo "🔧 检查配置..."
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件"
    echo ""
    echo "⚠️  重要提示："
    echo "   请编辑 .env 文件，填入您的顺丰API配置信息"
    echo "   如果没有API配置，系统将使用模拟数据进行演示"
    echo ""
else
    echo "✅ 环境变量文件已存在"
fi

# 启动开发服务器
echo ""
echo "🎯 启动开发服务器..."
echo "   应用将在 http://localhost:3000 启动"
echo "   按 Ctrl+C 停止服务器"
echo ""

npm start
