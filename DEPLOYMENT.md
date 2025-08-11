# 投资大师圆桌会议系统 - 部署指南

## 概述

本系统已优化支持生产环境部署，前端会根据运行环境自动切换API地址配置。

## 环境配置

### 开发环境
- 前端自动连接到 `http://localhost:8000` 和 `ws://localhost:8000`
- 无需额外配置

### 生产环境
- 前端自动使用相对路径 `/api` 连接后端
- WebSocket自动根据当前域名和协议构建连接
- 支持HTTP和HTTPS自动适配

## 部署步骤

### 1. 后端部署

```bash
# 1. 安装依赖
cd backend
pip install -r requirements.txt

# 2. 运行后端服务
python main.py
```

**注意**: 生产环境建议使用进程管理器如 `pm2`, `supervisor` 或 `systemd`

### 2. 前端部署

```bash
# 1. 安装依赖
cd frontend
npm install

# 2. 构建生产版本
npm run build

# 3. 部署dist目录到Web服务器
# 将 dist/ 目录内容部署到 Nginx/Apache 等Web服务器
```

### 3. Web服务器配置

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API请求代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket连接代理
    location /realtime/ {
        proxy_pass http://127.0.0.1:8000/realtime/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 环境变量配置（可选）

如需自定义API地址，可创建 `frontend/.env.production` 文件：

```bash
# 自定义API地址（可选）
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
VITE_HOST=api.your-domain.com
```

## 部署检查清单

- [ ] 后端服务正常运行（默认端口8000）
- [ ] 前端构建成功且部署到Web服务器
- [ ] Nginx/Apache配置API代理路径 `/api/`
- [ ] WebSocket代理路径 `/realtime/` 配置正确
- [ ] HTTPS证书配置（如需要）
- [ ] 防火墙端口开放
- [ ] 域名DNS解析正确

## 常见问题

### 1. API请求失败
- 检查Web服务器API代理配置
- 确认后端服务运行状态
- 检查防火墙设置

### 2. WebSocket连接失败
- 确认WebSocket代理配置
- 检查HTTPS/WSS协议匹配
- 验证防火墙WebSocket端口

### 3. 静态资源加载失败
- 检查前端构建产物
- 确认Web服务器静态文件配置
- 验证文件权限设置

## 监控建议

- 使用进程管理器监控后端服务
- 配置日志收集和分析
- 设置服务可用性监控
- 定期备份用户数据
