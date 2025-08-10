#!/usr/bin/env python3
"""
调试动态导师注册问题
"""
import json
import asyncio
import sys
import os

# 添加backend目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.agents.agent_manager import agent_manager

async def test_dynamic_mentor_registration():
    """测试动态导师注册过程"""
    
    print("🔍 调试动态导师注册问题")
    print("=" * 60)
    
    # 1. 检查初始状态
    print("📋 初始注册的智能体:")
    for agent_id, agent in agent_manager.agents.items():
        config = agent_manager.agent_configs.get(agent_id, {})
        print(f"  - {agent_id}: {config.get('name', 'Unknown')} (动态: {config.get('is_dynamic', False)})")
    
    # 2. 生成动态导师
    print(f"\n🎯 生成动态导师")
    topic = "价值投资的核心理念"
    session_id = "test_session_debug"
    
    try:
        dynamic_mentors = await agent_manager.generate_dynamic_mentors(topic, session_id)
        print(f"✅ 成功生成 {len(dynamic_mentors)} 位动态导师")
        
        for mentor in dynamic_mentors:
            print(f"  📋 导师信息: {mentor}")
        
    except Exception as e:
        print(f"❌ 生成动态导师失败: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # 3. 检查注册后的状态
    print(f"\n📋 注册后的所有智能体:")
    for agent_id, agent in agent_manager.agents.items():
        config = agent_manager.agent_configs.get(agent_id, {})
        is_dynamic = config.get('is_dynamic', False)
        session = config.get('session_id', 'N/A')
        print(f"  - {agent_id}: {config.get('name', 'Unknown')} (动态: {is_dynamic}, 会话: {session})")
    
    # 4. 检查会话数据
    print(f"\n🗂️ 会话数据:")
    print(f"  dynamic_mentors[{session_id}]: {agent_manager.dynamic_mentors.get(session_id, 'None')}")
    print(f"  session_topics[{session_id}]: {agent_manager.session_topics.get(session_id, 'None')}")
    
    # 5. 模拟前端发送的导师ID
    print(f"\n🎯 模拟前端发送导师ID")
    # 假设前端发送的是动态导师返回的ID
    if dynamic_mentors:
        frontend_ids = [mentor.get('agent_id', mentor.get('id')) for mentor in dynamic_mentors[:2]]  # 选择前两个
        print(f"  前端选择的ID: {frontend_ids}")
        
        # 检查这些ID在agent_manager中是否存在
        available_mentors = [mid for mid in frontend_ids if mid in agent_manager.agents]
        print(f"  在agent_manager中找到: {available_mentors}")
        print(f"  缺失的ID: {set(frontend_ids) - set(available_mentors)}")
        
        # 如果有缺失，打印详细信息
        if len(available_mentors) < len(frontend_ids):
            print(f"\n❌ 问题诊断:")
            print(f"  注册的智能体ID: {list(agent_manager.agents.keys())}")
            print(f"  前端发送的ID: {frontend_ids}")
            print(f"  缺失的映射关系!")

if __name__ == "__main__":
    asyncio.run(test_dynamic_mentor_registration())
