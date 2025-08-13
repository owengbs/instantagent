# 手机端WebSocket连接配置指南

## 问题描述
手机端访问对话页面时出现"websocket链接错误"，这是因为WebSocket连接使用了硬编码的内网IP地址，手机端无法访问。

## 解决方案

### 方案1：使用统一启动脚本（推荐）

使用整合后的启动脚本，自动完成所有配置：

```bash
./start-mobile.sh
```

这个脚本会自动：
- 检测本机IP地址
- 启动后端服务
- 创建正确的环境变量配置
- 启动前端服务
- 解决WebSocket连接问题

### 方案2：使用环境变量配置

1. 在 `frontend` 目录下创建 `.env.development` 文件：

```bash
# API基础URL（HTTP）
VITE_API_BASE_URL=http://你的电脑IP:8000

# WebSocket基础URL  
VITE_WS_BASE_URL=ws://你的电脑IP:8000

# 主机地址
VITE_HOST=你的电脑IP:8000
```

2. 获取你的电脑IP地址：
   - Windows: 打开命令提示符，输入 `ipconfig`
   - Mac/Linux: 打开终端，输入 `ifconfig` 或 `ip addr`

3. 重启前端开发服务器

### 方案3：使用智能配置（已实现）

代码已经实现了智能配置功能，会自动检测：
- 是否在移动设备上
- 是否在访问开发服务器
- 自动使用正确的WebSocket地址

### 方案4：使用内网穿透工具

如果手机和电脑不在同一个网络，可以使用：
- ngrok: `ngrok http 8000`
- frp
- 其他内网穿透工具

## 验证配置

1. 在手机浏览器中打开页面
2. 打开开发者工具查看控制台
3. 检查WebSocket连接是否成功
4. 查看网络请求中的WebSocket地址

## 常见问题

### Q: 仍然无法连接
A: 检查防火墙设置，确保8000端口开放

### Q: 连接成功但消息发送失败
A: 检查后端服务是否正常运行

### Q: 手机端显示空白页面
A: 检查前端构建是否成功，确保所有资源都能正常加载

## 技术细节

- WebSocket代理已配置在 `vite.config.ts` 中
- 智能地址检测在 `src/config/api.ts` 中实现
- 支持自动重连和错误处理
- 统一启动脚本 `start-mobile.sh` 已整合所有功能
