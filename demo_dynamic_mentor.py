#!/usr/bin/env python3
"""
动态导师功能演示脚本
"""
import asyncio
import json
import logging
from datetime import datetime

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def demo_dynamic_mentor_generation():
    """演示动态导师生成功能"""
    
    logger.info("🎯 动态导师功能演示")
    logger.info("=" * 50)
    
    # 导入必要的模块
    from backend.app.agents.dynamic_mentor_generator import dynamic_mentor_generator
    from backend.app.agents.agent_manager import agent_manager
    
    # 演示议题
    demo_topics = [
        {
            "topic": "人工智能对投资市场的影响",
            "description": "探讨AI技术如何改变传统投资策略"
        },
        {
            "topic": "ESG投资策略分析", 
            "description": "分析环境、社会和治理因素对投资决策的影响"
        }
    ]
    
    for i, demo in enumerate(demo_topics, 1):
        logger.info(f"\n📝 演示 {i}: {demo['topic']}")
        logger.info(f"描述: {demo['description']}")
        
        try:
            # 生成动态导师
            session_id = f"demo_session_{i}_{int(datetime.now().timestamp())}"
            mentors = await agent_manager.generate_dynamic_mentors(demo['topic'], session_id)
            
            logger.info(f"✅ 成功生成 {len(mentors)} 位导师")
            
            # 显示导师信息
            for j, mentor in enumerate(mentors, 1):
                logger.info(f"\n🎯 导师 {j}: {mentor['name']}")
                logger.info(f"   头衔: {mentor.get('title', 'N/A')}")
                logger.info(f"   语音: {mentor.get('voice', 'N/A')}")
                logger.info(f"   投资风格: {mentor.get('investment_style', 'N/A')}")
                logger.info(f"   专业领域: {', '.join(mentor.get('expertise', []))}")
                logger.info(f"   性格特征: {', '.join(mentor.get('personality_traits', []))}")
                logger.info(f"   经典名言: {mentor.get('famous_quotes', [])}")
            
            # 测试对话功能
            logger.info(f"\n💬 测试对话功能...")
            test_messages = [
                "请分析一下当前市场的投资机会",
                "您如何看待风险控制？",
                "能分享一下您的投资哲学吗？"
            ]
            
            for msg in test_messages:
                logger.info(f"\n用户: {msg}")
                
                # 选择前两位导师进行对话测试
                for mentor in mentors[:2]:
                    agent_id = mentor['agent_id']
                    agent = agent_manager.get_agent(agent_id)
                    if agent:
                        response = await agent.generate_response(msg)
                        logger.info(f"{mentor['name']}: {response[:100]}...")
                    else:
                        logger.error(f"❌ 找不到导师: {agent_id}")
            
            # 清理导师
            agent_manager.cleanup_dynamic_mentors(session_id)
            logger.info(f"🗑️ 清理演示会话: {session_id}")
            
        except Exception as e:
            logger.error(f"❌ 演示失败: {e}")
            continue
    
    logger.info("\n🎉 动态导师功能演示完成")

async def demo_api_endpoints():
    """演示API端点功能"""
    
    logger.info("\n🌐 API端点演示")
    logger.info("=" * 50)
    
    import httpx
    
    base_url = "http://localhost:8000"
    
    # 演示议题
    demo_topic = "量化投资策略分析"
    session_id = f"api_demo_{int(datetime.now().timestamp())}"
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. 生成动态导师
            logger.info(f"1. 生成动态导师: {demo_topic}")
            response = await client.post(
                f"{base_url}/mentors/dynamic/generate",
                json={
                    "topic": demo_topic,
                    "session_id": session_id
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ 成功生成 {len(data['mentors'])} 位导师")
                
                # 显示导师信息
                for i, mentor in enumerate(data['mentors'], 1):
                    logger.info(f"   导师 {i}: {mentor['name']} ({mentor['voice']})")
            else:
                logger.error(f"❌ 生成导师失败: {response.status_code}")
                return
            
            # 2. 获取会话导师
            logger.info(f"\n2. 获取会话导师: {session_id}")
            response = await client.get(f"{base_url}/mentors/dynamic/{session_id}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ 获取到 {len(data['mentors'])} 位导师")
                logger.info(f"   议题: {data['topic']}")
            else:
                logger.error(f"❌ 获取导师失败: {response.status_code}")
            
            # 3. 清理会话导师
            logger.info(f"\n3. 清理会话导师: {session_id}")
            response = await client.delete(f"{base_url}/mentors/dynamic/{session_id}")
            
            if response.status_code == 200:
                logger.info("✅ 清理导师成功")
            else:
                logger.error(f"❌ 清理导师失败: {response.status_code}")
                
    except Exception as e:
        logger.error(f"❌ API演示失败: {e}")

async def demo_websocket():
    """演示WebSocket功能"""
    
    logger.info("\n🔌 WebSocket演示")
    logger.info("=" * 50)
    
    import websockets
    import json
    
    try:
        # 连接到WebSocket
        uri = "ws://localhost:8000/realtime/ws/demo_client"
        async with websockets.connect(uri) as websocket:
            logger.info("✅ WebSocket连接成功")
            
            # 发送生成动态导师消息
            demo_topic = "WebSocket测试议题"
            session_id = f"ws_demo_{int(datetime.now().timestamp())}"
            
            message = {
                "type": "generate_dynamic_mentors",
                "topic": demo_topic,
                "session_id": session_id
            }
            
            logger.info(f"📤 发送消息: {message}")
            await websocket.send(json.dumps(message))
            
            # 接收响应
            response = await websocket.recv()
            data = json.loads(response)
            
            if data['type'] == 'dynamic_mentors_generated':
                logger.info(f"✅ 成功生成 {len(data['mentors'])} 位导师")
                for i, mentor in enumerate(data['mentors'], 1):
                    logger.info(f"   导师 {i}: {mentor['name']} ({mentor['voice']})")
            else:
                logger.error(f"❌ 生成失败: {data}")
                
    except Exception as e:
        logger.error(f"❌ WebSocket演示失败: {e}")

async def main():
    """主演示函数"""
    logger.info("🚀 开始动态导师功能演示")
    
    # 演示核心功能
    await demo_dynamic_mentor_generation()
    
    # 演示API端点
    await demo_api_endpoints()
    
    # 演示WebSocket
    await demo_websocket()
    
    logger.info("\n🎉 所有演示完成")

if __name__ == "__main__":
    asyncio.run(main())
