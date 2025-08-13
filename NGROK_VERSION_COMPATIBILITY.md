# ngrok版本兼容性说明

## 版本检测

脚本会自动检测ngrok版本并选择合适的配置：

```bash
# 检测ngrok版本
NGROK_VERSION=$(ngrok version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "🔍 检测到ngrok版本: $NGROK_VERSION"
```

## 版本兼容性

### ngrok 2.x 版本
- **配置文件**: `ngrok.yml`
- **启动命令**: `ngrok start --config ngrok.yml frontend`
- **特性**: 支持配置文件，多隧道配置

### ngrok 3.x 版本
- **配置文件**: `ngrok3.yml`
- **启动命令**: `ngrok start --config ngrok3.yml frontend`
- **特性**: 自动HTTPS/WSS支持，简化配置

### 未知版本
- **配置文件**: 无
- **启动命令**: `ngrok http 5173 --log=stdout`
- **特性**: 使用默认配置，基本功能

## 配置文件差异

### ngrok 2.x (`ngrok.yml`)
```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN
tunnels:
  frontend:
    addr: 5173
    proto: http
    inspect: true
    schemes:
      - https
      - wss
```

### ngrok 3.x (`ngrok3.yml`)
```yaml
# ngrok 3.x 配置文件
version: "3"
authtoken: YOUR_AUTHTOKEN
tunnels:
  frontend:
    addr: 5173
    proto: http
    inspect: true
    # 自动支持HTTPS和WebSocket，无需schemes字段
```

## 主要差异

| 特性 | ngrok 2.x | ngrok 3.x |
|------|-----------|-----------|
| 配置文件格式 | 需要 `version: "2"` | 需要 `version: "3"` |
| HTTPS支持 | 需要手动配置 `schemes` | 自动支持 |
| WebSocket支持 | 需要手动配置 `wss` | 自动支持 |
| 多隧道 | 完全支持 | 完全支持 |
| 配置复杂度 | 较高 | 较低 |

## 自动选择逻辑

```bash
# 根据版本选择配置文件
if [[ "$NGROK_VERSION" == 3.* ]]; then
    echo "📋 使用ngrok 3.x配置"
    NGROK_CONFIG="ngrok3.yml"
    NGROK_CMD="ngrok start --config $NGROK_CONFIG frontend"
elif [[ "$NGROK_VERSION" == 2.* ]]; then
    echo "📋 使用ngrok 2.x配置"
    NGROK_CONFIG="ngrok.yml"
    NGROK_CMD="ngrok start --config $NGROK_CONFIG frontend"
else
    echo "⚠️  未知的ngrok版本，使用默认配置"
    NGROK_CONFIG=""
    NGROK_CMD="ngrok http 5173 --log=stdout"
fi
```

## 升级建议

### 从ngrok 2.x升级到3.x

1. **备份配置**:
   ```bash
   cp ngrok.yml ngrok.yml.backup
   ```

2. **创建新配置**:
   ```bash
   # 创建ngrok3.yml
   cp ngrok.yml ngrok3.yml
   # 移除version和schemes字段
   ```

3. **测试新配置**:
   ```bash
   ngrok start --config ngrok3.yml frontend
   ```

### 保持向后兼容

- 保留 `ngrok.yml` 文件
- 创建 `ngrok3.yml` 文件
- 脚本会自动选择正确的配置

## 故障排除

### 配置文件错误

**错误**: `YAML parsing error: field bind_tls not found`
**原因**: 使用了ngrok 2.x的配置格式
**解决**: 使用 `ngrok3.yml` 配置文件

**错误**: `unknown field schemes`
**原因**: ngrok 3.x不支持schemes字段
**解决**: 移除schemes配置，3.x自动支持

### 版本检测失败

**问题**: 无法检测ngrok版本
**解决**: 手动指定配置文件

```bash
# 强制使用特定配置
NGROK_CONFIG="ngrok3.yml" ./start-mobile-ngrok-advanced.sh
```

## 最佳实践

### 1. 配置文件管理
- 为每个版本创建对应的配置文件
- 使用有意义的文件名
- 定期备份配置

### 2. 版本升级
- 测试新版本配置
- 保持向后兼容
- 更新文档说明

### 3. 错误处理
- 检查ngrok版本
- 验证配置文件格式
- 提供降级方案

## 总结

脚本现在完全兼容ngrok 2.x和3.x版本：

- ✅ **自动版本检测**
- ✅ **智能配置选择**
- ✅ **向后兼容支持**
- ✅ **错误处理优化**

无论你使用哪个版本的ngrok，脚本都能自动选择正确的配置并正常工作。
