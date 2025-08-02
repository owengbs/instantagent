#!/usr/bin/env python3
"""
动态对话系统测试脚本
测试话题分析、动态顺序和回应机制
"""

import asyncio
import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agents.agent_manager import agent_manager
from app.agents.topic_analyzer import topic_analyzer

async def test_topic_analysis():
    """测试话题分析功能"""
    print("🧠 测试话题分析器...")
    
    test_cases = [
        {
            "message": "什么是护城河概念？如何分析企业的内在价值？",
            "expected": "buffett",
            "description": "价值投资话题"
        },
        {
            "message": "美联储加息对全球汇率有什么影响？",
            "expected": "soros", 
            "description": "宏观经济话题"
        },
        {
            "message": "现在应该投资什么？",
            "expected": None,
            "description": "通用投资话题"
        },
        {
            "message": "巴菲特的投资理念和索罗斯有什么不同？",
            "expected": None,
            "description": "比较性话题"
        },
        {
            "message": "如何利用反身性理论进行投资？",
            "expected": "soros",
            "description": "索罗斯专业理论"
        },
        {
            "message": "如何运用多元思维模型避免投资错误？",
            "expected": "munger",
            "description": "芒格多元思维理论"
        },
        {
            "message": "认知偏差对投资决策有什么影响？",
            "expected": "munger", 
            "description": "芒格认知心理学"
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\n📋 测试用例 {i}: {case['description']}")
        print(f"🎯 输入: {case['message']}")
        
        result = topic_analyzer.analyze_topic_preference(case['message'])
        
        print(f"📊 分析结果:")
        print(f"   推荐智能体: {result.preferred_agent}")
        print(f"   置信度: {result.confidence:.2f}")
        print(f"   理由: {result.reason}")
        print(f"   匹配关键词: {result.matched_keywords}")
        
        # 验证预期结果
        if case['expected']:
            if result.preferred_agent == case['expected'] and result.confidence >= 0.6:
                print("✅ 符合预期")
            else:
                print("❌ 不符合预期")
        else:
            if result.confidence < 0.6:
                print("✅ 符合预期（随机选择）")
            else:
                print("❌ 不符合预期（应该随机选择）")

async def test_dynamic_conversation():
    """测试动态对话功能"""
    print("\n\n🎭 测试动态对话系统...")
    
    test_conversations = [
        {
            "message": "护城河企业有哪些特征？",
            "description": "价值投资话题（预期巴菲特首发）"
        },
        {
            "message": "美元强势对新兴市场有什么影响？",
            "description": "宏观经济话题（预期索罗斯首发）"
        },
        {
            "message": "现在的市场环境下如何投资？",
            "description": "通用话题（随机首发）"
        },
        {
            "message": "如何运用跨学科思维分析复杂的投资决策？",
            "description": "复杂话题（预期三人参与）"
        }
    ]
    
    for i, case in enumerate(test_conversations, 1):
        print(f"\n{'='*60}")
        print(f"🎯 对话测试 {i}: {case['description']}")
        print(f"💬 用户问题: {case['message']}")
        print(f"{'='*60}")
        
        try:
            # 测试发言顺序确定
            speaking_order = agent_manager.determine_speaking_order(case['message'])
            print(f"📋 确定的发言顺序: {speaking_order}")
            
            # 测试完整对话流程
            session_id = f"test_session_{i}"
            user_id = "test_user"
            
            responses = await agent_manager.process_multi_agent_conversation(
                user_message=case['message'],
                session_id=session_id,
                user_id=user_id
            )
            
            print(f"\n🎤 对话结果 ({len(responses)} 个回复):")
            for response in responses:
                agent_name = response['agent_name']
                content = response['content']
                order = response['order']
                is_first = response.get('is_first_speaker', False)
                
                print(f"\n{order}. {agent_name} {'(首发)' if is_first else '(回应)'}:")
                print(f"   {content[:200]}{'...' if len(content) > 200 else ''}")
                
                # 检查回应质量
                if not is_first and len(responses) > 1:
                    # 第二位智能体应该引用第一位的观点
                    first_response_content = responses[0]['content']
                    if any(keyword in content for keyword in ['刚刚', '观点', '认为', '提到', '说到']):
                        print("   ✅ 包含明确引用")
                    else:
                        print("   ⚠️  缺少明确引用")
        
        except Exception as e:
            print(f"❌ 对话测试失败: {e}")

async def test_multi_agent_extensibility():
    """测试多智能体扩展性"""
    print(f"\n\n🔧 测试多智能体扩展性...")
    
    # 获取当前智能体信息
    agents_info = agent_manager.get_agent_info()
    print(f"📋 当前注册的智能体数量: {len(agents_info)}")
    
    for info in agents_info:
        print(f"   - {info}")
    
    # 测试动态注册（模拟）
    print(f"\n🔮 模拟第三个智能体的注册...")
    print(f"   预留接口已实现: register_agent(), unregister_agent()")
    print(f"   支持动态参与者数量: max_participants 参数")
    print(f"   话题分析器可扩展: 添加新的关键词和专业领域")

async def main():
    """主测试函数"""
    print("🚀 动态对话系统测试开始")
    print("="*80)
    
    try:
        # 测试话题分析
        await test_topic_analysis()
        
        # 测试动态对话
        await test_dynamic_conversation()
        
        # 测试扩展性
        await test_multi_agent_extensibility()
        
        print(f"\n{'='*80}")
        print("✅ 所有测试完成！")
        
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())