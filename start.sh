#!/bin/bash

# 智能交易客服Agent一键启动脚本
# 作者: Trading Customer Agent
# 版本: 1.0.0

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # 无颜色

# 打印函数
print_header() {
    echo ""
    echo -e "${PURPLE}=================================${NC}"
    echo -e "${PURPLE}  智能交易客服Agent部署脚本${NC}"
    echo -e "${PURPLE}=================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查系统依赖
check_dependencies() {
    print_step "检查系统依赖..."
    
    # 检查Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 未安装，请先安装 Python 3.10+"
        exit 1
    fi
    
    python_version=$(python3 --version | cut -d" " -f2 | cut -d"." -f1,2)
    if [[ $(echo "$python_version >= 3.10" | bc -l) -eq 1 ]] 2>/dev/null || [[ "$python_version" == "3.10" ]] || [[ "$python_version" == "3.11" ]] || [[ "$python_version" == "3.12" ]]; then
        print_success "Python $python_version 已安装"
    else
        print_error "需要 Python 3.10+，当前版本: $python_version"
        exit 1
    fi
    
    # 检查pip
    if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
        print_error "pip 未安装，请先安装 pip"
        exit 1
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    node_version=$(node --version | cut -d"v" -f2 | cut -d"." -f1)
    if [[ $node_version -ge 18 ]]; then
        print_success "Node.js $node_version 已安装"
    else
        print_error "需要 Node.js 18+，当前版本: v$node_version"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    print_success "系统依赖检查完成"
}

# 安装后端依赖
install_backend() {
    print_step "安装后端依赖..."
    
    cd backend
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        print_step "创建Python虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 升级pip
    pip install --upgrade pip
    
    # 安装依赖
    pip install -r requirements.txt
    
    print_success "后端依赖安装完成"
    cd ..
}

# 安装前端依赖
install_frontend() {
    print_step "安装前端依赖..."
    
    cd frontend
    
    # 安装依赖
    npm install
    
    print_success "前端依赖安装完成"
    cd ..
}

# 启动后端服务
start_backend() {
    print_step "启动后端服务..."
    
    cd backend
    source venv/bin/activate
    
    # 后台启动
    nohup python3 main.py > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    
    print_success "后端服务已启动 (PID: $BACKEND_PID)"
    cd ..
}

# 启动前端服务
start_frontend() {
    print_step "启动前端服务..."
    
    cd frontend
    
    # 后台启动
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    print_success "前端服务已启动 (PID: $FRONTEND_PID)"
    cd ..
}

# 等待服务启动
wait_for_services() {
    print_step "等待服务启动..."
    
    # 等待后端启动
    echo -n "后端服务启动中"
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            echo ""
            print_success "后端服务已就绪"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # 等待前端启动
    echo -n "前端服务启动中"
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo ""
            print_success "前端服务已就绪"
            break
        fi
        echo -n "."
        sleep 1
    done
}

# 显示服务信息
show_services() {
    echo ""
    echo -e "${CYAN}🎉 服务启动成功！${NC}"
    echo ""
    echo -e "${CYAN}服务地址:${NC}"
    echo -e "  📱 前端应用: ${GREEN}http://localhost:3000${NC}"
    echo -e "  🔧 后端API:  ${GREEN}http://localhost:8000${NC}"
    echo -e "  📖 API文档:  ${GREEN}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${CYAN}日志文件:${NC}"
    echo -e "  📝 后端日志: ${YELLOW}logs/backend.log${NC}"
    echo -e "  📝 前端日志: ${YELLOW}logs/frontend.log${NC}"
    echo ""
    echo -e "${CYAN}停止服务:${NC}"
    echo -e "  ⏹️  运行: ${YELLOW}./stop.sh${NC}"
    echo ""
}

# 创建停止脚本
create_stop_script() {
    cat > stop.sh << 'EOF'
#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}停止智能交易客服Agent服务...${NC}"

# 停止后端
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo -e "${GREEN}✅ 后端服务已停止${NC}"
    fi
    rm -f logs/backend.pid
fi

# 停止前端
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✅ 前端服务已停止${NC}"
    fi
    rm -f logs/frontend.pid
fi

echo -e "${GREEN}🎉 所有服务已停止${NC}"
EOF
    
    chmod +x stop.sh
}

# 主函数
main() {
    print_header
    
    # 创建日志目录
    mkdir -p logs
    
    # 检查依赖
    check_dependencies
    
    # 安装依赖
    install_backend
    install_frontend
    
    # 创建停止脚本
    create_stop_script
    
    # 启动服务
    start_backend
    sleep 3
    start_frontend
    
    # 等待服务启动
    wait_for_services
    
    # 显示服务信息
    show_services
}

# 运行主函数
main "$@" 