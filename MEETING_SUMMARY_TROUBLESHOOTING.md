# 会议纪要生成问题故障排除指南

## 🚨 问题现象

用户反映在对话结束后生成会议纪要时会报错：
- **前端错误**: `生成会议纪要失败: Error: 未找到会话消息历史`
- **后端错误**: `会话不存在` 和 `未找到会话消息历史`
- **HTTP状态**: 404 Not Found

## 🔍 问题诊断

### 1. 检查浏览器控制台

在浏览器中按 `F12` 打开开发者工具，查看控制台输出：

```
🔍 从localStorage获取会话信息:
   dynamicSessionId: undefined
   dynamicTopic: undefined
⚠️ 未找到dynamicSessionId
```

如果看到上述输出，说明 `localStorage` 中没有正确的会话信息。

### 2. 检查localStorage

在浏览器控制台中运行以下命令：

```javascript
// 检查会话信息
console.log('dynamicSessionId:', localStorage.getItem('dynamicSessionId'));
console.log('dynamicTopic:', localStorage.getItem('dynamicTopic'));
```

## 🛠️ 解决方案

### 方案1：使用修复脚本（推荐）

1. **复制修复脚本**：复制 `fix-localstorage.js` 文件中的内容
2. **在控制台运行**：粘贴到浏览器控制台并按回车
3. **查看输出**：脚本会自动检查并尝试修复问题

### 方案2：手动检查和修复

#### 步骤1：检查localStorage
```javascript
// 在浏览器控制台中运行
localStorage.getItem('dynamicSessionId')
localStorage.getItem('dynamicTopic')
```

#### 步骤2：清除无效会话
```javascript
// 清除所有会话信息
localStorage.removeItem('dynamicSessionId');
localStorage.removeItem('dynamicTopic');
localStorage.removeItem('selectedMentors');
```

#### 步骤3：重新创建会话
1. 返回主页
2. 重新创建动态导师会话
3. 确保对话正常进行

### 方案3：使用诊断页面

1. **打开诊断页面**：在浏览器中打开 `check-localstorage.html`
2. **查看会话信息**：页面会显示当前的会话状态
3. **执行操作**：使用页面上的按钮进行操作

## 🔧 修复脚本使用说明

### 可用命令

运行修复脚本后，可以使用以下命令：

```javascript
// 检查会话信息
checkSessionInfo()

// 修复sessionId格式
fixSessionId()

// 创建新测试会话
createNewSession()

// 清除所有会话
clearAllSessions()
```

### 自动修复流程

1. **检查状态**：脚本自动检查localStorage状态
2. **识别问题**：确定问题类型（缺少ID、格式错误等）
3. **尝试修复**：自动修复常见问题
4. **提供建议**：给出手动修复的建议

## 📋 常见问题及解决方案

### 问题1：dynamicSessionId为空

**症状**: 控制台显示 `dynamicSessionId: undefined`

**解决方案**:
1. 重新创建动态导师会话
2. 确保对话正常进行
3. 检查是否有JavaScript错误

### 问题2：sessionId格式不正确

**症状**: sessionId不包含 `_msg_` 标识符

**解决方案**:
1. 运行 `fixSessionId()` 自动修复
2. 或手动清除并重新创建会话

### 问题3：localStorage被清除

**症状**: 所有会话信息都丢失

**解决方案**:
1. 检查浏览器设置
2. 确认没有隐私模式
3. 重新创建会话

## 🧪 测试步骤

### 1. 基本功能测试

1. **创建会话**: 生成新的动态导师
2. **进行对话**: 发送几条消息
3. **生成纪要**: 点击"生成会议纪要"按钮
4. **验证结果**: 确认纪要生成成功

### 2. 错误处理测试

1. **无效sessionId**: 手动设置错误的sessionId
2. **空sessionId**: 清除sessionId
3. **格式错误**: 使用错误格式的sessionId
4. **验证错误**: 确认错误信息正确显示

## 📱 移动端注意事项

### 1. 浏览器兼容性

- 确保使用支持localStorage的现代浏览器
- 检查是否有JavaScript错误
- 验证网络连接正常

### 2. 存储限制

- 某些移动浏览器可能有存储限制
- 定期清理不必要的localStorage数据
- 避免存储过大的数据

## 🔮 预防措施

### 1. 定期检查

- 定期运行诊断脚本
- 监控localStorage状态
- 及时清理无效数据

### 2. 错误监控

- 添加错误日志记录
- 监控API调用状态
- 实现自动重试机制

### 3. 用户教育

- 提供清晰的使用说明
- 解释错误信息的含义
- 指导用户进行故障排除

## 📞 获取帮助

如果问题仍然存在：

1. **查看日志**: 检查前端和后端日志
2. **运行诊断**: 使用提供的诊断工具
3. **收集信息**: 记录错误信息和操作步骤
4. **联系支持**: 提供详细的问题描述

## 🎯 预期结果

修复完成后：

- ✅ 会议纪要生成功能正常工作
- ✅ localStorage包含正确的会话信息
- ✅ sessionId格式符合后端期望
- ✅ 错误处理更加友好
- ✅ 调试信息更加详细

---

**注意**: 本指南基于当前代码版本编写，如果代码有更新，可能需要相应调整解决方案。
