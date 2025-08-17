#!/usr/bin/env python3
"""
动态导师完整流程测试脚本
测试从生成动态导师到与其对话的完整流程
"""

import asyncio
import websockets
import json
import time
import uuid
import logging
from typing import List, Dict, Any

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DynamicMentorTester:
    def __init__(self, base_url: str = "ws://localhost:8000"):
        self.base_url = base_url
        self.user_id = str(uuid.uuid4())
        self.session_id = None
        self.dynamic_mentors = []
        self.selected_mentor_ids = []
        
    def generate_session_id(self) -> str:
        """生成会话ID"""
        timestamp = int(time.time() * 1000)
        suffix = str(uuid.uuid4())[:8]
        return f"{self.user_id}_msg_{timestamp}_{suffix}"
    
    async def test_dynamic_mentor_generation(self, topic: str) -> bool:
        """测试动态导师生成"""
        logger.info(f"🧪 测试1: 动态导师生成 - 议题: '{topic}'")
        
        try:
            # 生成会话ID
            self.session_id = self.generate_session_id()
            logger.info(f"📝 生成会话ID: {self.session_id}")
            
            # 连接WebSocket
            ws_url = f"{self.base_url}/realtime/ws/{self.session_id}"
            logger.info(f"🔗 连接URL: {ws_url}")
            
            async with websockets.connect(ws_url) as websocket:
                # 发送生成请求
                request = {
                    "type": "generate_dynamic_mentors",
                    "topic": topic,
                    "session_id": self.session_id
                }
                logger.info(f"📤 发送生成请求: {request}")
                await websocket.send(json.dumps(request))
                
                # 等待响应
                response = await websocket.recv()
                data = json.loads(response)
                logger.info(f"📨 收到响应: {data['type']}")
                
                if data["type"] == "dynamic_mentors_generated":
                    self.dynamic_mentors = data["mentors"]
                    self.selected_mentor_ids = [m["agent_id"] for m in self.dynamic_mentors]
                    
                    logger.info(f"✅ 生成成功! 生成了 {len(self.dynamic_mentors)} 位导师:")
                    for mentor in self.dynamic_mentors:
                        logger.info(f"  - {mentor['name']} ({mentor['agent_id']})")
                    
                    return True
                else:
                    logger.error(f"❌ 生成失败: {data}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ 生成动态导师异常: {e}")
            return False
    
    async def test_mentor_registration_check(self) -> bool:
        """测试导师是否正确注册到agent_manager"""
        logger.info("🧪 测试2: 检查导师注册状态")
        
        try:
            # 直接调用后端检查
            from backend.app.agents.agent_manager import agent_manager
            
            logger.info(f"🔍 当前agent_manager中的所有智能体:")
            for agent_id in agent_manager.agents.keys():
                logger.info(f"  - {agent_id}")
            
            logger.info(f"🔍 当前dynamic_mentors中的会话:")
            for session_id, mentors in agent_manager.dynamic_mentors.items():
                logger.info(f"  - 会话 {session_id}: {mentors}")
            
            # 检查我们的动态导师是否在其中
            missing_mentors = []
            for mentor_id in self.selected_mentor_ids:
                if mentor_id not in agent_manager.agents:
                    missing_mentors.append(mentor_id)
            
            if missing_mentors:
                logger.error(f"❌ 以下导师未找到: {missing_mentors}")
                return False
            else:
                logger.info("✅ 所有动态导师都已正确注册")
                return True
                
        except Exception as e:
            logger.error(f"❌ 检查注册状态异常: {e}")
            return False
    
    async def test_conversation_flow(self, message: str) -> bool:
        """测试与动态导师的对话流程"""
        logger.info(f"🧪 测试3: 对话流程 - 消息: '{message}'")
        
        if not self.session_id or not self.selected_mentor_ids:
            logger.error("❌ 会话ID或导师ID为空")
            return False
        
        try:
            # 生成连接ID（模拟前端逻辑）
            connection_id = f"{self.user_id}_{self.session_id}"
            ws_url = f"{self.base_url}/realtime/ws/{connection_id}"
            logger.info(f"🔗 对话连接URL: {ws_url}")
            
            async with websockets.connect(ws_url) as websocket:
                # 等待欢迎消息
                welcome = await websocket.recv()
                logger.info(f"📨 收到欢迎消息: {json.loads(welcome)['type']}")
                
                # 发送导师选择
                mentor_request = {
                    "type": "set_selected_mentors",
                    "mentors": self.selected_mentor_ids
                }
                logger.info(f"📤 发送导师选择: {mentor_request}")
                await websocket.send(json.dumps(mentor_request))
                
                # 等待确认
                confirm = await websocket.recv()
                confirm_data = json.loads(confirm)
                logger.info(f"📨 导师设置确认: {confirm_data['type']}")
                
                # 发送对话消息
                chat_request = {
                    "type": "chat",
                    "message": message,
                    "user_id": self.user_id,
                    "session_id": self.session_id,
                    "chat_mode": "multi_agent"
                }
                logger.info(f"📤 发送对话消息: {chat_request}")
                await websocket.send(json.dumps(chat_request))
                
                # 收集响应
                responses = []
                timeout = 30  # 30秒超时
                start_time = time.time()
                
                while time.time() - start_time < timeout:
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        data = json.loads(response)
                        responses.append(data)
                        
                        logger.info(f"📨 收到响应: {data['type']}")
                        
                        if data["type"] == "multi_agent_response":
                            agent_id = data["agent_id"]
                            agent_name = data["agent_name"]
                            content = data["content"]
                            
                            logger.info(f"🤖 {agent_name} ({agent_id}): {content[:100]}...")
                            
                            # 检查是否是我们的动态导师
                            if agent_id in self.selected_mentor_ids:
                                logger.info(f"✅ 确认来自动态导师: {agent_id}")
                            else:
                                logger.warning(f"⚠️ 来自非动态导师: {agent_id}")
                        
                        elif data["type"] == "multi_agent_processing_complete":
                            logger.info("✅ 对话处理完成")
                            break
                            
                    except asyncio.TimeoutError:
                        logger.info("⏰ 等待响应超时，结束收集")
                        break
                
                # 分析结果
                agent_responses = [r for r in responses if r["type"] == "multi_agent_response"]
                dynamic_responses = [r for r in agent_responses if r["agent_id"] in self.selected_mentor_ids]
                
                logger.info(f"📊 对话结果分析:")
                logger.info(f"  - 总响应数: {len(agent_responses)}")
                logger.info(f"  - 动态导师响应数: {len(dynamic_responses)}")
                logger.info(f"  - 动态导师参与率: {len(dynamic_responses)/max(len(agent_responses), 1)*100:.1f}%")
                
                if len(dynamic_responses) > 0:
                    logger.info("✅ 动态导师成功参与对话!")
                    return True
                else:
                    logger.error("❌ 动态导师未参与对话!")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ 对话流程异常: {e}")
            return False
    
    async def run_full_test(self, topic: str = "人工智能对投资市场的影响", message: str = "请分析一下当前市场情况"):
        """运行完整测试流程"""
        logger.info("🚀 开始动态导师完整流程测试")
        logger.info("=" * 80)
        
        # 测试1: 生成动态导师
        step1_success = await self.test_dynamic_mentor_generation(topic)
        if not step1_success:
            logger.error("❌ 测试失败: 动态导师生成")
            return False
        
        # 等待一下让注册完成
        await asyncio.sleep(2)
        
        # 测试2: 检查注册状态
        step2_success = await self.test_mentor_registration_check()
        if not step2_success:
            logger.error("❌ 测试失败: 导师注册检查")
            return False
        
        # 测试3: 对话流程
        step3_success = await self.test_conversation_flow(message)
        if not step3_success:
            logger.error("❌ 测试失败: 对话流程")
            return False
        
        logger.info("=" * 80)
        logger.info("🎉 所有测试通过! 动态导师功能正常工作")
        return True

async def main():
    """主函数"""
    tester = DynamicMentorTester()
    
    # 可以修改测试参数
    topic = "人工智能对投资策略的影响"
    message = "你好，请分析一下当前AI技术对投资决策的帮助"
    
    success = await tester.run_full_test(topic, message)
    
    if not success:
        logger.error("🔥 测试失败! 请检查后端日志获取更多信息")
        exit(1)
    else:
        logger.info("🎯 测试成功! 动态导师功能工作正常")

if __name__ == "__main__":
    asyncio.run(main())
