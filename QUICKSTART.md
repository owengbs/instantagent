# 🚀 快速体验指南

欢迎体验**智能交易客服Agent**！这是一个基于LangGraph框架开发的智能客服系统，专为股票交易App新用户提供友好的帮助。

## ⚡ 一键启动

### 前提条件
- **Python 3.10+** 
- **Node.js 18+**
- **npm** 或 **yarn**

### 🎯 立即体验

1. **克隆或下载项目**
   ```bash
   # 如果您已经在项目目录中，跳过此步骤
   cd instantagent
   ```

2. **一键启动所有服务**
   ```bash
   ./start.sh
   ```

3. **开始使用**
   
   启动完成后，您将看到：
   ```
   🎉 服务启动成功！
   
   服务地址:
     📱 前端应用: http://localhost:3000
     🔧 后端API:  http://localhost:8000
     📖 API文档:  http://localhost:8000/docs
   ```

4. **访问应用**
   
   在浏览器中打开 **http://localhost:3000** 开始体验！

## 🎨 功能演示

### 1. 欢迎界面
- 精美的渐变背景
- 友好的欢迎信息
- 一键开始对话

### 2. 智能对话
试试这些问题：

**账户相关**
- "我想注册一个新账户，怎么操作？"
- "实名认证需要什么材料？"
- "忘记密码怎么办？"

**交易操作**
- "如何买入股票？"
- "股票什么时候可以卖出？"
- "交易费用是多少？"

**资金管理**
- "怎么充值？"
- "提现需要多长时间？"
- "支持哪些银行卡？"

**功能介绍**
- "这个APP有什么功能？"
- "如何查看行情？"
- "在哪里看交易记录？"

### 3. 智能特性
- **知识库检索**: 自动从知识库中查找相关信息
- **上下文记忆**: 记住对话历史，支持多轮对话
- **友好回复**: 简洁明了，就像真人客服
- **实时响应**: WebSocket连接，即时获得回复

## 🛠️ 系统架构

### 后端 (Port 8000)
- **LangGraph**: 对话流程编排
- **知识库**: ChromaDB向量数据库
- **大模型**: DeepSeek-V3 本地接口
- **API**: FastAPI + WebSocket

### 前端 (Port 3000)
- **React 18**: 现代化界面框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 精美UI设计
- **Framer Motion**: 流畅动画

## 📊 监控和管理

### 查看日志
```bash
# 后端日志
tail -f logs/backend.log

# 前端日志  
tail -f logs/frontend.log
```

### 健康检查
```bash
# 检查后端状态
curl http://localhost:8000/api/health

# 检查系统统计
curl http://localhost:8000/api/chat/stats
```

### 停止服务
```bash
./stop.sh
```

## 🔧 自定义配置

### 修改知识库
1. 编辑 `backend/app/knowledge/knowledge_base.py`
2. 在 `load_default_knowledge()` 方法中添加您的知识内容
3. 重启后端服务

### 调整模型参数
1. 编辑 `backend/app/core/config.py`
2. 修改 `OpenAIConfig` 类中的参数
3. 重启后端服务

### 自定义UI
1. 修改 `frontend/tailwind.config.js` 中的颜色和样式
2. 编辑 `frontend/src/components/` 中的组件
3. 前端会自动热重载

## 🐛 故障排除

### 常见问题

**1. 端口被占用**
```bash
# 检查端口占用
lsof -i :8000  # 后端端口
lsof -i :3000  # 前端端口

# 杀死进程
kill -9 <PID>
```

**2. Python依赖安装失败**
```bash
# 手动安装
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**3. Node.js依赖安装失败**
```bash
# 清除缓存重新安装
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**4. 服务无法访问**
- 检查防火墙设置
- 确认端口未被占用
- 查看日志文件排查错误

### 重置系统
```bash
# 停止所有服务
./stop.sh

# 清理环境
rm -rf backend/venv
rm -rf frontend/node_modules
rm -rf logs/*

# 重新启动
./start.sh
```

## 💡 开发建议

### 扩展知识库
- 添加更多交易相关知识
- 支持文档导入 (PDF, DOC等)
- 实现知识库管理界面

### 优化用户体验
- 添加语音输入/输出
- 支持多语言
- 个性化设置

### 生产部署
- 使用PostgreSQL替代ChromaDB
- 配置负载均衡
- 添加监控和告警

## 📞 技术支持

如果您遇到问题或有改进建议，请：

1. 查看日志文件获取详细错误信息
2. 检查网络连接和防火墙设置  
3. 确认系统依赖版本符合要求
4. 尝试重启服务

---

🎉 **开始您的智能客服之旅吧！** 

访问 http://localhost:3000 立即体验专业的交易客服助手。 