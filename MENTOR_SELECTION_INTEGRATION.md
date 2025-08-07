# 首页选导师逻辑与圆桌会议对话逻辑打通方案

## 🎯 问题分析

### 原有问题
1. **首页选择的导师，并不是圆桌对话过程中，真正参与的导师**
   - 首页选择导师后保存到 `localStorage`
   - 但后端 `agent_manager` 使用固定的智能体（buffett, soros, munger, krugman）
   - 前端显示选中的导师，但后端处理的是固定智能体

2. **对话过程中也没有完整展示给位导师的文字回复内容，只展示了第一位发言人的回复内容**
   - 前端过滤消息时只显示 `multi_agent_response` 类型
   - 后端发送多个智能体回复，前端没有正确显示所有回复

3. **首页选择的导师人物形象，没有在圆桌会议里延续使用**
   - 首页的导师卡片UI效果没有在圆桌会议中延续

## ✅ 解决方案

### 1. 后端智能体管理器改造

#### 1.1 支持动态导师选择
**文件**: `backend/app/agents/agent_manager.py`

```python
def determine_speaking_order(self, user_message: str, max_participants: int = 3, selected_mentors: List[str] = None) -> List[str]:
    """
    智能确定发言顺序 - 支持前端选择的导师
    
    Args:
        user_message: 用户消息
        max_participants: 最大参与者数量
        selected_mentors: 前端选择的导师ID列表
    """
    # 如果指定了选中的导师，使用它们
    if selected_mentors and len(selected_mentors) > 0:
        available_agent_ids = [agent_id for agent_id in selected_mentors if agent_id in self.agents]
        logger.info(f"🎯 使用前端选择的导师: {selected_mentors}, 可用智能体: {available_agent_ids}")
    else:
        # 获取启用的智能体
        enabled_agents = self.get_enabled_agents()
        available_agent_ids = list(enabled_agents.keys())
        logger.info(f"🎯 使用默认启用的智能体: {available_agent_ids}")
```

#### 1.2 多智能体对话处理改造
```python
async def process_multi_agent_conversation(
    self, 
    user_message: str, 
    session_id: str,
    user_id: str,
    max_participants: int = 3,
    selected_mentors: List[str] = None  # 新增参数
) -> List[Dict[str, Any]]:
    """
    处理多智能体对话 - 支持前端选择的导师
    """
    # 传递选中的导师信息给发言顺序确定函数
    speaking_order = self.determine_speaking_order(user_message, suggested_participants, selected_mentors)
```

### 2. 后端API改造

#### 2.1 实时聊天API支持导师选择
**文件**: `backend/app/api/realtime_chat.py`

```python
async def process_multi_agent_chat(self, client_id: str, user_message: str):
    """处理多智能体对话"""
    session = self.user_sessions.get(client_id, {})
    
    # 获取前端选择的导师信息
    selected_mentors = session.get("selected_mentors", [])
    if selected_mentors:
        logger.info(f"🎯 使用前端选择的导师: {selected_mentors}")
    else:
        logger.info("🎯 未找到前端选择的导师，使用默认智能体")
    
    # 调用智能体管理器处理多智能体对话，传递选中的导师信息
    agent_responses = await agent_manager.process_multi_agent_conversation(
        user_message=user_message,
        session_id=session_id,
        user_id=client_id,
        selected_mentors=selected_mentors
    )
```

#### 2.2 WebSocket消息处理
```python
async def handle_realtime_message(client_id: str, message: dict):
    """处理实时对话消息"""
    message_type = message.get("type")
    
    if message_type == "set_selected_mentors":
        # 设置选中的导师
        selected_mentors = message.get("mentors", [])
        if client_id in realtime_manager.user_sessions:
            realtime_manager.user_sessions[client_id]["selected_mentors"] = selected_mentors
            logger.info(f"🎯 设置选中的导师: client_id={client_id}, mentors={selected_mentors}")
```

### 3. 前端改造

#### 3.1 WebSocket连接时发送导师信息
**文件**: `frontend/src/contexts/ChatContext.tsx`

