# Qwen ASR API 问题说明

## 问题描述

当前系统在尝试使用Qwen ASR（阿里云百炼语音识别）服务时遇到 `HTTP 404` 错误。

### 错误日志
```
15:13:19 | ERROR | app.services.qwen_asr_realtime | ❌ 实时语音识别失败: server rejected WebSocket connection: HTTP 404
15:13:19 | ERROR | app.api.asr_websocket     | ❌ ASR识别失败: client_id=xxx, error=server rejected WebSocket connection: HTTP 404
```

## 问题分析

### 1. API端点测试结果
- **API Key验证**: ✅ 有效 (`/api/v1/models` 返回200)
- **ASR WebSocket端点**: ❌ 不存在 (所有ASR相关端点返回404)
- **错误信息**: `"No static resource api/v1/asr"`

### 2. 测试的端点
```
wss://dashscope.aliyuncs.com/api-ws/v1/asr?model=paraformer-realtime-v2&format=pcm&sample_rate=16000
wss://dashscope.aliyuncs.com/api-ws/v1/asr
https://dashscope.aliyuncs.com/api/v1/asr
https://dashscope.aliyuncs.com/api/v1/services/asr
https://dashscope.aliyuncs.com/api/v1/audio/transcriptions
```

所有端点都返回404或400错误。

## 可能的原因

1. **API服务未正式发布**: Qwen ASR WebSocket API可能还在开发中或未正式发布
2. **端点路径错误**: 实际的API端点路径可能与文档不一致
3. **权限问题**: 当前API Key可能没有ASR服务的访问权限
4. **服务区域限制**: ASR服务可能只在特定区域可用

## 临时解决方案

### 1. 使用浏览器语音识别
前端已经集成了浏览器原生的语音识别功能作为回退方案：

```typescript
// 在 RealtimeVoiceChat.tsx 中
const {
  startListening,
  stopListening,
  error: asrError
} = useQwenSpeechRecognition({
  onError: (error) => {
    if (error && (error.includes('HTTP 404') || error.includes('API端点不存在'))) {
      alert('Qwen ASR服务暂时不可用，请切换到浏览器语音识别模式。')
    }
  }
})
```

### 2. 错误处理改进
后端已添加详细的错误处理：

```python
except websockets.exceptions.InvalidStatusCode as e:
    if e.status_code == 404:
        error_msg = f"Qwen ASR API端点不存在 (HTTP 404)。请检查API端点配置或联系阿里云技术支持。"
        logger.error(f"❌ {error_msg}")
        raise Exception(error_msg)
```

## 建议的解决步骤

### 1. 联系阿里云技术支持
- 确认Qwen ASR WebSocket API的正式发布状态
- 获取正确的API端点URL
- 确认API Key的权限配置

### 2. 查找替代方案
- 使用阿里云的其他ASR服务（如实时语音识别）
- 考虑使用其他云服务商的ASR API
- 继续使用浏览器原生语音识别作为临时方案

### 3. 更新配置
一旦获得正确的API端点，需要更新以下文件：
- `backend/app/services/qwen_asr_realtime.py` 中的 `base_url`
- 确认正确的模型名称和参数

## 当前状态

- ✅ 前端语音识别功能正常（浏览器原生）
- ✅ 后端错误处理已完善
- ✅ 用户友好的错误提示
- ❌ Qwen ASR API暂时不可用

## 测试命令

```bash
# 测试Qwen ASR API连接
cd backend
source venv/bin/activate
python test_qwen_asr.py

# 测试不同端点
python test_qwen_asr_alternative.py
```

## 下一步行动

1. 联系阿里云技术支持确认ASR API状态
2. 寻找替代的ASR服务提供商
3. 完善浏览器语音识别的用户体验
4. 监控Qwen ASR API的可用性 