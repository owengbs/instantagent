# 项目结构说明

## 重构后的项目结构

### 后端 (backend/)

```
backend/
├── main.py                    # 主应用入口
├── requirements.txt           # Python依赖
├── view_logs.py              # 日志查看工具
├── app/                      # 应用核心
│   ├── __init__.py
│   ├── core/                 # 核心配置
│   │   ├── config.py         # 应用配置
│   │   └── logging_config.py # 日志配置
│   ├── api/                  # API路由
│   │   ├── chat.py          # 聊天API
│   │   ├── tts.py           # TTS API
│   │   ├── realtime_chat.py # 实时对话API
│   │   └── asr_websocket.py # ASR WebSocket
│   ├── agents/              # AI代理
│   │   └── customer_agent.py # 客服代理
│   ├── services/            # 服务层
│   │   ├── qwen_asr_realtime.py    # ASR服务
│   │   ├── qwen_tts_realtime.py    # TTS服务
│   │   └── text_cleaner.py         # 文本清理
│   ├── knowledge/           # 知识库
│   │   └── knowledge_base.py
│   └── utils/               # 工具函数
│       └── logging_decorator.py
├── logs/                    # 日志文件
└── data/                    # 数据文件
```

### 前端 (frontend/)

```
frontend/
├── src/
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 应用入口
│   ├── index.css            # 全局样式
│   ├── components/          # React组件
│   │   ├── ChatContainer.tsx      # 聊天容器
│   │   ├── RealtimeVoiceChat.tsx  # 实时语音聊天
│   │   ├── VoiceChatInput.tsx     # 语音输入
│   │   ├── ChatInput.tsx          # 文本输入
│   │   ├── MessageBubble.tsx      # 消息气泡
│   │   ├── Header.tsx             # 页面头部
│   │   ├── Welcome.tsx            # 欢迎页面
│   │   ├── LoadingScreen.tsx      # 加载页面
│   │   ├── VoiceTest.tsx          # 语音测试
│   │   ├── AudioVisualizer.tsx    # 音频可视化
│   │   ├── TypingIndicator.tsx    # 打字指示器
│   │   └── ErrorBoundary.tsx      # 错误边界
│   ├── hooks/               # React Hooks
│   │   ├── useQwenSpeechRecognition.ts # 语音识别
│   │   ├── useRealtimeChat.ts           # 实时聊天
│   │   ├── useQwenTTS.ts                # TTS服务
│   │   ├── useSpeechRecognition.ts      # 浏览器语音识别
│   │   └── useSpeechSynthesis.ts        # 浏览器语音合成
│   ├── contexts/            # React Context
│   │   └── ChatContext.tsx  # 聊天上下文
│   ├── types/               # TypeScript类型
│   │   └── index.ts
│   └── utils/               # 工具函数
│       ├── index.ts
│       ├── voiceTest.ts
│       └── speechTest.ts
├── package.json             # 前端依赖
└── vite.config.ts          # Vite配置
```

## 重构改进

### 1. 删除的冗余文件
- `backend/app/api/asr.py` - 未使用的HTTP ASR API
- `frontend/src/hooks/useWebSocket.ts` - 未使用的WebSocket hook
- `frontend/src/hooks/useRealtimeStreamTTS.ts` - 未使用的TTS hook
- `backend/demo_text_optimization.py` - 演示文件

### 2. 简化的代码结构
- **ASR WebSocket**: 删除了复杂的事件循环处理逻辑
- **语音识别Hook**: 删除了测试功能，保留核心功能
- **API路由**: 合并了重复的ASR端点

### 3. 保留的核心功能
- ✅ 实时语音识别 (ASR WebSocket)
- ✅ 实时语音合成 (TTS)
- ✅ 流式AI对话 (Realtime Chat)
- ✅ 语音测试功能
- ✅ 错误处理和重连机制

### 4. 代码质量改进
- 删除了重复的代码
- 简化了复杂的逻辑
- 保持了所有核心功能
- 提高了代码可读性

## 启动说明

### 后端启动
```bash
cd backend
source venv/bin/activate
python3 main.py
```

### 前端启动
```bash
cd frontend
npm run dev
```

### 查看日志
```bash
cd backend
python3 view_logs.py
``` 