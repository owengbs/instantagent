#!/bin/bash

# 投资大师圆桌会议 - 高级ngrok公网访问启动脚本
# 支持ngrok 2.x和3.x版本，自动配置文件选择

echo "🌐 启动投资大师圆桌会议 - 高级ngrok公网访问模式..."
echo "=================================================="

# 检查ngrok是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok未安装，请先安装ngrok"
    echo "💡 安装方法："
    echo "   brew install ngrok (macOS)"
    echo "   snap install ngrok (Ubuntu)"
    echo "   或访问 https://ngrok.com/download"
    exit 1
fi

# 检测ngrok版本
NGROK_VERSION=$(ngrok version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "🔍 检测到ngrok版本: $NGROK_VERSION"

# 根据版本选择配置和启动方式
if [[ "$NGROK_VERSION" == 3.* ]]; then
    echo "📋 使用ngrok 3.x配置"
    NGROK_CONFIG="ngrok3.yml"
    # ngrok 3.x 使用命令行启动，配置文件只用于基本设置
    USE_CONFIG=true
    NGROK_CMD="ngrok http 5173 --config $NGROK_CONFIG --log=stdout"
elif [[ "$NGROK_VERSION" == 2.* ]]; then
    echo "📋 使用ngrok 2.x配置"
    NGROK_CONFIG="ngrok.yml"
    NGROK_CMD="ngrok start --config $NGROK_CONFIG frontend"
    USE_CONFIG=true
else
    echo "⚠️  未知的ngrok版本，使用默认配置"
    NGROK_CONFIG=""
    NGROK_CMD="ngrok http 5173 --log=stdout"
    USE_CONFIG=false
fi

# 检查ngrok配置文件
if [ ! -z "$NGROK_CONFIG" ] && [ ! -f "$NGROK_CONFIG" ]; then
    echo "⚠️  ngrok配置文件不存在，将使用默认配置"
    echo "💡 建议创建 $NGROK_CONFIG 文件以获得更好的性能"
    USE_CONFIG=false
    if [[ "$NGROK_VERSION" == 3.* ]]; then
        NGROK_CMD="ngrok http 5173 --log=stdout"
    else
        NGROK_CMD="ngrok http 5173 --log=stdout"
    fi
elif [ ! -z "$NGROK_CONFIG" ]; then
    echo "✅ 发现ngrok配置文件: $NGROK_CONFIG"
    # 验证配置文件
    if ngrok config check --config $NGROK_CONFIG 2>/dev/null; then
        echo "✅ 配置文件验证通过"
    else
        echo "⚠️  配置文件验证失败，使用默认配置"
        USE_CONFIG=false
        NGROK_CMD="ngrok http 5173 --log=stdout"
    fi
else
    USE_CONFIG=false
fi

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

# 配置前端环境变量（解决WebSocket连接问题）
echo "🔧 配置前端WebSocket连接..."
cat > .env.development << EOF
# ngrok公网访问配置
# 自动生成于 $(date)

# API基础URL（HTTP）- 使用ngrok地址
# 注意：这里先设置为localhost，ngrok启动后会更新
VITE_API_BASE_URL=http://localhost:8000

# WebSocket基础URL - 使用ngrok地址
VITE_WS_BASE_URL=ws://localhost:8000

# 主机地址
VITE_HOST=localhost:8000

# 注意：此文件由脚本自动生成，用于解决手机端WebSocket连接错误
EOF

echo "✅ 环境变量文件已创建: .env.development"

npm run dev -- --host 0.0.0.0 &
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

# 启动ngrok隧道
echo "🌐 启动ngrok隧道..."
cd ..

if [ "$USE_CONFIG" = true ]; then
    echo "📋 使用配置文件启动ngrok: $NGROK_CONFIG"
    echo "🚀 执行命令: $NGROK_CMD"
    eval $NGROK_CMD &
    NGROK_PID=$!
else
    echo "📋 使用默认配置启动ngrok..."
    ngrok http 5173 --log=stdout &
    NGROK_PID=$!
fi

# 等待ngrok启动
sleep 5

# 获取ngrok公网地址
echo "🔍 获取ngrok地址..."
NGROK_URL=""
for i in {1..20}; do
    if [ "$USE_CONFIG" = true ]; then
        # 使用配置文件时，尝试获取前端隧道地址
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep https | cut -d'"' -f4 | head -1)
    else
        # 使用默认配置时
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep https | cut -d'"' -f4 | head -1)
    fi
    
    if [ ! -z "$NGROK_URL" ]; then
        break
    fi
    sleep 1
