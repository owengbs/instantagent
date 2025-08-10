#!/usr/bin/env python3
"""
全流程调试脚本 - 模拟前端到后端的完整流程
"""
import json
import asyncio
import sys
import os

# 添加backend目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.agents.agent_manager import agent_manager
from backend.app.api.realtime_chat import RealtimeChatManager

async def test_full_flow():
    """测试完整的前端到后端流程"""
    
    print("🚀 开始完整流程测试")
    print("=" * 60)
    
    # 1. 模拟前端选择导师（MentorSelection组件）
    print("📱 步骤1: 前端导师选择")
    frontend_mentors = [
        {"id": "buffett", "name": "沃伦·巴菲特", "title": "CEO"},
        {"id": "munger", "name": "查理·芒格", "title": "副主席"}
    ]
    
    # 模拟localStorage存储
    selected_mentors_json = json.dumps(frontend_mentors)
    print(f"   localStorage存储: {selected_mentors_json}")
    
    # 2. 模拟ChatContext发送导师信息
    print("\n🌐 步骤2: 发送导师信息到后端")
    mentors = json.loads(selected_mentors_json)
    mentor_ids = [mentor["id"] for mentor in mentors]
    print(f"   提取的导师ID: {mentor_ids}")
    
    # 3. 模拟后端处理（RealtimeChatManager）
    print("\n🔧 步骤3: 后端处理导师选择")
    chat_manager = RealtimeChatManager()
    client_id = "test_client"
    
    # 初始化用户会话
    chat_manager.user_sessions[client_id] = {
        "session_id": f"test_session_{client_id}",
        "selected_mentors": mentor_ids  # 这是关键！
    }
    
    print(f"   后端会话存储: {chat_manager.user_sessions[client_id]}")
    
    # 4. 模拟用户发送消息
    print("\n💬 步骤4: 用户发送消息")
    user_message = "请分析一下价值投资的核心理念"
    print(f"   用户消息: {user_message}")
    
    # 5. 模拟后端处理对话
    print("\n🤖 步骤5: 后端处理多智能体对话")
    session = chat_manager.user_sessions.get(client_id, {})
    selected_mentors = session.get("selected_mentors", [])
    
    print(f"   会话中的选中导师: {selected_mentors}")
    
    # 调用智能体管理器
    max_participants = len(selected_mentors) if selected_mentors else 3
    print(f"   最大参与者数量: {max_participants}")
    
    try:
        agent_responses = await agent_manager.process_multi_agent_conversation(
            user_message=user_message,
            session_id=session.get("session_id", "test_session"),
            user_id=client_id,
            max_participants=max_participants,
            selected_mentors=selected_mentors
        )
        
        print(f"\n✅ 成功获得 {len(agent_responses)} 个智能体回复:")
        actual_participants = []
        for i, response in enumerate(agent_responses):
            agent_id = response['agent_id']
            agent_name = response['agent_name']
            actual_participants.append(agent_id)
            print(f"   {i+1}. {agent_name} ({agent_id})")
        
        # 6. 关键对比
        print(f"\n🔍 关键对比:")
        print(f"   前端选择的导师: {mentor_ids}")
        print(f"   实际参与的智能体: {actual_participants}")
        
        if set(mentor_ids) == set(actual_participants):
            print("   ✅ 前端选择与后端执行一致")
        else:
            print("   ❌ 前端选择与后端执行不一致")
            print(f"   ⚠️  只在前端: {set(mentor_ids) - set(actual_participants)}")
            print(f"   ⚠️  只在后端: {set(actual_participants) - set(mentor_ids)}")
            
    except Exception as e:
        print(f"❌ 对话处理失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_full_flow())
