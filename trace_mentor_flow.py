#!/usr/bin/env python3
"""
追踪动态导师的完整数据流
"""
import asyncio
import sys
import os
import json

# 添加backend目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.agents.agent_manager import agent_manager
from backend.app.api.realtime_chat import RealtimeChatManager
from backend.app.api.mentors import get_mentor_avatar, get_mentor_color

async def trace_complete_flow():
    """完整追踪动态导师数据流"""
    
    print("🔍 追踪动态导师完整数据流")
    print("=" * 80)
    
    # 1. 生成动态导师
    topic = "价值投资的基本理念"
    session_id = "dynamic_1673894567123_test"
    
    print(f"📝 步骤1: 生成动态导师")
    print(f"   话题: {topic}")
    print(f"   会话ID: {session_id}")
    
    mentors_from_agent_manager = await agent_manager.generate_dynamic_mentors(topic, session_id)
    print(f"   agent_manager返回: {len(mentors_from_agent_manager)} 位导师")
    
    for i, mentor in enumerate(mentors_from_agent_manager):
        print(f"   导师 {i+1}: agent_id={mentor['agent_id']}, name={mentor['name']}")
    
    # 2. 模拟realtime_chat.py中的enriched_mentors处理
    print(f"\n🎨 步骤2: 后端增强导师数据 (realtime_chat.py)")
    enriched_mentors = []
    for m in mentors_from_agent_manager:
        agent_id = m.get("agent_id")
        enriched = {
            **m,
            "avatar": get_mentor_avatar(agent_id),
            "color": get_mentor_color(agent_id),
        }
        enriched_mentors.append(enriched)
        print(f"   增强导师: agent_id={agent_id}, avatar={enriched['avatar']}, color={enriched['color']}")
    
    # 3. 后端会话存储
    print(f"\n💾 步骤3: 后端会话存储")
    chat_manager = RealtimeChatManager()
    chat_manager.user_sessions[session_id] = {}
    chat_manager.user_sessions[session_id]["session_id"] = session_id
    chat_manager.user_sessions[session_id]["topic"] = topic
    chat_manager.user_sessions[session_id]["dynamic_mentors"] = [m["agent_id"] for m in enriched_mentors]
    
    print(f"   dynamic_mentors保存: {chat_manager.user_sessions[session_id]['dynamic_mentors']}")
    
    # 4. 模拟前端接收和转换
    print(f"\n📱 步骤4: 前端接收数据转换 (DynamicMentorGenerator.tsx)")
    
    # 模拟前端 data.mentors.map((mentor: any) => ({id: mentor.agent_id, ...}))
    frontend_mentors = []
    for mentor in enriched_mentors:
        frontend_mentor = {
            "id": mentor["agent_id"],  # 关键映射！
            "name": mentor["name"],
            "title": mentor["title"],
            "description": mentor["description"],
            "avatar": mentor["avatar"],
            "color": mentor["color"],
            "voice": mentor["voice"],
            "expertise": mentor.get("expertise", []),
            "personalityTraits": mentor.get("personality_traits", []),
            "investmentStyle": mentor.get("investment_style", ""),
            "famousQuotes": mentor.get("famous_quotes", []),
            "isEnabled": True,
            "isCustom": False,
            "isDynamic": True
        }
        frontend_mentors.append(frontend_mentor)
        print(f"   前端导师: id={frontend_mentor['id']}, name={frontend_mentor['name']}")
    
    # 5. 模拟用户选择
    print(f"\n👤 步骤5: 用户选择导师")
    selected_frontend_mentors = [frontend_mentors[0], frontend_mentors[2]]  # 选择第1和第3个
    selected_mentor_ids = [m["id"] for m in selected_frontend_mentors]
    print(f"   用户选择的frontend mentor IDs: {selected_mentor_ids}")
    
    # 6. 模拟前端发送选择信息到后端
    print(f"\n🌐 步骤6: 前端发送选择到后端 (ChatContext)")
    
    # 模拟 mentors.map((mentor: any) => mentor.id)
    mentorIds_sent_to_backend = [mentor["id"] for mentor in selected_frontend_mentors]
    print(f"   发送到后端的导师ID: {mentorIds_sent_to_backend}")
    
    # 保存到会话
    chat_manager.user_sessions[session_id]["selected_mentors"] = mentorIds_sent_to_backend
    
    # 7. 模拟对话处理
    print(f"\n💬 步骤7: 对话处理 (process_multi_agent_chat)")
    
    session = chat_manager.user_sessions.get(session_id, {})
    selected_mentors = session.get("selected_mentors", [])
    dynamic_mentors = session.get("dynamic_mentors", [])
    
    print(f"   从会话中获取:")
    print(f"     selected_mentors: {selected_mentors}")
    print(f"     dynamic_mentors: {dynamic_mentors}")
    
    # 检查动态导师可用性
    available_dynamic_mentors = [mid for mid in dynamic_mentors if mid in agent_manager.agents]
    print(f"   可用的动态导师: {available_dynamic_mentors}")
    
    if available_dynamic_mentors:
        if selected_mentors:
            user_selected_available = [mid for mid in selected_mentors if mid in available_dynamic_mentors]
            print(f"   用户选择的可用导师: {user_selected_available}")
            
            if user_selected_available:
                final_mentors = user_selected_available
                print(f"   ✅ 最终使用: {final_mentors}")
            else:
                final_mentors = available_dynamic_mentors
                print(f"   ⚠️ 用户选择不可用，使用所有动态导师: {final_mentors}")
        else:
            final_mentors = available_dynamic_mentors
            print(f"   ✅ 使用所有可用动态导师: {final_mentors}")
    else:
        print(f"   ❌ 动态导师不可用，回退到默认")
        final_mentors = ['buffett', 'munger', 'soros']
    
    # 8. 验证
    print(f"\n🏁 最终验证:")
    print(f"   计划参与对话的导师: {final_mentors}")
    
    # 检查这些导师的实际信息
    for mentor_id in final_mentors:
        if mentor_id in agent_manager.agents:
            agent = agent_manager.agents[mentor_id]
            print(f"   ✅ {mentor_id}: {agent.name} (类型: {type(agent).__name__})")
        else:
            print(f"   ❌ {mentor_id}: 不存在!")
    
    # 9. 问题诊断
    print(f"\n🔧 问题诊断:")
    
    all_ids_match = set(selected_mentor_ids) == set(final_mentors)
    if all_ids_match:
        print(f"   ✅ 用户选择和最终执行完全匹配")
    else:
        print(f"   ❌ 用户选择和最终执行不匹配!")
        print(f"       用户选择: {selected_mentor_ids}")
        print(f"       最终执行: {final_mentors}")
        print(f"       差异分析:")
        print(f"         只在用户选择中: {set(selected_mentor_ids) - set(final_mentors)}")
        print(f"         只在最终执行中: {set(final_mentors) - set(selected_mentor_ids)}")

if __name__ == "__main__":
    asyncio.run(trace_complete_flow())
