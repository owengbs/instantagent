#!/bin/bash

# 投资大师圆桌会议 - 移动端访问启动脚本（含WebSocket修复）

echo "🚀 启动投资大师圆桌会议移动版..."
echo "=================================="

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

# 配置前端环境变量（解决WebSocket连接问题）
echo "🔧 配置前端WebSocket连接..."
cd ../frontend

# 创建环境变量配置文件
cat > .env.development << EOF
# 移动端WebSocket连接配置
# 自动生成于 $(date)

# API基础URL（HTTP）
VITE_API_BASE_URL=http://$IP_ADDRESS:8000

# WebSocket基础URL  
VITE_WS_BASE_URL=ws://$IP_ADDRESS:8000

# 主机地址
VITE_HOST=$IP_ADDRESS:8000

# 注意：此文件由脚本自动生成，用于解决手机端WebSocket连接错误
EOF

echo "✅ 环境变量文件已创建: .env.development"
echo "   HTTP API: http://$IP_ADDRESS:8000"
echo "   WebSocket: ws://$IP_ADDRESS:8000"

# 启动前端服务
echo "🎨 启动前端服务..."
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

# 等待前端启动
sleep 8

# 检查前端是否启动成功
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ 前端服务启动成功"
else
    echo "⚠️  前端服务可能还在启动中，请稍等..."
fi

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
echo "🔌 WebSocket配置："
echo "   已自动配置为: ws://$IP_ADDRESS:8000"
echo "   解决手机端连接错误问题"
echo ""
echo "📋 使用说明："
echo "1. 确保手机和电脑连接同一个WiFi网络"
echo "2. 在手机浏览器中访问上述地址"
echo "3. 首次访问可能需要允许麦克风权限"
echo "4. 支持添加到主屏幕作为PWA应用"
echo "5. WebSocket连接已自动修复，无需额外配置"
echo ""
echo "🧪 故障排除："
echo "   如果仍有问题，访问: http://$IP_ADDRESS:5173/websocket-test"
echo "   进行连接诊断测试"
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
