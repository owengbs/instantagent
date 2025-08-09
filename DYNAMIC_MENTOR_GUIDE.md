# 动态导师生成功能使用指南

## 功能概述

动态导师生成功能允许用户根据特定议题，由AI实时生成四位最适合的投资导师，每位导师都有独特的性格特征、专业领域和投资风格。

## 主要特性

### 1. 智能导师生成
- 根据用户输入的议题自动生成四位导师
- 每位导师都有独特的性格特征和专业背景
- 支持多种投资风格：价值投资、成长投资、技术分析、宏观投资等

### 2. 个性化特征
- **姓名和头衔**：基于真实投资大师或虚构但合理的身份
- **投资哲学**：每位导师都有独特的投资理念
- **专业领域**：3-5个相关专业领域
- **性格特征**：3-5个性格特点，影响对话风格
- **经典名言**：2-3句代表性言论
- **投资风格标签**：如"价值投资"、"宏观投资"等

### 3. 语音分配
四位导师使用不同的语音：
- **Chelsie**（女声）
- **Cherry**（女声）
- **Ethan**（男声）
- **Serena**（女声）

### 4. 会话级持久化
- 动态导师在内存中保持活跃状态
- 支持整个会话期间的对话
- 会话结束后自动清理

## 使用方法

### 前端使用

1. **进入导师选择页面**
   ```
   访问主页，点击"AI生成导师"按钮
   ```

2. **输入讨论议题**
   ```
   在文本框中详细描述您想要讨论的议题
   例如：
   - "人工智能对投资市场的影响"
   - "ESG投资策略分析"
   - "加密货币投资风险与机遇"
   ```

3. **生成导师**
   ```
   点击"生成四位导师"按钮
   系统会调用AI生成适合的导师
   ```

4. **开始对话**
   ```
   生成完成后，点击"开始与导师对话"
   系统会跳转到聊天页面
   ```

### 后端API

#### 生成动态导师
```http
POST /mentors/dynamic/generate
Content-Type: application/json

{
  "topic": "人工智能对投资市场的影响",
  "session_id": "dynamic_session_123"
}
```

#### 获取会话导师
```http
GET /mentors/dynamic/{session_id}
```

#### 清理会话导师
```http
DELETE /mentors/dynamic/{session_id}
```

### WebSocket消息

#### 生成动态导师
```json
{
  "type": "generate_dynamic_mentors",
  "topic": "人工智能对投资市场的影响",
  "session_id": "dynamic_session_123"
}
```

#### 接收生成结果
```json
{
  "type": "dynamic_mentors_generated",
  "mentors": [
    {
      "agent_id": "dynamic_1234",
      "name": "AI投资专家",
      "title": "人工智能投资分析师",
      "description": "专注于AI技术在投资领域的应用",
      "voice": "Chelsie",
      "expertise": ["人工智能", "量化投资", "算法交易"],
      "personality_traits": ["理性", "创新", "前瞻"],
      "investment_style": "AI驱动投资",
      "famous_quotes": ["数据是新的石油", "算法比情绪更可靠"],
      "color": "#3B82F6",
      "avatar": "https://api.dicebear.com/7.x/adventurer/svg?seed=dynamic_1234"
    }
  ],
  "topic": "人工智能对投资市场的影响",
  "session_id": "dynamic_session_123",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 技术实现

### 后端架构

1. **动态导师生成器** (`dynamic_mentor_generator.py`)
   - 调用OpenAI API生成导师特征
   - 支持JSON解析和错误处理
   - 提供备用导师生成

2. **动态导师类** (`dynamic_mentor.py`)
   - 继承自BaseAgent
   - 根据生成的特征创建导师实例
   - 支持个性化对话风格

3. **导师管理器** (`agent_manager.py`)
   - 管理动态导师的生命周期
   - 支持会话级持久化
   - 提供清理功能

4. **API接口** (`mentors.py`)
   - 提供RESTful API
   - 支持WebSocket通信
   - 错误处理和日志记录

### 前端组件

1. **动态导师生成器** (`DynamicMentorGenerator.tsx`)
   - 议题输入界面
   - 生成进度显示
   - 导师预览功能

2. **导师选择页面** (`MentorSelection.tsx`)
   - 集成动态导师生成入口
   - 支持传统导师和动态导师

3. **聊天容器** (`MultiAgentChatContainer.tsx`)
   - 支持动态导师对话
   - 路由状态管理
   - 会话持久化

## 配置说明

### OpenAI配置
```python
# backend/app/agents/dynamic_mentor_generator.py
self.openai_client = OpenAI(
    base_url="http://v2.open.venus.oa.com/llmproxy",
    api_key="xxBZykeTGIVeqyGNaxNoMDro@2468"
)
self.model = "deepseek-r1-local-II"
```

### 语音配置
```typescript
// 四位导师的语音分配
const voices = ["Chelsie", "Cherry", "Ethan", "Serena"];
```

## 测试

### 运行测试脚本
```bash
cd backend
python test_dynamic_mentor.py
```

### 测试内容
1. 动态导师生成功能
2. 导师对话功能
3. 会话持久化
4. 清理功能

## 注意事项

1. **议题描述**：越详细的议题描述，生成的导师越准确
2. **网络连接**：需要稳定的网络连接来调用OpenAI API
3. **会话管理**：动态导师仅在当前会话中有效
4. **资源清理**：会话结束后会自动清理导师资源

## 故障排除

### 常见问题

1. **生成失败**
   - 检查网络连接
   - 验证OpenAI API配置
   - 查看后端日志

2. **导师无法对话**
   - 确认导师已正确注册
   - 检查WebSocket连接状态
   - 验证会话ID

3. **语音合成失败**
   - 检查语音服务状态
   - 确认语音配置正确
   - 查看前端控制台错误

### 日志查看
```bash
# 后端日志
tail -f backend/logs/app.log

# 前端控制台
# 打开浏览器开发者工具查看Console
```

## 扩展功能

### 未来计划
1. 支持更多导师类型
2. 增加导师评分系统
3. 支持导师特征编辑
4. 添加导师推荐算法
5. 支持多语言导师生成
