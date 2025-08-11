"""
多用户管理器
负责用户会话隔离、智能体实例管理和WebSocket连接管理
"""
import logging
import asyncio
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from copy import deepcopy

from ..agents.base_agent import BaseAgent
from ..agents.buffett_agent import BuffettAgent
from ..agents.soros_agent import SorosAgent
from ..agents.munger_agent import MungerAgent
from ..agents.krugman_agent import KrugmanAgent
from ..agents.dynamic_mentor import DynamicMentor

logger = logging.getLogger(__name__)

@dataclass
class UserInfo:
    """用户信息"""
    user_id: str
    created_at: str
    last_active_at: str
    nickname: Optional[str] = None
    total_sessions: int = 0
    total_messages: int = 0

@dataclass
class UserSession:
    """用户会话信息"""
    session_id: str
    user_id: str
    topic: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_active_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_active: bool = True
    messages: List[Dict[str, Any]] = field(default_factory=list)
    selected_mentors: List[str] = field(default_factory=list)
    dynamic_mentors: List[str] = field(default_factory=list)

@dataclass
class UserAgentPool:
    """用户智能体池"""
    user_id: str
    agents: Dict[str, BaseAgent] = field(default_factory=dict)
    agent_configs: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    dynamic_mentors: Dict[str, List[str]] = field(default_factory=dict)  # session_id -> mentor_ids
    session_topics: Dict[str, str] = field(default_factory=dict)  # session_id -> topic

