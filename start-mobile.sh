#!/bin/bash

# 投资大师圆桌会议 - 移动端访问启动脚本

echo "🚀 启动投资大师圆桌会议移动版..."

# 获取本机IP地址
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$IP_ADDRESS" ]; then
    echo "❌ 无法获取IP地址，请检查网络连接"
    exit 1
fi

echo "📱 本机IP地址: $IP_ADDRESS"

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "⚠️  端口 $port 已被占用，正在停止..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# 停止现有服务
echo "🛑 停止现有服务..."
check_port 8000
check_port 5173

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend
source venv/bin/activate
python3 main.py &
BACKEND_PID=$!

# 等待后端启动
sleep 5

# 检查后端是否启动成功
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# 启动前端服务
echo "🎨 启动前端服务..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
sleep 8

# 显示访问信息
echo ""
echo "🎉 服务启动完成！"
echo ""
echo "📱 手机访问地址："
echo "   http://$IP_ADDRESS:5173"
echo ""
echo "🖥️  电脑访问地址："
echo "   http://localhost:5173"
echo ""
echo "🔧 后端API地址："
echo "   http://$IP_ADDRESS:8000"
echo ""
echo "📋 使用说明："
echo "1. 确保手机和电脑连接同一个WiFi网络"
echo "2. 在手机浏览器中访问上述地址"
echo "3. 首次访问可能需要允许麦克风权限"
echo "4. 支持添加到主屏幕作为PWA应用"
echo ""
echo "🛑 按 Ctrl+C 停止所有服务"

# 创建清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    
    # 确保端口被释放
    sleep 2
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    
    echo "✅ 服务已停止"
    exit 0
}

# 捕获中断信号
trap cleanup INT TERM

# 保持脚本运行
wait