done

if [ -z "$NGROK_URL" ]; then
    echo "❌ 无法获取ngrok地址，请检查ngrok是否正常启动"
    echo "💡 可以手动访问 http://localhost:4040 查看ngrok状态"
    echo "🔄 尝试重新启动ngrok..."
    
    # 重新启动ngrok
    kill $NGROK_PID 2>/dev/null || true
    sleep 2
    
    if [ "$USE_CONFIG" = true ]; then
        echo "🔄 重新启动ngrok（使用配置文件）..."
        eval $NGROK_CMD &
    else
        echo "🔄 重新启动ngrok（使用默认配置）..."
        ngrok http 5173 --log=stdout &
    fi
    
    NGROK_PID=$!
    sleep 5
    
    # 再次尝试获取地址
    for i in {1..15}; do
        if [ "$USE_CONFIG" = true ]; then
            NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep https | cut -d'"' -f4 | head -1)
        else
            NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep https | cut -d'"' -f4 | head -1)
        fi
        
        if [ ! -z "$NGROK_URL" ]; then
            break
        fi
        sleep 1
    done
fi

if [ ! -z "$NGROK_URL" ]; then
    # 更新环境变量配置，使用ngrok地址
    echo "🔄 更新WebSocket配置为ngrok地址..."
    cd frontend
    
    # 提取ngrok域名
    NGROK_DOMAIN=$(echo $NGROK_URL | sed 's|https://||')
    
    cat > .env.development << EOF
# ngrok公网访问配置
# 自动生成于 $(date)

# API基础URL（HTTP）- 使用ngrok地址
VITE_API_BASE_URL=https://$NGROK_DOMAIN

# WebSocket基础URL - 使用ngrok地址
VITE_WS_BASE_URL=wss://$NGROK_DOMAIN

# 主机地址
VITE_HOST=$NGROK_DOMAIN

# 注意：此文件由脚本自动生成，用于解决手机端WebSocket连接错误
EOF
    
    echo "✅ WebSocket配置已更新为ngrok地址"
    echo "   HTTP API: https://$NGROK_DOMAIN"
    echo "   WebSocket: wss://$NGROK_DOMAIN"
    
    cd ..
    
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
    echo "🔌 WebSocket配置："
    echo "   已自动配置为: wss://$NGROK_DOMAIN"
    echo "   解决手机端连接错误问题"
    echo ""
    echo "📋 使用说明："
    echo "1. 手机可以直接访问上述公网地址"
    echo "2. 无需连接同一WiFi网络"
    echo "3. 首次访问需要允许麦克风权限"
    echo "4. 支持添加到主屏幕作为PWA应用"
    echo "5. WebSocket连接已自动修复，支持实时对话"
    echo ""
    echo "⚠️  注意："
    echo "   • ngrok免费版有连接数限制"
    echo "   • 每次重启地址会变化"
    echo "   • 适合开发测试使用"
    echo ""
    echo "🧪 故障排除："
    echo "   如果仍有问题，访问: $NGROK_URL/websocket-test"
    echo "   进行连接诊断测试"
    echo ""
    echo "🔧 高级功能："
    if [ "$USE_CONFIG" = true ]; then
        echo "   • 使用配置文件优化性能 ($NGROK_CONFIG)"
        echo "   • 支持多隧道配置"
        echo "   • WebSocket连接优化"
        echo "   • ngrok版本: $NGROK_VERSION"
    else
        echo "   • 建议创建 ngrok.yml 或 ngrok3.yml 配置文件"
        echo "   • 可获得更好的性能和稳定性"
        echo "   • 当前ngrok版本: $NGROK_VERSION"
    fi
    echo ""
else
    echo "❌ 最终无法获取ngrok地址"
    echo "💡 请检查："
    echo "   1. ngrok是否正常启动"
    echo "   2. 网络连接是否正常"
    echo "   3. 访问 http://localhost:4040 查看详细状态"
    echo "   4. 如果使用配置文件，检查配置是否正确"
    echo "   5. ngrok版本兼容性: $NGROK_VERSION"
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
    if [ ! -z "$NGROK_URL" ]; then
        echo "[$(date '+%H:%M:%S')] 服务运行中... (ngrok: $NGROK_URL)"
    else
        echo "[$(date '+%H:%M:%S')] 服务运行中... (ngrok: 未获取到地址)"
    fi
done
