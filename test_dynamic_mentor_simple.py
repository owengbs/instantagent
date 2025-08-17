#!/usr/bin/env python3
"""
简化的动态导师测试脚本
直接调用后端组件进行测试
"""

import sys
import os
import asyncio
import uuid
import time
import logging

# 添加后端路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.agents.agent_manager import agent_manager
from backend.app.agents.dynamic_mentor_generator import dynamic_mentor_generator

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DynamicMentorSimpleTest:
    def __init__(self):
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
        logger.info(f"🧪 测试1: 动态导师生成")
        logger.info(f"📝 议题: '{topic}'")
        
        try:
            # 生成会话ID
            self.session_id = self.generate_session_id()
            logger.info(f"📝 会话ID: {self.session_id}")
            
            # 调用动态导师生成
            mentors = await agent_manager.generate_dynamic_mentors(topic, self.session_id)
            
            if mentors:
                self.dynamic_mentors = mentors
                self.selected_mentor_ids = [m["agent_id"] for m in mentors]
                
                logger.info(f"✅ 生成成功! 生成了 {len(mentors)} 位导师:")
                for mentor in mentors:
                    logger.info(f"  - {mentor['name']} ({mentor['agent_id']})")
                
                return True
            else:
                logger.error("❌ 生成失败: 返回空列表")
                return False
                
        except Exception as e:
            logger.error(f"❌ 生成动态导师异常: {e}")
            return False
    
    def test_mentor_registration_check(self) -> bool:
        """测试导师是否正确注册到agent_manager"""
        logger.info("🧪 测试2: 检查导师注册状态")
        
        try:
            logger.info(f"🔍 当前agent_manager.agents中的智能体 ({len(agent_manager.agents)}):")
            for agent_id in list(agent_manager.agents.keys()):
                if agent_id.startswith('dynamic_'):
                    logger.info(f"  - [动态] {agent_id}")
                else:
                    logger.info(f"  - [静态] {agent_id}")
            
            logger.info(f"🔍 当前agent_manager.dynamic_mentors:")
            for session_id, mentors in agent_manager.dynamic_mentors.items():
                logger.info(f"  - 会话 {session_id}: {len(mentors)} 位导师")
                for mentor_id in mentors:
                    logger.info(f"    * {mentor_id}")
            
            # 检查我们的动态导师是否在其中
            missing_mentors = []
            for mentor_id in self.selected_mentor_ids:
                if mentor_id not in agent_manager.agents:
                    missing_mentors.append(mentor_id)
            
            if missing_mentors:
                logger.error(f"❌ 以下导师未在agents中找到: {missing_mentors}")
                return False
            
            # 检查session是否在dynamic_mentors中
            if self.session_id not in agent_manager.dynamic_mentors:
                logger.error(f"❌ 会话 {self.session_id} 未在dynamic_mentors中找到")
                return False
            
            session_mentors = agent_manager.dynamic_mentors[self.session_id]
            missing_in_session = []
            for mentor_id in self.selected_mentor_ids:
                if mentor_id not in session_mentors:
                    missing_in_session.append(mentor_id)
            
            if missing_in_session:
                logger.error(f"❌ 以下导师未在会话的dynamic_mentors中找到: {missing_in_session}")
                return False
            
            logger.info("✅ 所有动态导师都已正确注册")
            return True
                
        except Exception as e:
            logger.error(f"❌ 检查注册状态异常: {e}")
            return False
    
    async def test_conversation_simulation(self, message: str) -> bool:
        """模拟对话流程"""
        logger.info(f"🧪 测试3: 模拟对话流程")
        logger.info(f"📝 消息: '{message}'")
        
        if not self.session_id or not self.selected_mentor_ids:
            logger.error("❌ 会话ID或导师ID为空")
            return False
        
        try:
            # 模拟调用多智能体对话
            logger.info("🔄 调用多智能体对话处理...")
            
            responses = await agent_manager.process_multi_agent_conversation(
                user_message=message,
                session_id=self.session_id,
                user_id=self.user_id,
                max_participants=len(self.selected_mentor_ids),
                selected_mentors=self.selected_mentor_ids
            )
            
            if responses:
                logger.info(f"📊 对话结果分析:")
                logger.info(f"  - 总响应数: {len(responses)}")
                
                dynamic_responses = []
                for response in responses:
                    agent_id = response["agent_id"]
                    agent_name = response["agent_name"]
                    content = response["content"]
                    
                    if agent_id in self.selected_mentor_ids:
                        dynamic_responses.append(response)
                        logger.info(f"✅ [动态导师] {agent_name}: {content[:100]}...")
                    else:
                        logger.warning(f"⚠️ [非动态导师] {agent_name}: {content[:100]}...")
                
                logger.info(f"  - 动态导师响应数: {len(dynamic_responses)}")
                logger.info(f"  - 动态导师参与率: {len(dynamic_responses)/len(responses)*100:.1f}%")
                
                if len(dynamic_responses) > 0:
                    logger.info("✅ 动态导师成功参与对话!")
                    return True
                else:
                    logger.error("❌ 动态导师未参与对话!")
                    return False
            else:
                logger.error("❌ 未收到任何响应")
                return False
                
        except Exception as e:
            logger.error(f"❌ 对话模拟异常: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def test_session_id_parsing(self) -> bool:
        """测试会话ID解析"""
        logger.info("🧪 测试4: 会话ID解析")
        
        # 模拟前端生成的连接ID
        connection_id = f"{self.user_id}_{self.session_id}"
        logger.info(f"📝 模拟连接ID: {connection_id}")
        
        # 导入并测试解析函数
        from backend.app.api.realtime_chat import realtime_manager
        
        try:
            user_id, session_id = realtime_manager._parse_client_id(connection_id)
            logger.info(f"🔍 解析结果:")
            logger.info(f"  - user_id: {user_id}")
            logger.info(f"  - session_id: {session_id}")
            logger.info(f"  - 原始session_id: {self.session_id}")
            
            if session_id == self.session_id:
                logger.info("✅ 会话ID解析正确!")
                return True
            else:
                logger.error(f"❌ 会话ID解析错误! 期望: {self.session_id}, 实际: {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ 会话ID解析异常: {e}")
            return False
    
    async def run_full_test(self, topic: str = "人工智能对投资市场的影响", message: str = "请分析一下当前市场情况"):
        """运行完整测试流程"""
        logger.info("🚀 开始动态导师简化测试")
        logger.info("=" * 80)
        
        # 测试1: 生成动态导师
        step1_success = await self.test_dynamic_mentor_generation(topic)
        if not step1_success:
            logger.error("❌ 测试失败: 动态导师生成")
            return False
        
        # 测试2: 检查注册状态
        step2_success = self.test_mentor_registration_check()
        if not step2_success:
            logger.error("❌ 测试失败: 导师注册检查")
            return False
        
        # 测试3: 会话ID解析
        step3_success = self.test_session_id_parsing()
        if not step3_success:
            logger.error("❌ 测试失败: 会话ID解析")
            return False
        
        # 测试4: 对话流程
        step4_success = await self.test_conversation_simulation(message)
        if not step4_success:
            logger.error("❌ 测试失败: 对话模拟")
            return False
        
        logger.info("=" * 80)
        logger.info("🎉 所有测试通过! 动态导师功能正常工作")
        return True

async def main():
    """主函数"""
    tester = DynamicMentorSimpleTest()
    
    # 可以修改测试参数
    topic = "人工智能对投资策略的影响"
    message = "你好，请分析一下当前AI技术对投资决策的帮助"
    
    success = await tester.run_full_test(topic, message)
    
    if not success:
        logger.error("🔥 测试失败! 动态导师功能存在问题")
        return False
    else:
        logger.info("🎯 测试成功! 动态导师功能工作正常")
        return True

if __name__ == "__main__":
    result = asyncio.run(main())
    if not result:
        exit(1)
