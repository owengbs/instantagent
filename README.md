# InstantAgent - 实时语音对话系统

一个基于LangGraph和Qwen大模型的实时语音对话系统，支持流式AI回复、实时TTS合成和ASR识别。

## 🌟 主要特性

- **🎤 实时语音识别**: 使用Qwen ASR Realtime API，边说边识别
- **🤖 流式AI回复**: 基于Qwen-Plus大模型，边生成边显示
- **🎵 流式TTS合成**: 使用Qwen-TTS Realtime API，按句子合成语音
- **⚡ 端到端流式**: 从语音输入到语音回复的完整流式处理
- **🧹 智能文本清理**: 自动清理大模型输出，优化TTS效果
- **🎭 多语音选择**: 支持7种高质量语音（Cherry、Ethan等）

## 🏗️ 系统架构

```
用户语音 → 前端录制 → WebSocket音频流 → 后端ASR队列 → Qwen ASR API
                                                      ↓
AI流式回复 ← 后端AI流式生成 ← 用户问题 ← ASR识别结果
    ↓
TTS流式合成 → 音频流 → 前端播放 → 用户听到回复
```

## 🚀 快速开始

### 环境要求

- Python 3.8+
- Node.js 16+
- 麦克风和扬声器

### 一键启动

```bash
# 克隆项目
git clone https://github.com/owengbs/instantagent.git
cd instantagent

# 一键启动（推荐）
./start.sh
```

### 手动启动

#### 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

#### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 访问地址

- **前端界面**: http://localhost:5173
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs

## 📁 项目结构

```
instantagent/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── agents/         # AI代理
│   │   ├── api/           # API接口
│   │   ├── core/          # 核心配置
│   │   └── services/      # 服务层
│   ├── main.py            # 主程序
│   └── requirements.txt    # Python依赖
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   └── hooks/        # 自定义Hooks
│   └── package.json       # Node.js依赖
├── start.sh               # 一键启动脚本
├── stop.sh                # 停止脚本
└── README.md              # 项目说明
```

## 🔧 核心功能

### 1. 实时语音识别 (ASR)

- 使用Qwen ASR Realtime API
- 支持边说边识别
- 实时显示识别结果

### 2. 流式AI对话

- 基于Qwen-Plus大模型
- 支持流式文本输出
- 智能文本清理优化

### 3. 流式TTS合成

- 使用Qwen-TTS Realtime API
- 按句子进行语音合成
- 支持多种语音选择

### 4. 文本清理服务

- 自动移除表情符号、特殊符号
- 将列表格式转换为自然语言
- 优化TTS朗读效果

## 🎯 使用说明

1. **启动系统**: 运行 `./start.sh` 或手动启动前后端
2. **打开浏览器**: 访问 http://localhost:5173
3. **开始对话**: 点击麦克风按钮开始语音识别
4. **实时交互**: 系统会实时显示AI回复并进行语音合成

## 🔍 技术栈

### 后端
- **FastAPI**: Web框架
- **LangGraph**: 对话流程编排
- **Qwen-Plus**: 大语言模型
- **Qwen-TTS**: 语音合成
- **Qwen-ASR**: 语音识别
- **WebSocket**: 实时通信

### 前端
- **React**: 用户界面
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **Web Audio API**: 音频处理
- **Framer Motion**: 动画效果

## 📊 性能优化

- **流式处理**: 减少首字延迟
- **文本清理**: 优化TTS效果
- **异步处理**: 不阻塞AI生成
- **智能分句**: 按句子进行TTS

## 🧪 测试

```bash
# 运行文本清理测试
cd backend
python test_text_cleaner.py

# 运行TTS优化测试
python test_tts_text_optimization.py

# 运行演示脚本
python demo_text_optimization.py
```

## 📝 开发日志

### v1.0.0 (2024-01-25)
- ✅ 实现实时语音识别
- ✅ 实现流式AI对话
- ✅ 实现流式TTS合成
- ✅ 集成文本清理服务
- ✅ 优化用户体验

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 👨‍💻 作者

[@owengbs](https://github.com/owengbs)

---

**�� 享受丝滑的实时语音对话体验！** 