class MultiUserManager:
    """多用户管理器"""
    
    def __init__(self):
        # 用户信息存储
        self.users: Dict[str, UserInfo] = {}
        
        # 用户会话存储 {user_id: {session_id: UserSession}}
        self.user_sessions: Dict[str, Dict[str, UserSession]] = {}
        
        # 用户智能体池 {user_id: UserAgentPool}
        self.user_agent_pools: Dict[str, UserAgentPool] = {}
        
        # WebSocket连接管理 {connection_id: websocket}
        self.connections: Dict[str, Any] = {}
        
        # 连接到用户映射 {connection_id: user_id}
        self.connection_users: Dict[str, str] = {}
        
        # 活跃用户追踪
        self.active_users: Set[str] = set()
        
        # 清理任务
        self.cleanup_task = None
        
        logger.info("🏢 多用户管理器初始化完成")
    
    def get_or_create_user(self, user_id: str, nickname: Optional[str] = None) -> UserInfo:
        """获取或创建用户"""
        if user_id not in self.users:
            self.users[user_id] = UserInfo(
                user_id=user_id,
                nickname=nickname,
                created_at=datetime.now().isoformat(),
                last_active_at=datetime.now().isoformat()
            )
            self.user_sessions[user_id] = {}
            self.user_agent_pools[user_id] = UserAgentPool(user_id=user_id)
            logger.info(f"👤 创建新用户: {user_id} ({nickname})")
        else:
            # 更新最后活跃时间
            self.users[user_id].last_active_at = datetime.now().isoformat()
            if nickname and nickname != self.users[user_id].nickname:
                self.users[user_id].nickname = nickname
                logger.info(f"👤 更新用户昵称: {user_id} -> {nickname}")
        
        self.active_users.add(user_id)
        return self.users[user_id]
    
    def create_user_session(self, user_id: str, session_id: str, topic: Optional[str] = None) -> UserSession:
        """创建用户会话"""
        user = self.get_or_create_user(user_id)
        
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            topic=topic
        )
        
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = {}
        
        self.user_sessions[user_id][session_id] = session
        user.total_sessions += 1
        
        logger.info(f"🎭 创建用户会话: {user_id} -> {session_id} (主题: {topic})")
        return session
    
    def get_user_session(self, user_id: str, session_id: str) -> Optional[UserSession]:
        """获取用户会话"""
        if user_id in self.user_sessions and session_id in self.user_sessions[user_id]:
            session = self.user_sessions[user_id][session_id]
            session.last_active_at = datetime.now().isoformat()
            return session
        return None
    
    def get_user_agent_pool(self, user_id: str) -> UserAgentPool:
        """获取用户智能体池"""
        if user_id not in self.user_agent_pools:
            self.user_agent_pools[user_id] = UserAgentPool(user_id=user_id)
            self._initialize_user_agents(user_id)
        
        return self.user_agent_pools[user_id]
    
    def _initialize_user_agents(self, user_id: str):
        """为用户初始化智能体实例"""
        agent_pool = self.user_agent_pools[user_id]
        
        # 创建静态智能体实例
        static_agents = {
            'buffett': BuffettAgent,
            'soros': SorosAgent,
            'munger': MungerAgent,
            'krugman': KrugmanAgent
        }
        
        for agent_id, agent_class in static_agents.items():
            agent_instance = agent_class()
            agent_pool.agents[agent_id] = agent_instance
            agent_pool.agent_configs[agent_id] = {
                'agent_id': agent_id,
                'name': agent_instance.name,
                'description': agent_instance.description,
                'priority': 1,
                'enabled': True,
                'voice': getattr(agent_instance, 'voice', 'Cherry'),
                'is_dynamic': False,
                'registered_at': datetime.now().isoformat()
            }
        
        logger.info(f"🤖 为用户 {user_id} 初始化 {len(static_agents)} 个静态智能体")
    
    def add_dynamic_mentor(self, user_id: str, session_id: str, mentor_data: Dict[str, Any]) -> bool:
        """为用户添加动态导师"""
        try:
            agent_pool = self.get_user_agent_pool(user_id)
            
            # 创建动态导师实例
            mentor_instance = DynamicMentor(mentor_data)
            mentor_id = mentor_instance.agent_id
            
            # 添加到用户智能体池
            agent_pool.agents[mentor_id] = mentor_instance
            agent_pool.agent_configs[mentor_id] = {
                'agent_id': mentor_id,
                'name': mentor_instance.name,
                'description': mentor_instance.description,
                'priority': 1,
                'enabled': True,
                'voice': getattr(mentor_instance, 'voice', 'Cherry'),
                'is_dynamic': True,
                'topic': mentor_data.get('topic', ''),
                'session_id': session_id,
                'registered_at': datetime.now().isoformat()
            }
            
            # 记录动态导师关联
            if session_id not in agent_pool.dynamic_mentors:
                agent_pool.dynamic_mentors[session_id] = []
            agent_pool.dynamic_mentors[session_id].append(mentor_id)
            
            logger.info(f"🎭 为用户 {user_id} 会话 {session_id} 添加动态导师: {mentor_instance.name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 添加动态导师失败: {e}")
            return False
    
    def get_session_agents(self, user_id: str, session_id: str, selected_mentors: Optional[List[str]] = None) -> Dict[str, BaseAgent]:
        """获取会话可用的智能体"""
        agent_pool = self.get_user_agent_pool(user_id)
        
        # 如果指定了选中的导师，只返回这些
        if selected_mentors:
            available_agents = {}
            for mentor_id in selected_mentors:
                if mentor_id in agent_pool.agents:
                    available_agents[mentor_id] = agent_pool.agents[mentor_id]
            return available_agents
        
        # 否则返回会话相关的智能体
        session_agents = {}
        
        # 添加静态智能体
        for agent_id, agent in agent_pool.agents.items():
            config = agent_pool.agent_configs.get(agent_id, {})
            if not config.get('is_dynamic', False) and config.get('enabled', True):
                session_agents[agent_id] = agent
        
        # 添加当前会话的动态导师
        if session_id in agent_pool.dynamic_mentors:
            for mentor_id in agent_pool.dynamic_mentors[session_id]:
                if mentor_id in agent_pool.agents:
                    session_agents[mentor_id] = agent_pool.agents[mentor_id]
        
        return session_agents
    
    def add_message_to_session(self, user_id: str, session_id: str, message: Dict[str, Any]):
        """向用户会话添加消息"""
        session = self.get_user_session(user_id, session_id)
        if session:
            message['timestamp'] = datetime.now().isoformat()
            session.messages.append(message)
            self.users[user_id].total_messages += 1
            logger.debug(f"💬 用户 {user_id} 会话 {session_id} 添加消息: {message.get('type')}")
    
    def register_connection(self, connection_id: str, user_id: str, websocket: Any):
        """注册WebSocket连接"""
        self.connections[connection_id] = websocket
        self.connection_users[connection_id] = user_id
        self.get_or_create_user(user_id)
        logger.info(f"🔌 注册连接: {connection_id} (用户: {user_id})")
    
    def unregister_connection(self, connection_id: str):
        """注销WebSocket连接"""
        if connection_id in self.connections:
            user_id = self.connection_users.get(connection_id)
            del self.connections[connection_id]
            if connection_id in self.connection_users:
                del self.connection_users[connection_id]
            logger.info(f"🔌 注销连接: {connection_id} (用户: {user_id})")
    
    def get_connection(self, connection_id: str) -> Optional[Any]:
        """获取WebSocket连接"""
        return self.connections.get(connection_id)
    
    def get_user_connections(self, user_id: str) -> List[str]:
        """获取用户的所有连接"""
        return [conn_id for conn_id, uid in self.connection_users.items() if uid == user_id]
    
    def cleanup_inactive_sessions(self):
        """清理非活跃会话"""
        now = datetime.now()
        cleanup_threshold = now - timedelta(hours=24)  # 24小时未活跃
        
        cleaned_sessions = 0
        for user_id, sessions in list(self.user_sessions.items()):
            for session_id, session in list(sessions.items()):
                try:
                    last_active = datetime.fromisoformat(session.last_active_at.replace('Z', ''))
                    if last_active < cleanup_threshold:
                        # 清理会话
                        del sessions[session_id]
                        cleaned_sessions += 1
                        
                        # 清理相关的动态导师
                        agent_pool = self.user_agent_pools.get(user_id)
                        if agent_pool and session_id in agent_pool.dynamic_mentors:
                            mentor_ids = agent_pool.dynamic_mentors[session_id]
                            for mentor_id in mentor_ids:
                                if mentor_id in agent_pool.agents:
                                    del agent_pool.agents[mentor_id]
                                if mentor_id in agent_pool.agent_configs:
                                    del agent_pool.agent_configs[mentor_id]
                            del agent_pool.dynamic_mentors[session_id]
                            
                except Exception as e:
                    logger.error(f"❌ 清理会话失败: {e}")
        
        if cleaned_sessions > 0:
            logger.info(f"🧹 清理了 {cleaned_sessions} 个非活跃会话")
    
    def get_system_stats(self) -> Dict[str, Any]:
        """获取系统统计信息"""
        total_users = len(self.users)
        active_users = len(self.active_users)
        total_sessions = sum(len(sessions) for sessions in self.user_sessions.values())
        total_connections = len(self.connections)
        total_messages = sum(user.total_messages for user in self.users.values())
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_sessions": total_sessions,
            "active_connections": total_connections,
            "total_messages": total_messages,
            "uptime": "运行中",
            "last_cleanup": datetime.now().isoformat()
        }
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """获取用户统计信息"""
        user = self.users.get(user_id)
        if not user:
            return {}
        
        sessions = self.user_sessions.get(user_id, {})
        connections = self.get_user_connections(user_id)
        
        return {
            "user_id": user_id,
            "nickname": user.nickname,
            "created_at": user.created_at,
            "last_active_at": user.last_active_at,
            "total_sessions": user.total_sessions,
            "active_sessions": len(sessions),
            "total_messages": user.total_messages,
            "active_connections": len(connections)
        }

# 创建全局多用户管理器实例
multi_user_manager = MultiUserManager()
