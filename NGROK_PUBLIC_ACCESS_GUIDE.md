# ngrok公网访问使用指南

## 概述

本指南介绍如何使用ngrok让手机通过公网IP访问即时对话服务，解决WebSocket连接问题。

## 快速开始

### 方法1：使用高级启动脚本（推荐）

```bash
./start-mobile-ngrok-advanced.sh
```

### 方法2：使用基础启动脚本

```bash
./start-mobile-ngrok.sh
```

## 功能特性

### ✅ 已解决的问题
- **WebSocket连接错误** - 自动配置正确的WebSocket地址
- **公网访问** - 手机无需连接同一WiFi网络
- **实时对话** - 支持语音识别和TTS合成
- **自动配置** - 无需手动设置环境变量

### 🔧 技术优势
- **智能地址检测** - 自动识别移动端访问场景
- **WebSocket代理** - 优化WebSocket连接性能
- **环境变量管理** - 动态更新配置
- **服务监控** - 实时状态监控和自动重连

## 详细配置

### 1. ngrok配置文件（可选但推荐）

创建 `ngrok.yml` 文件：

```yaml
version: "2"
authtoken: YOUR_NGROK_AUTHTOKEN  # 替换为你的authtoken
tunnels:
  frontend:
    addr: 5173
    proto: http
    inspect: true
    bind_tls: true
    schemes:
      - https
      - wss
  backend:
    addr: 8000
    proto: http
    inspect: false
    bind_tls: true
    schemes:
      - https
      - wss
```

### 2. 获取ngrok authtoken

1. 访问 [ngrok官网](https://ngrok.com/)
2. 注册账号并登录
3. 在Dashboard中找到你的authtoken
4. 将authtoken填入配置文件

### 3. 环境变量配置

脚本会自动创建 `.env.development` 文件：

```bash
# ngrok公网访问配置
VITE_API_BASE_URL=https://your-ngrok-domain.ngrok.io
VITE_WS_BASE_URL=wss://your-ngrok-domain.ngrok.io
VITE_HOST=your-ngrok-domain.ngrok.io
```

## 使用方法

### 启动服务

1. **确保ngrok已安装**：
   ```bash
   brew install ngrok  # macOS
   # 或访问 https://ngrok.com/download
   ```

2. **运行启动脚本**：
   ```bash
   ./start-mobile-ngrok-advanced.sh
   ```

3. **等待服务启动**：
   - 后端服务（端口8000）
   - 前端服务（端口5173）
   - ngrok隧道

### 访问服务

启动成功后，你会看到：

```
🎉 所有服务启动完成！

📱 手机访问地址（公网）：
   https://abc123.ngrok.io

🖥️  电脑访问地址（本地）：
   http://localhost:5173

📊 ngrok管理面板：
   http://localhost:4040
```

### 手机端访问

1. 在手机浏览器中打开公网地址
2. 允许麦克风权限
3. 开始实时对话

## 故障排除

### 常见问题

#### Q: ngrok无法启动
**A: 检查以下项目：**
- ngrok是否已安装
- 网络连接是否正常
- 端口是否被占用

#### Q: 无法获取公网地址
**A: 尝试以下步骤：**
1. 访问 `http://localhost:4040` 查看ngrok状态
2. 检查配置文件是否正确
3. 重启ngrok服务

#### Q: WebSocket连接失败
**A: 使用诊断工具：**
1. 访问 `https://your-domain.ngrok.io/websocket-test`
2. 查看连接日志
3. 检查环境变量配置

#### Q: 手机端显示空白页面
**A: 检查以下项目：**
- 前端服务是否正常启动
- 网络连接是否稳定
- 浏览器是否支持HTTPS

### 诊断命令

```bash
# 检查ngrok状态
curl http://localhost:4040/api/tunnels

# 检查端口占用
lsof -ti:5173
lsof -ti:8000
lsof -ti:4040

# 检查服务状态
curl http://localhost:5173
curl http://localhost:8000/docs
```

## 性能优化

### 1. 使用配置文件
- 启用HTTPS/WSS支持
- 优化隧道配置
- 减少连接延迟

### 2. 网络优化
- 选择最近的ngrok服务器
- 使用稳定的网络连接
- 避免同时运行多个隧道

### 3. 服务优化
- 启用WebSocket代理
- 配置自动重连
- 监控服务状态

## 安全注意事项

### ⚠️ 重要提醒

1. **公网暴露** - ngrok会将本地服务暴露到公网
2. **访问控制** - 建议设置访问密码或IP白名单
3. **数据安全** - 不要在公网环境中处理敏感数据
4. **免费限制** - ngrok免费版有连接数和带宽限制

### 🔒 安全建议

1. **仅用于开发测试**
2. **定期更换authtoken**
3. **监控访问日志**
4. **及时关闭不需要的隧道**

## 高级功能

### 1. 多隧道支持
可以同时创建多个隧道，分别用于前端和后端服务。

### 2. 自定义域名
付费用户可以绑定自定义域名，获得更稳定的访问地址。

### 3. 访问控制
可以设置访问密码、IP白名单等安全措施。

### 4. 监控和日志
ngrok提供详细的访问日志和性能监控。

## 总结

使用ngrok可以让手机通过公网IP访问即时对话服务，解决了WebSocket连接问题。通过智能配置和自动优化，用户可以获得流畅的移动端体验。

**推荐使用 `start-mobile-ngrok-advanced.sh` 脚本，它提供了最完整的功能和最佳的稳定性。**
