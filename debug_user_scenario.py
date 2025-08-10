#!/usr/bin/env python3
"""
模拟用户实际使用场景
"""
import json
import asyncio
import sys
import os

# 添加backend目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.agents.agent_manager import agent_manager
from backend.app.api.realtime_chat import RealtimeChatManager

async def simulate_user_scenario():
    """模拟用户实际使用场景"""
    
    print("🎭 模拟用户实际使用场景")
    print("=" * 60)
    
    # 模拟用户场景：
    # 1. 用户在前端生成动态导师
    # 2. 用户选择部分导师开始对话
    # 3. 但中间可能有后端重启或会话丢失
    
    chat_manager = RealtimeChatManager()
    client_id = "user_client_123"
    
    # 1. 模拟前端生成动态导师的WebSocket消息处理
    print("📱 步骤1: 模拟前端生成动态导师")
    
    # 初始化用户会话
    chat_manager.user_sessions[client_id] = {
        "session_id": f"session_{client_id}",
    }
    
    # 模拟生成动态导师的消息
    generate_message = {
        "type": "generate_dynamic_mentors",
        "topic": "价值投资的基本理念",
        "session_id": f"dynamic_{client_id}_123"
    }
    
    try:
        # 调用生成动态导师
        topic = generate_message["topic"]
        session_id = generate_message["session_id"]
        
        print(f"  生成话题: {topic}")
        print(f"  会话ID: {session_id}")
        
        mentors = await agent_manager.generate_dynamic_mentors(topic, session_id)
        print(f"✅ 成功生成 {len(mentors)} 位动态导师")
        
        # 模拟保存到会话
        chat_manager.user_sessions[client_id]["session_id"] = session_id
        chat_manager.user_sessions[client_id]["topic"] = topic
        chat_manager.user_sessions[client_id]["dynamic_mentors"] = [m["agent_id"] for m in mentors]
        
        print(f"  保存的动态导师ID: {chat_manager.user_sessions[client_id]['dynamic_mentors']}")
        
    except Exception as e:
        print(f"❌ 生成失败: {e}")
        return
    
    # 2. 模拟用户选择导师并发送选择信息
    print(f"\n👤 步骤2: 模拟用户选择导师")
    
    # 假设用户只选择了前两个导师
    selected_mentor_ids = [mentors[0]["agent_id"], mentors[2]["agent_id"]]  # 例如 ['1', '3']
    print(f"  用户选择的导师ID: {selected_mentor_ids}")
    
    # 模拟前端发送选择的导师信息
    select_message = {
        "type": "set_selected_mentors",
        "mentors": selected_mentor_ids
    }
    
    # 保存到会话
    chat_manager.user_sessions[client_id]["selected_mentors"] = selected_mentor_ids
    print(f"  保存的选中导师: {chat_manager.user_sessions[client_id]['selected_mentors']}")
    
    # 3. 模拟用户发送对话消息
    print(f"\n💬 步骤3: 模拟用户发送对话消息")
    
    user_message = "请解释什么是价值投资的安全边际"
    print(f"  用户消息: {user_message}")
    
    # 模拟process_multi_agent_chat的逻辑
    session = chat_manager.user_sessions.get(client_id, {})
    session_id = session.get("session_id", f"multi_agent_{client_id}")
    selected_mentors = session.get("selected_mentors", [])
    dynamic_mentors = session.get("dynamic_mentors", [])
    
    print(f"\n🔍 会话状态检查:")
    print(f"  session_id: {session_id}")
    print(f"  selected_mentors: {selected_mentors}")
    print(f"  dynamic_mentors: {dynamic_mentors}")
    
    # 检查动态导师逻辑
    if dynamic_mentors:
        print(f"\n🎯 检查动态导师可用性:")
        available_mentors = [mid for mid in dynamic_mentors if mid in agent_manager.agents]
        print(f"  dynamic_mentors: {dynamic_mentors}")
        print(f"  在agent_manager中的: {available_mentors}")
        print(f"  缺失的: {set(dynamic_mentors) - set(available_mentors)}")
        
        if available_mentors:
            selected_mentors = available_mentors
            print(f"  ✅ 使用所有动态导师: {selected_mentors}")
        else:
            print(f"  ❌ 动态导师不可用!")
    
    # 检查用户选择的导师是否在agent_manager中
    print(f"\n🎯 检查用户选择的导师:")
    print(f"  用户选择: {session.get('selected_mentors', [])}")
    user_selected = session.get("selected_mentors", [])
    available_user_selected = [mid for mid in user_selected if mid in agent_manager.agents]
    print(f"  在agent_manager中的: {available_user_selected}")
    print(f"  缺失的: {set(user_selected) - set(available_user_selected)}")
    
    # 4. 最终诊断
    print(f"\n🏥 诊断结果:")
    print(f"  agent_manager中的所有智能体: {list(agent_manager.agents.keys())}")
    
    if len(available_user_selected) < len(user_selected):
        print(f"  ❌ 问题确认: 用户选择的导师在agent_manager中找不到")
        print(f"  🔧 可能原因:")
        print(f"     1. 后端重启导致动态导师丢失")
        print(f"     2. 会话ID不匹配")
        print(f"     3. 前端和后端的导师ID映射不一致")
    else:
        print(f"  ✅ 没有发现问题，导师都可以找到")

if __name__ == "__main__":
    asyncio.run(simulate_user_scenario())
