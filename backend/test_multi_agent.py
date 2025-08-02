#!/usr/bin/env python3
"""
多智能体系统测试脚本
"""
import asyncio
import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.agents.agent_manager import agent_manager
from backend.app.agents.customer_agent import customer_agent

async def test_multi_agent_conversation():
    """测试多智能体对话"""
    print("🧪 开始测试多智能体对话系统...")
    
    # 测试用户消息
    user_message = "如何看待当前的市场波动？"
    session_id = "test_session_001"
    user_id = "test_user_001"
    
    print(f"📝 用户消息: {user_message}")
    
    try:
        # 调用多智能体对话
        responses = await agent_manager.process_multi_agent_conversation(
            user_message=user_message,
            session_id=session_id,
            user_id=user_id
        )
        
        print(f"✅ 多智能体对话完成，共 {len(responses)} 个回复")
        
        # 显示每个智能体的回复
        for i, response in enumerate(responses, 1):
            print(f"\n🤖 {response['agent_name']} (第{response['order']}位回复):")
            print(f"   内容: {response['content']}")
            print(f"   语音: {response['voice']}")
            print(f"   时间: {response['timestamp']}")
        
        # 测试会话历史
        history = agent_manager.get_conversation_history(session_id)
        print(f"\n📚 会话历史记录数: {len(history)}")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_individual_agents():
    """测试单个智能体"""
    print("\n🧪 测试单个智能体...")
    
    # 测试巴菲特智能体
    print("\n🤖 测试巴菲特智能体:")
    buffett_agent = agent_manager.get_agent('buffett')
    if buffett_agent:
        response = await buffett_agent.generate_response("什么是价值投资？")
        print(f"   回复: {response}")
    else:
        print("   ❌ 巴菲特智能体未找到")
    
    # 测试索罗斯智能体
    print("\n🤖 测试索罗斯智能体:")
    soros_agent = agent_manager.get_agent('soros')
    if soros_agent:
        response = await soros_agent.generate_response("什么是宏观投资？")
        print(f"   回复: {response}")
    else:
        print("   ❌ 索罗斯智能体未找到")

async def main():
    """主测试函数"""
    print("🚀 多智能体系统测试开始")
    print("=" * 50)
    
    # 初始化customer_agent
    print("🔧 初始化customer_agent...")
    try:
        await customer_agent.initialize()
        print("✅ customer_agent初始化成功")
    except Exception as e:
        print(f"❌ customer_agent初始化失败: {e}")
        return
    
    # 测试单个智能体
    await test_individual_agents()
    
    print("\n" + "=" * 50)
    
    # 测试多智能体对话
    success = await test_multi_agent_conversation()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ 所有测试通过！")
    else:
        print("❌ 测试失败！")
    
    print("🏁 测试结束")

if __name__ == "__main__":
    asyncio.run(main()) 