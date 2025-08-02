"""
智能体管理器
负责管理多个智能体的对话流程
"""
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from .base_agent import BaseAgent
from .buffett_agent import BuffettAgent
from .soros_agent import SorosAgent

logger = logging.getLogger(__name__)

class AgentManager:
    """智能体管理器"""
    
    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self.conversation_sessions: Dict[str, Dict[str, Any]] = {}
        
        # 初始化智能体
        self._initialize_agents()
    
    def _initialize_agents(self):
        """初始化智能体"""
        try:
            # 创建巴菲特智能体
            self.agents['buffett'] = BuffettAgent()
            logger.info("✅ 巴菲特智能体初始化成功")
            
            # 创建索罗斯智能体
            self.agents['soros'] = SorosAgent()
            logger.info("✅ 索罗斯智能体初始化成功")
            
        except Exception as e:
            logger.error(f"❌ 智能体初始化失败: {e}")
    
    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """获取指定智能体"""
        return self.agents.get(agent_id)
    
    def get_all_agents(self) -> Dict[str, BaseAgent]:
        """获取所有智能体"""
        return self.agents
    
    def get_agent_info(self) -> List[Dict[str, Any]]:
        """获取所有智能体信息"""
        return [agent.get_agent_info() for agent in self.agents.values()]
    
    async def process_multi_agent_conversation(
        self, 
        user_message: str, 
        session_id: str,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        处理多智能体对话
        
        Args:
            user_message: 用户消息
            session_id: 会话ID
            user_id: 用户ID
            
        Returns:
            智能体回复列表，按顺序排列
        """
        try:
            logger.info(f"🎤 开始多智能体对话: session_id={session_id}, user_message='{user_message[:50]}...'")
            
            # 获取或创建会话
            if session_id not in self.conversation_sessions:
                self.conversation_sessions[session_id] = {
                    "user_id": user_id,
                    "created_at": datetime.now().isoformat(),
                    "messages": []
                }
            
            session = self.conversation_sessions[session_id]
            
            # 添加用户消息到会话历史
            session["messages"].append({
                "type": "user",
                "agent_id": "user",
                "content": user_message,
                "timestamp": datetime.now().isoformat()
            })
            
            # 第一步：巴菲特先回复
            logger.info("🤖 巴菲特开始回复...")
            buffett_reply = await self.agents['buffett'].generate_response(
                user_message=user_message,
                context=None  # 巴菲特不需要上下文
            )
            
            # 记录巴菲特的回复
            session["messages"].append({
                "type": "agent",
                "agent_id": "buffett",
                "content": buffett_reply,
                "timestamp": datetime.now().isoformat()
            })
            
            # 第二步：索罗斯回复（包含对巴菲特观点的回应）
            logger.info("🤖 索罗斯开始回复...")
            soros_context = {
                "buffett_reply": buffett_reply
            }
            
            soros_reply = await self.agents['soros'].generate_response(
                user_message=user_message,
                context=soros_context
            )
            
            # 记录索罗斯的回复
            session["messages"].append({
                "type": "agent",
                "agent_id": "soros",
                "content": soros_reply,
                "timestamp": datetime.now().isoformat()
            })
            
            # 构建回复列表
            responses = [
                {
                    "agent_id": "buffett",
                    "agent_name": "沃伦·巴菲特",
                    "content": buffett_reply,
                    "voice": self.agents['buffett'].voice,
                    "timestamp": datetime.now().isoformat(),
                    "order": 1
                },
                {
                    "agent_id": "soros",
                    "agent_name": "乔治·索罗斯",
                    "content": soros_reply,
                    "voice": self.agents['soros'].voice,
                    "timestamp": datetime.now().isoformat(),
                    "order": 2
                }
            ]
            
            logger.info(f"✅ 多智能体对话完成: session_id={session_id}")
            return responses
            
        except Exception as e:
            logger.error(f"❌ 多智能体对话处理失败: {e}")
            # 返回错误回复
            return [
                {
                    "agent_id": "buffett",
                    "agent_name": "沃伦·巴菲特",
                    "content": "抱歉，我现在无法正常回复。请稍后再试。",
                    "voice": self.agents['buffett'].voice,
                    "timestamp": datetime.now().isoformat(),
                    "order": 1
                },
                {
                    "agent_id": "soros",
                    "agent_name": "乔治·索罗斯",
                    "content": "系统暂时出现故障，请稍后重试。",
                    "voice": self.agents['soros'].voice,
                    "timestamp": datetime.now().isoformat(),
                    "order": 2
                }
            ]
    
    def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """获取会话历史"""
        if session_id in self.conversation_sessions:
            return self.conversation_sessions[session_id]["messages"]
        return []
    
    def clear_conversation_history(self, session_id: str):
        """清空会话历史"""
        if session_id in self.conversation_sessions:
            self.conversation_sessions[session_id]["messages"] = []
            # 同时清空智能体的历史
            for agent in self.agents.values():
                agent.clear_history()

# 创建全局智能体管理器实例
agent_manager = AgentManager() 