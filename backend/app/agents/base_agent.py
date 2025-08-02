"""
基础智能体抽象类
定义智能体的通用接口和属性
"""
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """基础智能体抽象类"""
    
    def __init__(self, agent_id: str, name: str, description: str, voice: str = "Cherry"):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.voice = voice
        self.conversation_history: List[Dict[str, Any]] = []
        
    @abstractmethod
    async def generate_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        生成智能体回复
        
        Args:
            user_message: 用户消息
            context: 对话上下文，包含其他智能体的回复等
            
        Returns:
            智能体的回复文本
        """
        pass
    
    def add_to_history(self, message: Dict[str, Any]):
        """添加消息到对话历史"""
        self.conversation_history.append({
            **message,
            "timestamp": datetime.now().isoformat()
        })
    
    def get_recent_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """获取最近的对话历史"""
        return self.conversation_history[-limit:] if self.conversation_history else []
    
    def clear_history(self):
        """清空对话历史"""
        self.conversation_history.clear()
    
    def get_agent_info(self) -> Dict[str, Any]:
        """获取智能体信息"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "voice": self.voice
        } 