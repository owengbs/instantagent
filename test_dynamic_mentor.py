#!/usr/bin/env python3
"""
动态导师生成功能测试脚本
"""
import asyncio
import json
import logging
from datetime import datetime

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_dynamic_mentor_generation():
    """测试动态导师生成功能"""
    
    # 导入动态导师生成器
    from backend.app.agents.dynamic_mentor_generator import dynamic_mentor_generator
    from backend.app.agents.agent_manager import agent_manager
    
    logger.info("🧪 开始测试动态导师生成功能")
    
    # 测试议题
    test_topics = [
        "人工智能对投资市场的影响",
        "ESG投资策略分析",
        "加密货币投资风险与机遇",
        "宏观经济政策对股市的影响"
    ]
    
    for i, topic in enumerate(test_topics, 1):
        logger.info(f"\n📝 测试议题 {i}: {topic}")
        
        try:
            # 生成动态导师
            session_id = f"test_session_{i}_{int(datetime.now().timestamp())}"
            mentors = await agent_manager.generate_dynamic_mentors(topic, session_id)
            
            logger.info(f"✅ 成功生成 {len(mentors)} 位导师")
            
            # 打印导师信息
            for j, mentor in enumerate(mentors, 1):
                logger.info(f"\n🎯 导师 {j}:")
                logger.info(f"  ID: {mentor['agent_id']}")
                logger.info(f"  姓名: {mentor['name']}")
                logger.info(f"  头衔: {mentor.get('title', 'N/A')}")
                logger.info(f"  语音: {mentor.get('voice', 'N/A')}")
                logger.info(f"  投资风格: {mentor.get('investment_style', 'N/A')}")
                logger.info(f"  专业领域: {', '.join(mentor.get('expertise', []))}")
                logger.info(f"  性格特征: {', '.join(mentor.get('personality_traits', []))}")
                logger.info(f"  经典名言: {mentor.get('famous_quotes', [])}")
            
            # 测试导师对话功能
            logger.info(f"\n💬 测试导师对话功能...")
            test_message = "请分析一下当前市场的投资机会"
            
            for mentor in mentors[:2]:  # 只测试前两位导师
                agent_id = mentor['agent_id']
                agent = agent_manager.get_agent(agent_id)
                if agent:
                    response = await agent.generate_response(test_message)
                    logger.info(f"  {mentor['name']}: {response[:100]}...")
                else:
                    logger.error(f"  ❌ 找不到导师: {agent_id}")
            
            # 清理测试导师
            agent_manager.cleanup_dynamic_mentors(session_id)
            logger.info(f"🗑️ 清理测试会话: {session_id}")
            
        except Exception as e:
            logger.error(f"❌ 测试失败: {e}")
            continue
    
    logger.info("\n🎉 动态导师生成功能测试完成")

async def test_mentor_persistence():
    """测试导师持久化功能"""
    
    from backend.app.agents.agent_manager import agent_manager
    
    logger.info("\n🧪 测试导师持久化功能")
    
    # 创建测试会话
    session_id = f"persistence_test_{int(datetime.now().timestamp())}"
    topic = "测试持久化功能"
    
    try:
        # 生成导师
        mentors = await agent_manager.generate_dynamic_mentors(topic, session_id)
        logger.info(f"✅ 生成 {len(mentors)} 位导师")
        
        # 验证导师已注册
        for mentor in mentors:
            agent_id = mentor['agent_id']
            agent = agent_manager.get_agent(agent_id)
            if agent:
                logger.info(f"✅ 导师已注册: {agent_id}")
            else:
                logger.error(f"❌ 导师未注册: {agent_id}")
        
        # 获取会话导师
        session_mentors = agent_manager.get_session_dynamic_mentors(session_id)
        logger.info(f"✅ 获取会话导师: {len(session_mentors)} 位")
        
        # 获取会话议题
        session_topic = agent_manager.get_session_topic(session_id)
        logger.info(f"✅ 获取会话议题: {session_topic}")
        
        # 清理导师
        agent_manager.cleanup_dynamic_mentors(session_id)
        logger.info(f"✅ 清理导师完成")
        
        # 验证清理结果
        session_mentors_after = agent_manager.get_session_dynamic_mentors(session_id)
        if len(session_mentors_after) == 0:
            logger.info("✅ 导师清理验证成功")
        else:
            logger.error(f"❌ 导师清理验证失败: 仍有 {len(session_mentors_after)} 位导师")
            
    except Exception as e:
        logger.error(f"❌ 持久化测试失败: {e}")

async def main():
    """主测试函数"""
    logger.info("🚀 开始动态导师功能测试")
    
    # 测试动态导师生成
    await test_dynamic_mentor_generation()
    
    # 测试导师持久化
    await test_mentor_persistence()
    
    logger.info("🎉 所有测试完成")

if __name__ == "__main__":
    asyncio.run(main())
