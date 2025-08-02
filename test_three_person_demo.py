#!/usr/bin/env python3
"""
三人圆桌对话演示脚本
演示芒格、巴菲特、索罗斯的智能对话
"""

import asyncio
import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.agents.agent_manager import agent_manager
from backend.app.agents.topic_analyzer import topic_analyzer

async def demo_three_person_conversation():
    """演示三人对话"""
    
    print("🎭 三人圆桌对话演示")
    print("="*60)
    
    # 测试问题
    test_questions = [
        {
            "question": "如何运用多元思维模型避免投资错误？",
            "expected_first": "munger",
            "description": "芒格专业话题"
        },
        {
            "question": "什么样的企业具有真正的护城河？",
            "expected_first": "buffett", 
            "description": "巴菲特专业话题"
        },
        {
            "question": "当前美联储政策对全球市场有什么影响？",
            "expected_first": "soros",
            "description": "索罗斯专业话题"
        }
    ]
    
    for i, test_case in enumerate(test_questions, 1):
        question = test_case["question"]
        expected = test_case["expected_first"]
        description = test_case["description"]
        
        print(f"\n🎯 测试 {i}: {description}")
        print(f"💬 用户问题: {question}")
        print("-" * 50)
        
        # 1. 话题分析
        analysis = topic_analyzer.analyze_topic_preference(question)
        print(f"📊 话题分析: 推荐={analysis.preferred_agent}, 置信度={analysis.confidence:.2f}")
        
        # 2. 发言顺序确定
        speaking_order = agent_manager.determine_speaking_order(question, 3)
        print(f"📋 发言顺序: {speaking_order}")
        
        # 验证首发是否正确
        if speaking_order and speaking_order[0] == expected:
            print(f"✅ 首发智能体正确: {speaking_order[0]}")
        else:
            print(f"⚠️  首发智能体: 期望={expected}, 实际={speaking_order[0] if speaking_order else 'None'}")
        
        print(f"🎪 参与者数量: {len(speaking_order)}人")
        
        # 显示智能体信息
        for j, agent_id in enumerate(speaking_order, 1):
            config = agent_manager.agent_configs.get(agent_id, {})
            print(f"   {j}. {config.get('name', agent_id)} - {config.get('description', '')}")
        
        print("="*60)

async def main():
    """主函数"""
    print("🚀 启动三人圆桌对话系统演示\n")
    
    # 显示系统信息
    print("🤖 已注册的智能体:")
    for agent_id, config in agent_manager.agent_configs.items():
        print(f"   - {config['name']}: {config['description']}")
    
    print(f"\n💡 总计: {len(agent_manager.agents)} 位投资大师")
    
    # 运行演示
    await demo_three_person_conversation()
    
    print("\n🎉 演示完成！")
    print("💡 现在系统支持:")
    print("   ✅ 智能话题识别")
    print("   ✅ 动态发言顺序")  
    print("   ✅ 三人圆桌对话")
    print("   ✅ 个性化学习")
    print("   ✅ 完整前端支持")

if __name__ == "__main__":
    asyncio.run(main())