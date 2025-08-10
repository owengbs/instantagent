#!/usr/bin/env python3
"""
调试导师选择问题的脚本
"""
import json
import asyncio
import sys
import os

# 添加backend目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.agents.agent_manager import agent_manager

async def test_mentor_selection():
    """测试导师选择功能"""
    
    print("🔍 开始调试导师选择问题")
    print("=" * 50)
    
    # 1. 检查已注册的智能体
    print("📋 已注册的智能体:")
    for agent_id, agent in agent_manager.agents.items():
        config = agent_manager.agent_configs.get(agent_id, {})
        print(f"  - {agent_id}: {config.get('name', 'Unknown')} (enabled: {config.get('enabled', False)})")
    
    print()
    
    # 2. 测试前端可能发送的导师ID
    frontend_selected_mentors = ['buffett', 'munger', 'soros']
    print(f"🎯 前端选择的导师ID: {frontend_selected_mentors}")
    
    # 3. 测试determine_speaking_order
    test_message = "请分析一下当前市场的投资机会"
    speaking_order = agent_manager.determine_speaking_order(
        user_message=test_message,
        max_participants=3,
        selected_mentors=frontend_selected_mentors
    )
    
    print(f"📋 确定的发言顺序: {speaking_order}")
    print()
    
    # 4. 测试完整的多智能体对话流程
    print("🚀 测试完整对话流程:")
    try:
        responses = await agent_manager.process_multi_agent_conversation(
            user_message=test_message,
            session_id="debug_session",
            user_id="debug_user",
            max_participants=len(frontend_selected_mentors),
            selected_mentors=frontend_selected_mentors
        )
        
        print(f"✅ 成功获得 {len(responses)} 个回复:")
        for i, response in enumerate(responses):
            print(f"  {i+1}. {response['agent_name']} ({response['agent_id']})")
            print(f"     内容: {response['content'][:100]}...")
            print()
            
    except Exception as e:
        print(f"❌ 对话流程测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_mentor_selection())