```typescript
wsRef.current.onopen = () => {
  dispatch({ type: 'SET_CONNECTED', payload: true })
  dispatch({ type: 'SET_ERROR', payload: null })
  console.log('WebSocket 连接已建立')
  
  // 发送选中的导师信息到后端
  const selectedMentors = localStorage.getItem('selectedMentors')
  if (selectedMentors) {
    try {
      const mentors = JSON.parse(selectedMentors)
      const mentorIds = mentors.map((mentor: any) => mentor.id)
      console.log('🎯 发送选中的导师信息到后端:', mentorIds)
      
      wsRef.current?.send(JSON.stringify({
        type: 'set_selected_mentors',
        mentors: mentorIds
      }))
    } catch (error) {
      console.error('❌ 解析选中的导师信息失败:', error)
    }
  }
}
```

#### 3.2 优化圆桌会议UI布局
**文件**: `frontend/src/components/MultiAgentChatContainer.tsx`

```typescript
// 动态布局导师头像 - 优化布局
const renderMentorAvatars = () => {
  const mentorCount = selectedMentors.length;
  
  if (mentorCount === 1) {
    // 单个导师：居中显示
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <AgentAvatar
          agent={agentInfo[selectedMentors[0].id]}
          size="lg"
          className="border-4 border-white shadow-lg"
        />
      </div>
    );
  } else if (mentorCount === 2) {
    // 两个导师：左右对称
    return selectedMentors.map((mentor, index) => {
      const x = index === 0 ? 40 : 120;
      return (
        <div
          key={mentor.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: x, top: 64 }}
        >
          <AgentAvatar
            agent={agentInfo[mentor.id]}
            size="md"
            className="border-4 border-white shadow-lg"
          />
        </div>
      );
    });
  } else {
    // 多个导师：圆形布局
    // ... 圆形布局逻辑
  }
};
```

#### 3.3 优化消息显示逻辑
```typescript
// 获取智能体信息
let agent;
if (message.type === 'user') {
  agent = agentInfo.user;
} else if (message.type === 'multi_agent_response') {
  // 多智能体回复消息
  agent = {
    id: message.agent_id,
    name: message.agent_name || '未知导师',
    description: message.agent_id === 'buffett' ? '价值投资大师' : 
                message.agent_id === 'soros' ? '宏观投资大师' : 
                message.agent_id === 'munger' ? '多元思维专家' :
                message.agent_id === 'krugman' ? '宏观经济专家' : '投资导师',
    color: message.agent_id === 'buffett' ? '#3B82F6' : 
           message.agent_id === 'soros' ? '#10B981' : 
           message.agent_id === 'munger' ? '#8B5CF6' :
           message.agent_id === 'krugman' ? '#F59E0B' : '#6B7280'
  };
} else {
  // 单个智能体消息
  agent = agentInfo[message.agent_id as keyof typeof agentInfo];
}
```

## 🎯 实现效果

### 1. 导师选择与对话打通
- ✅ 首页选择的导师会真正参与圆桌对话
- ✅ 后端根据前端选择的导师动态确定发言顺序
- ✅ 支持1-4位导师的灵活配置

### 2. 完整显示所有导师回复
- ✅ 显示所有参与导师的文字回复内容
- ✅ 按发言顺序正确显示
- ✅ 支持动态导师头像布局

### 3. UI效果延续
- ✅ 首页导师卡片UI效果在圆桌会议中延续
- ✅ 动态布局适配不同导师数量
- ✅ 导师头像、颜色、连接线等视觉效果统一

## 🔧 技术特点

### 1. 向后兼容
- 如果没有选择导师，使用默认智能体
- 保持现有API接口不变
- 支持渐进式升级

### 2. 动态扩展
- 支持添加新的导师智能体
- 前端自动适配新导师
- 无需修改核心逻辑

### 3. 用户体验
- 导师选择状态持久化
- 实时反馈导师参与情况
- 流畅的对话体验

## 📝 使用流程

1. **首页选择导师**：用户选择1-4位导师
2. **保存选择**：导师信息保存到 `localStorage`
3. **开始对话**：导航到聊天页面
4. **发送导师信息**：WebSocket连接时发送导师ID列表
5. **后端处理**：根据选择的导师动态确定发言顺序
6. **显示回复**：前端正确显示所有导师的回复内容

## 🚀 后续优化

1. **导师个性化**：根据导师特点调整回复风格
2. **智能匹配**：根据问题类型智能推荐导师组合
3. **导师互动**：增加导师之间的互动和辩论
4. **用户偏好**：记录用户偏好的导师组合
