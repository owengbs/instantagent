#!/bin/bash

# 投资大师圆桌会议 - 自定义网络启动脚本
# 电脑IP: 10.31.40.11
# 手机IP: 10.31.107.106

echo "🚀 启动投资大师圆桌会议移动版 (自定义网络)..."

COMPUTER_IP="10.31.40.11"
PHONE_IP="10.31.107.106"

echo "💻 电脑IP: $COMPUTER_IP"
echo "📱 手机IP: $PHONE_IP"

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "⚠️  端口 $port 已被占用，正在停止..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# 测试网络连通性
echo "🔍 测试网络连通性..."
if ping -c 2 $PHONE_IP > /dev/null 2>&1; then
    echo "✅ 网络连通正常"
else
    echo "❌ 无法连接到手机IP，请检查网络设置"
    echo "💡 建议："
    echo "   1. 确认手机和电脑连接同一WiFi"
    echo "   2. 检查路由器是否启用了AP隔离"
    echo "   3. 尝试关闭防火墙"
    exit 1
fi

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

# 测试后端是否可以从外部访问
echo "🔍 测试后端外部访问..."
if curl -s http://$COMPUTER_IP:8000/docs > /dev/null; then
    echo "✅ 后端外部访问正常"
else
    echo "⚠️  后端外部访问可能有问题，但继续启动前端..."
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
echo "📱 手机浏览器访问："
echo "   http://$COMPUTER_IP:5173"
echo ""
echo "🖥️  电脑浏览器访问："
echo "   http://localhost:5173"
echo "   http://$COMPUTER_IP:5173"
echo ""
echo "🔧 后端API地址："
echo "   http://$COMPUTER_IP:8000"
echo ""
echo "🔍 网络诊断信息："
echo "   电脑IP: $COMPUTER_IP"
echo "   手机IP: $PHONE_IP"
echo "   网络连通: ✅"
echo ""
echo "📋 手机访问步骤："
echo "1. 在手机浏览器中输入: http://$COMPUTER_IP:5173"
echo "2. 首次访问允许麦克风权限"
echo "3. 可以添加到主屏幕作为PWA应用"
echo ""
echo "❓ 如果无法访问，请尝试："
echo "   • 关闭电脑防火墙"
echo "   • 检查路由器是否启用AP隔离"
echo "   • 确认手机和电脑连接同一WiFi名称"
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
