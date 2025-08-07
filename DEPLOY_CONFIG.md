# 前端部署配置指南

## 修改后端地址的方法

### 方法1：环境变量配置（推荐）

1. 在 `frontend/` 目录下创建 `.env` 文件：

```bash
# 开发环境
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_HOST=localhost:8000

# 生产环境示例
# VITE_API_BASE_URL=http://192.168.1.100:8000
# VITE_WS_BASE_URL=ws://192.168.1.100:8000
# VITE_HOST=192.168.1.100:8000
```

2. 重新启动开发服务器或重新构建：

```bash
# 开发环境
npm run dev

# 生产环境
npm run build
```

### 方法2：直接修改配置文件

如果不想使用环境变量，可以直接修改配置文件：

**修改 `frontend/src/config/api.ts`：**

```typescript
const DEFAULT_CONFIG = {
  development: {
    HTTP_BASE_URL: 'http://your-server-ip:8000',  // 修改这里
    WS_BASE_URL: 'ws://your-server-ip:8000',      // 修改这里
    HOST: 'your-server-ip:8000'                   // 修改这里
  },
  // ...
}
```

**修改 `frontend/vite.config.ts`（仅影响开发环境）：**

```typescript
proxy: {
  '/api': {
    target: 'http://your-server-ip:8000',  // 修改这里
    changeOrigin: true,
    ws: true,
  }
}
```

### 方法3：构建时指定环境变量

```bash
# 构建时指定后端地址
VITE_API_BASE_URL=http://192.168.1.100:8000 \
VITE_WS_BASE_URL=ws://192.168.1.100:8000 \
npm run build
```

## 具体部署场景

### 场景1：本地开发，后端在另一台机器

创建 `.env` 文件：
```
VITE_API_BASE_URL=http://192.168.1.100:8000
VITE_WS_BASE_URL=ws://192.168.1.100:8000
```

### 场景2：前后端部署在同一服务器

生产环境默认配置即可，无需修改。

### 场景3：前端部署到CDN，后端在特定服务器

```
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_BASE_URL=wss://api.yourdomain.com
```

## 注意事项

1. **协议匹配**：HTTPS站点必须使用WSS协议的WebSocket
2. **CORS配置**：确保后端允许前端域名的跨域请求
3. **端口开放**：确保目标服务器的8000端口可访问
4. **环境变量优先级**：环境变量 > 配置文件默认值

## 验证配置

1. 打开浏览器开发者工具
2. 查看Network标签页中的请求地址
3. 确认API请求和WebSocket连接都指向正确的服务器地址

## 文件说明

- `frontend/src/config/api.ts` - 统一的API配置文件
- `frontend/.env` - 环境变量配置文件（需要手动创建）
- `frontend/vite.config.ts` - Vite开发服务器配置
