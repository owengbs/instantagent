#!/usr/bin/env python3
"""
测试动态导师会话管理
"""
import asyncio
import sys
import os

# 添加backend目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.agents.agent_manager import agent_manager
from backend.app.api.realtime_chat import RealtimeChatManager

async def test_dynamic_session_flow():
    """测试动态导师会话的完整流程"""
    
    print("🔍 测试动态导师会话管理")
    print("=" * 60)
    
    chat_manager = RealtimeChatManager()
    
    # 模拟动态导师生成流程
    session_id = "dynamic_1673894567123_abc123def"  # 前端生成的会话ID
    topic = "价值投资的核心理念"
    
    print(f"📱 步骤1: 模拟动态导师生成")
    print(f"   会话ID: {session_id}")
    print(f"   话题: {topic}")
    
    # 1. 初始化用户会话（模拟WebSocket连接）
    chat_manager.user_sessions[session_id] = {
        "session_id": session_id,
    }
    
    # 2. 生成动态导师（模拟generate_dynamic_mentors消息处理）
    try:
        mentors = await agent_manager.generate_dynamic_mentors(topic, session_id)
        print(f"✅ 生成了 {len(mentors)} 位动态导师")
        
        # 保存会话信息（模拟realtime_chat.py中的逻辑）
        chat_manager.user_sessions[session_id]["session_id"] = session_id
        chat_manager.user_sessions[session_id]["topic"] = topic
        chat_manager.user_sessions[session_id]["dynamic_mentors"] = [m["agent_id"] for m in mentors]
        
        print(f"   动态导师ID: {chat_manager.user_sessions[session_id]['dynamic_mentors']}")
        
    except Exception as e:
        print(f"❌ 生成失败: {e}")
        return
    
    # 3. 模拟用户选择导师（模拟set_selected_mentors消息）
    print(f"\n👤 步骤2: 模拟用户选择导师")
    selected_mentor_ids = [mentors[0]["agent_id"], mentors[2]["agent_id"]]  # 选择第1和第3个
    chat_manager.user_sessions[session_id]["selected_mentors"] = selected_mentor_ids
    print(f"   用户选择: {selected_mentor_ids}")
    
    # 4. 模拟用户发送对话消息
    print(f"\n💬 步骤3: 模拟对话处理")
    user_message = "请解释价值投资的安全边际概念"
    print(f"   用户消息: {user_message}")
    
    # 获取会话数据（模拟process_multi_agent_chat的逻辑）
    session = chat_manager.user_sessions.get(session_id, {})
    retrieved_session_id = session.get("session_id", f"multi_agent_{session_id}")
    selected_mentors = session.get("selected_mentors", [])
    dynamic_mentors = session.get("dynamic_mentors", [])
    
    print(f"\n🔍 会话数据检查:")
    print(f"   client_id: {session_id}")
    print(f"   检索到的session_id: {retrieved_session_id}")
    print(f"   selected_mentors: {selected_mentors}")
    print(f"   dynamic_mentors: {dynamic_mentors}")
    
    # 5. 检查动态导师可用性
    if dynamic_mentors:
        available_dynamic_mentors = [mid for mid in dynamic_mentors if mid in agent_manager.agents]
        print(f"\n🎯 动态导师可用性检查:")
        print(f"   dynamic_mentors: {dynamic_mentors}")
        print(f"   在agent_manager中的: {available_dynamic_mentors}")
        print(f"   缺失的: {set(dynamic_mentors) - set(available_dynamic_mentors)}")
        
        if available_dynamic_mentors:
            if selected_mentors:
                user_selected_available = [mid for mid in selected_mentors if mid in available_dynamic_mentors]
                if user_selected_available:
                    final_mentors = user_selected_available
                    print(f"   ✅ 最终使用: {final_mentors} (用户选择的可用动态导师)")
                else:
                    final_mentors = available_dynamic_mentors
                    print(f"   ⚠️ 最终使用: {final_mentors} (用户选择不可用，使用所有动态导师)")
            else:
                final_mentors = available_dynamic_mentors
                print(f"   ✅ 最终使用: {final_mentors} (所有可用动态导师)")
        else:
            print(f"   ❌ 动态导师完全不可用，会回退到默认导师")
            final_mentors = ['buffett', 'munger', 'soros']
    else:
        print(f"   ❌ 没有动态导师数据")
        final_mentors = ['buffett', 'munger', 'soros']
    
    # 6. 验证最终结果
    print(f"\n🏁 最终结果:")
    print(f"   计划使用的导师: {final_mentors}")
    
    # 检查这些导师是否在agent_manager中
    available_final = [mid for mid in final_mentors if mid in agent_manager.agents]
    print(f"   实际可用的导师: {available_final}")
    
    if set(final_mentors) == set(available_final):
        print(f"   ✅ 所有计划导师都可用")
    else:
        print(f"   ❌ 部分导师不可用: {set(final_mentors) - set(available_final)}")

if __name__ == "__main__":
    asyncio.run(test_dynamic_session_flow())
