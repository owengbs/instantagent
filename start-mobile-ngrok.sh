#!/bin/bash

# 投资大师圆桌会议 - ngrok公网访问启动脚本

echo "🌐 启动投资大师圆桌会议 - ngrok公网访问模式..."

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
check_port 4040  # ngrok web界面端口

# 停止可能的ngrok进程
pkill -f ngrok 2>/dev/null || true

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

# 检查前端是否启动成功
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ 前端服务启动成功"
else
    echo "❌ 前端服务启动失败"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

# 启动ngrok隧道 - 前端
echo "🌐 启动ngrok隧道..."
cd ..
ngrok http 5173 --log=stdout &
NGROK_PID=$!

# 等待ngrok启动
sleep 3

# 获取ngrok公网地址
echo "🔍 获取ngrok地址..."
NGROK_URL=""
for i in {1..10}; do
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep https | cut -d'"' -f4 | head -1)
    if [ ! -z "$NGROK_URL" ]; then
        break
    fi
    sleep 1
done

if [ -z "$NGROK_URL" ]; then
    echo "❌ 无法获取ngrok地址，请检查ngrok是否正常启动"
    echo "💡 可以手动访问 http://localhost:4040 查看ngrok状态"
else
    echo ""
    echo "🎉 所有服务启动完成！"
    echo ""
    echo "📱 手机访问地址（公网）："
    echo "   $NGROK_URL"
    echo ""
    echo "🖥️  电脑访问地址（本地）："
    echo "   http://localhost:5173"
    echo ""
    echo "🔧 后端API地址："
    echo "   http://localhost:8000"
    echo ""
    echo "📊 ngrok管理面板："
    echo "   http://localhost:4040"
    echo ""
    echo "📋 使用说明："
    echo "1. 手机可以直接访问上述公网地址"
    echo "2. 无需连接同一WiFi网络"
    echo "3. 首次访问需要允许麦克风权限"
    echo "4. 支持添加到主屏幕作为PWA应用"
    echo ""
    echo "⚠️  注意："
    echo "   • ngrok免费版有连接数限制"
    echo "   • 每次重启地址会变化"
    echo "   • 适合开发测试使用"
    echo ""
fi

echo "🛑 按 Ctrl+C 停止所有服务"

# 创建清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止所有服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill $NGROK_PID 2>/dev/null || true
    
    # 停止ngrok进程
    pkill -f ngrok 2>/dev/null || true
    
    # 确保端口被释放
    sleep 2
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    lsof -ti:4040 | xargs kill -9 2>/dev/null || true
    
    echo "✅ 所有服务已停止"
    exit 0
}

# 捕获中断信号
trap cleanup INT TERM

# 保持脚本运行并显示实时状态
echo ""
echo "📊 服务状态监控（每30秒更新）："
while true; do
    sleep 30
    echo "[$(date '+%H:%M:%S')] 服务运行中... (ngrok: $NGROK_URL)"
done
