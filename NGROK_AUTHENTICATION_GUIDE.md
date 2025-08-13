# ngrok认证设置指南

## 🔑 问题描述

启动ngrok时出现认证错误：
```
ERROR: authentication failed: Usage of ngrok requires a verified account and authtoken.
```

## 🚀 快速解决方案

### 方法1：使用自动配置脚本（推荐）

```bash
./setup-ngrok-auth.sh
```

这个脚本会引导你完成authtoken配置。

### 方法2：手动配置

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## 📋 详细步骤

### 步骤1：注册ngrok账号

1. 访问 [ngrok官网](https://ngrok.com/)
2. 点击 "Sign up for free"
3. 填写注册信息（邮箱、密码等）
4. 验证邮箱地址

### 步骤2：获取authtoken

1. 登录 [ngrok Dashboard](https://dashboard.ngrok.com/)
2. 点击左侧菜单 "Getting Started"
3. 在 "Your Authtoken" 部分找到你的token
4. 复制完整的authtoken字符串

### 步骤3：配置authtoken

```bash
# 替换YOUR_AUTHTOKEN_HERE为你的实际token
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### 步骤4：验证配置

```bash
ngrok config check
```

应该显示：`Valid configuration file at /path/to/ngrok.yml`

## 🔧 配置文件设置

### ngrok 3.x 配置文件

创建或编辑 `ngrok3.yml`：

```yaml
version: "3"
authtoken: YOUR_AUTHTOKEN_HERE

tunnels:
  frontend:
    addr: 5173
    proto: http
    inspect: true
```

### ngrok 2.x 配置文件

创建或编辑 `ngrok.yml`：

```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE

tunnels:
  frontend:
    addr: 5173
    proto: http
    inspect: true
    schemes:
      - https
```

## 🧪 测试配置

### 1. 验证配置文件

```bash
# 测试ngrok3.yml
ngrok config check --config ngrok3.yml

# 测试ngrok.yml
ngrok config check --config ngrok.yml
```

### 2. 测试隧道启动

```bash
# 测试HTTP隧道
ngrok http 5173

# 或使用配置文件
ngrok start --config ngrok3.yml frontend
```

## ❌ 常见问题

### Q: authtoken无效
**A: 检查以下项目：**
- token是否完整复制
- 账号是否已验证
- 网络连接是否正常

### Q: 配置文件错误
**A: 检查以下项目：**
- YAML语法是否正确
- 版本号是否匹配
- 字段名是否正确

### Q: 权限问题
**A: 检查以下项目：**
- 文件权限是否正确
- 是否以正确用户运行
- 配置文件路径是否正确

## 🔒 安全提醒

### ⚠️ 重要注意事项

1. **不要分享authtoken** - 这是你的身份凭证
2. **定期更换token** - 如果怀疑泄露
3. **监控使用情况** - 在Dashboard中查看
4. **设置访问限制** - 使用IP白名单等

### 🛡️ 安全建议

1. 使用强密码
2. 启用双因素认证
3. 定期检查访问日志
4. 及时关闭不需要的隧道

## 📚 更多资源

### 官方文档
- [ngrok官方文档](https://ngrok.com/docs)
- [错误代码说明](https://ngrok.com/docs/errors)
- [API参考](https://ngrok.com/docs/api)

### 社区支持
- [ngrok GitHub](https://github.com/ngrok/ngrok)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/ngrok)
- [ngrok论坛](https://ngrok.com/community)

## 🎯 下一步

配置完成后，你可以：

1. **运行启动脚本**：
   ```bash
   ./start-mobile-ngrok-advanced.sh
   ```

2. **测试公网访问**：
   - 启动成功后获取公网地址
   - 在手机端测试访问

3. **验证WebSocket**：
   - 访问WebSocket测试页面
   - 确认实时对话功能正常

## 🎉 完成！

配置authtoken后，ngrok就能正常工作，你的手机就可以通过公网IP访问即时对话服务了！
