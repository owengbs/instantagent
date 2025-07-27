# 📝 日志查看指南

## 🚀 启动服务器查看实时日志

启动后端服务器时，您将在控制台看到详细的API调用日志：

```bash
cd backend
python main.py
```

启动后您将看到类似这样的日志：

```
📝 日志配置完成
   📄 控制台输出: INFO级别及以上
   📁 文件输出: ./logs/api_calls_20241201.log
   🔄 日志轮转: 10MB/文件，保留5个备份
   🎯 API调用日志: 详细记录所有Qwen接口调用

🚀 启动智能交易客服Agent...
✅ 目录检查完成
✅ 知识库初始化完成
✅ 客服Agent初始化完成
🎉 服务器启动成功！运行在 http://0.0.0.0:8000
```

## 📊 API调用日志示例

当系统调用Qwen接口时，您将看到详细的日志：

### 🎤 语音识别 (ASR)
```
14:30:15 | INFO     | app.utils.logging_decorator | 🚀 [QWEN] 调用 Qwen ASR Realtime 接口
14:30:15 | INFO     | app.utils.logging_decorator |    📊 请求信息: {'type': 'audio_stream'}
14:30:15 | INFO     | app.utils.logging_decorator |    📄 文本长度: 0 字符
14:30:18 | INFO     | app.utils.logging_decorator | ✅ [QWEN] Qwen ASR Realtime 调用成功
14:30:18 | INFO     | app.utils.logging_decorator |    ⏱️  耗时: 2.345秒
14:30:18 | INFO     | app.utils.logging_decorator |    📤 返回类型: 流式数据
```

### 🤖 大语言模型 (LLM)
```
14:30:20 | INFO     | app.utils.logging_decorator | 🚀 [QWEN] 调用 Qwen LLM Chat 接口
14:30:20 | INFO     | app.utils.logging_decorator |    📊 请求信息: {'last_message_preview': '你好，我想了解一下股票交易...'}
14:30:20 | INFO     | app.utils.logging_decorator |    📝 上下文长度: 3 条消息
14:30:20 | INFO     | app.utils.logging_decorator |    📄 文本长度: 15 字符
14:30:23 | INFO     | app.utils.logging_decorator | ✅ [QWEN] Qwen LLM Chat 调用成功
14:30:23 | INFO     | app.utils.logging_decorator |    ⏱️  耗时: 2.567秒
14:30:23 | INFO     | app.utils.logging_decorator |    📤 返回长度: 156 字符
```

### 🔊 语音合成 (TTS)
```
14:30:25 | INFO     | app.utils.logging_decorator | 🚀 [QWEN] 调用 Qwen TTS Realtime 接口
14:30:25 | INFO     | app.utils.logging_decorator |    📊 请求信息: {'text_preview': '您好，我是智能客服助手，很高兴为您服务...', 'voice': 'Cherry'}
14:30:25 | INFO     | app.utils.logging_decorator |    📄 文本长度: 25 字符
14:30:26 | INFO     | app.utils.logging_decorator | ✅ [QWEN] Qwen TTS Realtime 调用成功
14:30:26 | INFO     | app.utils.logging_decorator |    ⏱️  耗时: 0.890秒
14:30:26 | INFO     | app.utils.logging_decorator |    📤 返回类型: 流式数据
```

## 📁 查看日志文件

### 1. 列出所有日志文件
```bash
cd backend
python view_logs.py --list
```

### 2. 查看最新日志文件
```bash
python view_logs.py
```

### 3. 查看指定行数
```bash
python view_logs.py --lines 100
```

### 4. 实时跟踪日志
```bash
python view_logs.py --follow
```

### 5. 搜索特定内容
```bash
# 搜索ASR相关日志
python view_logs.py --search "ASR"

# 搜索错误日志
python view_logs.py --search "❌"

# 搜索耗时超过2秒的调用
python view_logs.py --search "耗时: 2."
```

### 6. 查看API调用统计
```bash
python view_logs.py --stats
```

## 📈 日志信息说明

### 🚀 调用开始
- **接口名称**: 显示调用的具体Qwen接口
- **服务类型**: QWEN (区分不同服务)
- **请求信息**: 关键参数预览
- **上下文长度**: 对话历史消息数量
- **文本长度**: 输入文本字符数

### ✅ 调用成功
- **耗时统计**: 精确到毫秒的API调用耗时
- **返回信息**: 结果类型和长度

### ❌ 调用失败
- **错误信息**: 详细的错误描述
- **耗时统计**: 失败时的耗时

## 🔧 日志配置

日志文件位置：`./logs/api_calls_YYYYMMDD.log`

日志轮转：
- 单个文件最大：10MB
- 保留备份数：5个
- 编码格式：UTF-8

## 🎯 常用搜索关键词

- `🚀 [QWEN]` - 所有API调用开始
- `✅ [QWEN]` - 所有成功调用
- `❌ [QWEN]` - 所有失败调用
- `ASR` - 语音识别相关
- `TTS` - 语音合成相关
- `LLM` - 大语言模型相关
- `耗时:` - 查看性能统计
- `文本长度:` - 查看输入长度
- `上下文长度:` - 查看对话历史长度 