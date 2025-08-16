"""
智能体管理器
负责管理多个智能体的对话流程
支持动态发言顺序和多智能体扩展
"""
import logging
import asyncio
import random
from typing import Dict, Any, List, Optional
from datetime import datetime

from .base_agent import BaseAgent
from .buffett_agent import BuffettAgent
from .soros_agent import SorosAgent
from .munger_agent import MungerAgent
from .krugman_agent import KrugmanAgent
from .dynamic_mentor import DynamicMentor
from .dynamic_mentor_generator import dynamic_mentor_generator
from .topic_analyzer import topic_analyzer, AnalysisResult
from .conversation_manager import (
    complexity_analyzer, 
    conversation_mode_manager, 
    personalization_manager
)

logger = logging.getLogger(__name__)

class AgentManager:
    """智能体管理器 - 支持动态发言顺序和多智能体扩展"""
    
    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self.conversation_sessions: Dict[str, Dict[str, Any]] = {}
        self.agent_configs: Dict[str, Dict[str, Any]] = {}  # 智能体配置信息
        self.dynamic_mentors: Dict[str, List[str]] = {}  # 会话ID -> 动态导师ID列表
        self.session_topics: Dict[str, str] = {}  # 会话ID -> 议题
        
        # 初始化智能体
        self._initialize_agents()
    
    def _initialize_agents(self):
        """初始化智能体"""
        try:
            # 创建巴菲特智能体
            buffett_agent = BuffettAgent()
            self.register_agent('buffett', buffett_agent, {
                'name': '沃伦·巴菲特',
                'description': '价值投资专家',
                'priority': 1,
                'enabled': True
            })
            logger.info("✅ 巴菲特智能体初始化成功")
            
            # 创建索罗斯智能体
            soros_agent = SorosAgent()
            self.register_agent('soros', soros_agent, {
                'name': '乔治·索罗斯',
                'description': '宏观投资专家',
                'priority': 1,
                'enabled': True
            })
            logger.info("✅ 索罗斯智能体初始化成功")
            
            # 创建芒格智能体
            munger_agent = MungerAgent()
            self.register_agent('munger', munger_agent, {
                'name': '查理·芒格',
                'description': '多元思维模型专家',
                'priority': 1,
                'enabled': True
            })
            logger.info("✅ 芒格智能体初始化成功")
            
            # 创建克鲁格曼智能体
            krugman_agent = KrugmanAgent()
            self.register_agent('krugman', krugman_agent, {
                'name': '保罗·克鲁格曼',
                'description': '宏观经济分析专家',
                'priority': 1,
                'enabled': True
            })
            logger.info("✅ 克鲁格曼智能体初始化成功")
            
        except Exception as e:
            logger.error(f"❌ 智能体初始化失败: {e}")
    
    def register_agent(self, agent_id: str, agent_instance: BaseAgent, config: Dict[str, Any]):
        """
        注册智能体 - 支持动态添加新智能体
        
        Args:
            agent_id: 智能体ID
            agent_instance: 智能体实例
            config: 智能体配置信息
        """
        self.agents[agent_id] = agent_instance
        self.agent_configs[agent_id] = {
            'agent_id': agent_id,
            'name': config.get('name', agent_id),
            'description': config.get('description', ''),
            'priority': config.get('priority', 1),
            'enabled': config.get('enabled', True),
            'voice': getattr(agent_instance, 'voice', 'Cherry'),
            'is_dynamic': config.get('is_dynamic', False),
            'topic': config.get('topic', ''),
            'session_id': config.get('session_id', ''),
            'registered_at': datetime.now().isoformat()
        }
        logger.info(f"🤖 智能体注册成功: {agent_id} - {config.get('name', agent_id)}")
    
    def unregister_agent(self, agent_id: str):
        """注销智能体"""
        if agent_id in self.agents:
            del self.agents[agent_id]
            del self.agent_configs[agent_id]
            logger.info(f"🗑️ 智能体注销成功: {agent_id}")
    
    def get_enabled_agents(self) -> Dict[str, BaseAgent]:
        """获取所有启用的智能体"""
        return {
            agent_id: agent 
            for agent_id, agent in self.agents.items()
            if self.agent_configs.get(agent_id, {}).get('enabled', True)
        }
    
    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """获取指定智能体"""
        return self.agents.get(agent_id)
    
    def get_all_agents(self) -> Dict[str, BaseAgent]:
        """获取所有智能体"""
        return self.agents
    
    def get_agent_info(self) -> List[Dict[str, Any]]:
        """获取所有智能体信息"""
        return [agent.get_agent_info() for agent in self.agents.values()]
    
    def determine_speaking_order(self, user_message: str, max_participants: int = 3, selected_mentors: List[str] = None) -> List[str]:
        """
        智能确定发言顺序
        
        Args:
            user_message: 用户消息
            max_participants: 最大参与者数量
            selected_mentors: 前端选择的导师ID列表
            
        Returns:
            智能体ID列表，按发言顺序排列
        """
        try:
            # 如果指定了选中的导师，使用它们
            if selected_mentors and len(selected_mentors) > 0:
                available_agent_ids = [agent_id for agent_id in selected_mentors if agent_id in self.agents]
                logger.info(f"🎯 使用前端选择的导师: {selected_mentors}, 可用智能体: {available_agent_ids}")
            else:
                # 获取启用的智能体
                enabled_agents = self.get_enabled_agents()
                available_agent_ids = list(enabled_agents.keys())
                logger.info(f"🎯 使用默认启用的智能体: {available_agent_ids}")
            
            if not available_agent_ids:
                logger.warning("❌ 没有可用的智能体")
                return []
            
            # 限制参与者数量
            max_participants = min(max_participants, len(available_agent_ids))
            
            logger.info(f"🎯 开始确定发言顺序: 可用智能体={available_agent_ids}, 最大参与者={max_participants}")
            
            # 使用话题分析器分析话题倾向
            analysis_result = topic_analyzer.analyze_topic_preference(user_message)
            
            logger.info(f"📊 话题分析结果: 推荐={analysis_result.preferred_agent}, "
                       f"置信度={analysis_result.confidence:.2f}, 理由={analysis_result.reason}")
            
            # 确定首发智能体
            if (analysis_result.preferred_agent and 
                analysis_result.preferred_agent in available_agent_ids and
                analysis_result.confidence >= 0.6):
                # 有明确的话题倾向
                first_speaker = analysis_result.preferred_agent
                logger.info(f"🎯 根据话题分析选择首发: {first_speaker} (置信度: {analysis_result.confidence:.2f})")
            else:
                # 随机选择首发
                first_speaker = random.choice(available_agent_ids)
                logger.info(f"🎲 随机选择首发智能体: {first_speaker}")
            
            # 构建发言顺序
            speaking_order = [first_speaker]
            remaining_agents = [agent_id for agent_id in available_agent_ids if agent_id != first_speaker]
            
            # 如果指定了选中导师，使用所有选中的导师
            if selected_mentors and len(selected_mentors) > 0:
                # 对于指定的导师列表，使用所有可用的导师（不受max_participants限制）
                random.shuffle(remaining_agents)
                speaking_order.extend(remaining_agents)
                logger.info(f"🎯 使用用户选择的所有导师: {len(speaking_order)}位")
            else:
                # 没有指定导师时，按max_participants限制选择
                if remaining_agents:
                    random.shuffle(remaining_agents)
                    speaking_order.extend(remaining_agents[:max_participants - 1])
                logger.info(f"🎲 默认模式，最多{max_participants}位导师")
            
            logger.info(f"📋 最终发言顺序: {speaking_order}")
            return speaking_order
            
        except Exception as e:
            logger.error(f"❌ 确定发言顺序失败: {e}")
            return []
    
    async def process_multi_agent_conversation(
        self, 
        user_message: str, 
        session_id: str,
        user_id: str,
        max_participants: int = 3,  # 默认支持三人对话
        selected_mentors: List[str] = None  # 前端选择的导师ID列表
    ) -> List[Dict[str, Any]]:
        """
        处理多智能体对话 - 支持动态发言顺序
        
        Args:
            user_message: 用户消息
            session_id: 会话ID
            user_id: 用户ID
            max_participants: 最大参与者数量
            selected_mentors: 前端选择的导师ID列表
            
        Returns:
            智能体回复列表，按动态顺序排列
        """
        try:
            logger.info(f"🎤 开始智能多智能体对话: session_id={session_id}, user_message='{user_message[:50]}...'")
            if selected_mentors:
                logger.info(f"🎯 使用前端选择的导师: {selected_mentors}")
            
            # 1. 分析话题复杂度
            complexity = complexity_analyzer.analyze_complexity(user_message)
            logger.info(f"📊 话题复杂度: {complexity.complexity_level} (得分: {complexity.complexity_score:.2f})")
            
            # 2. 确定对话模式
            conversation_mode = complexity.conversation_mode
            mode_instructions = conversation_mode_manager.get_mode_instructions(conversation_mode, "general")
            logger.info(f"🎭 对话模式: {conversation_mode}")
            
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
            
            # 3. 智能确定发言顺序和参与者数量
            suggested_participants = max_participants
            participant_text = "三人" if max_participants == 3 else f"{max_participants}人"
            logger.info(f"🎯 {participant_text}圆桌对话 (复杂度: {complexity.complexity_level}, 得分: {complexity.complexity_score:.2f})")
            
            speaking_order = self.determine_speaking_order(user_message, suggested_participants, selected_mentors)
            
            if not speaking_order:
                logger.error("❌ 无法确定发言顺序")
                return self._generate_error_responses()
            
            logger.info(f"📋 确定的发言顺序: {speaking_order}")
            
            # 按顺序生成智能体回复
            responses = []
            previous_responses = []
            
            for order_index, agent_id in enumerate(speaking_order):
                if agent_id not in self.agents:
                    logger.warning(f"⚠️ 智能体 {agent_id} 不存在，跳过")
                    continue
                
                agent = self.agents[agent_id]
                agent_config = self.agent_configs.get(agent_id, {})
                agent_name = agent_config.get('name', agent_id)
                
                logger.info(f"🤖 {agent_name} 开始回复... (顺序: {order_index + 1})")
                
                # 构建上下文信息
                context = self._build_agent_context(
                    agent_id=agent_id,
                    user_message=user_message,
                    previous_responses=previous_responses,
                    is_first_speaker=(order_index == 0),
                    complexity=complexity,
                    conversation_mode=conversation_mode
                )
                
                # 生成回复
                try:
                    agent_reply = await agent.generate_response(
                        user_message=user_message,
                        context=context
                    )
                    
                    if not agent_reply or not agent_reply.strip():
                        agent_reply = f"抱歉，我暂时无法针对这个问题给出回复。"
                        logger.warning(f"⚠️ {agent_name} 回复为空，使用默认回复")
                    
                except Exception as e:
                    logger.error(f"❌ {agent_name} 生成回复失败: {e}")
                    agent_reply = f"抱歉，我现在无法正常回复。请稍后再试。"
                
                # 记录到会话历史
                session["messages"].append({
                    "type": "agent",
                    "agent_id": agent_id,
                    "content": agent_reply,
                    "timestamp": datetime.now().isoformat()
                })
                
                # 构建响应对象
                response = {
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "content": agent_reply,
                    "voice": getattr(agent, 'voice', 'Cherry'),
                    "timestamp": datetime.now().isoformat(),
                    "order": order_index + 1,  # 从1开始的顺序
                    "is_first_speaker": (order_index == 0),
                    "speaking_order": speaking_order
                }
                
                responses.append(response)
                previous_responses.append(response)
                
                logger.info(f"✅ {agent_name} 回复完成: '{agent_reply[:50]}...'")
            
            # 4. 更新用户个性化数据
            personalization_manager.update_user_interaction(
                user_id=user_id,
                question=user_message,
                complexity=complexity,
                responses=responses
            )
            
            logger.info(f"✅ 智能多智能体对话完成: session_id={session_id}, 参与者数量={len(responses)}, "
                       f"复杂度={complexity.complexity_level}, 模式={conversation_mode}")
            return responses
            
        except Exception as e:
            logger.error(f"❌ 多智能体对话处理失败: {e}")
            return self._generate_error_responses()
    
    def _build_agent_context(
        self, 
        agent_id: str, 
        user_message: str, 
        previous_responses: List[Dict[str, Any]], 
        is_first_speaker: bool,
        complexity=None,
        conversation_mode: str = "discussion"
    ) -> Optional[Dict[str, Any]]:
        """
        构建智能体上下文信息
        
        Args:
            agent_id: 当前智能体ID
            user_message: 用户消息
            previous_responses: 之前的智能体回复
            is_first_speaker: 是否为首发智能体
            
        Returns:
            上下文信息字典
        """
        # 构建基础上下文
        context = {
            "is_responding": not is_first_speaker,
            "conversation_mode": conversation_mode,
            "suggested_length": complexity.suggested_length if complexity else (120, 180)
        }
        
        if is_first_speaker:
            # 首发智能体也需要长度和模式信息
            return context
        
        if not previous_responses:
            return context
        
        # 为回应者添加更多上下文
        context.update({
            "previous_speakers": [],
            "should_respond_to_previous": True
        })
        
        # 添加之前发言者的信息
        for response in previous_responses:
            speaker_info = {
                "agent_id": response["agent_id"],
                "agent_name": response["agent_name"],
                "content": response["content"],
                "order": response["order"]
            }
            context["previous_speakers"].append(speaker_info)
        
        # 特别标记最近的发言者（通常是要回应的对象）
        if previous_responses:
            last_response = previous_responses[-1]
            context["last_speaker"] = {
                "agent_id": last_response["agent_id"],
                "agent_name": last_response["agent_name"],
                "content": last_response["content"]
            }
        
        return context
    
    def _generate_error_responses(self) -> List[Dict[str, Any]]:
        """生成错误回复"""
        error_responses = []
        
        # 获取默认的智能体（如果存在）
        default_agents = ['buffett', 'soros']
        available_agents = [agent_id for agent_id in default_agents if agent_id in self.agents]
        
        if not available_agents:
            available_agents = list(self.agents.keys())[:2]  # 取前两个可用智能体
        
        for index, agent_id in enumerate(available_agents):
            agent_config = self.agent_configs.get(agent_id, {})
            error_responses.append({
                "agent_id": agent_id,
                "agent_name": agent_config.get('name', agent_id),
                "content": "抱歉，系统暂时出现故障，请稍后重试。",
                "voice": getattr(self.agents.get(agent_id), 'voice', 'Cherry'),
                "timestamp": datetime.now().isoformat(),
                "order": index + 1
            })
        
        return error_responses
    
    def get_follow_up_suggestions(self, user_id: str, current_topic: str) -> List[str]:
        """获取后续问题推荐"""
        try:
            suggestions = personalization_manager.suggest_follow_up_questions(user_id, current_topic)
            logger.info(f"💡 为用户 {user_id} 生成 {len(suggestions)} 个后续问题推荐")
            return suggestions
        except Exception as e:
            logger.error(f"❌ 生成后续问题推荐失败: {e}")
            return []
    
    def get_user_profile_summary(self, user_id: str) -> Dict[str, Any]:
        """获取用户画像摘要"""
        try:
            profile = personalization_manager.get_or_create_profile(user_id)
            return {
                "user_id": user_id,
                "investment_level": profile.investment_level,
                "preferred_topics": profile.preferred_topics,
                "interaction_style": profile.interaction_style,
                "total_questions": len(profile.question_history),
                "learning_progress": profile.learning_progress
            }
        except Exception as e:
            logger.error(f"❌ 获取用户画像失败: {e}")
            return {"user_id": user_id, "error": str(e)}
    
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
    
    async def generate_dynamic_mentors(self, topic: str, session_id: str) -> List[Dict[str, Any]]:
        """
        为指定议题生成动态导师
        
        Args:
            topic: 讨论议题
            session_id: 会话ID
            
        Returns:
            生成的导师信息列表
        """
        try:
            logger.info(f"🎯 开始为议题生成动态导师: '{topic}' (会话: {session_id})")
            
            # 调用动态导师生成器
            mentor_data_list = await dynamic_mentor_generator.generate_mentors_for_topic(topic)
            
            # 创建动态导师实例
            dynamic_mentor_ids = []
            for i, mentor_data in enumerate(mentor_data_list):
                # 为每个导师生成唯一的ID，避免不同会话间的冲突
                original_id = mentor_data.get('id', str(i+1))
                unique_agent_id = f"dynamic_{session_id}_{original_id}_{random.randint(1000, 9999)}"
                
                # 更新mentor_data中的ID，确保DynamicMentor使用唯一ID
                mentor_data['id'] = unique_agent_id
                
                # 创建动态导师实例
                dynamic_mentor = DynamicMentor(mentor_data)
                agent_id = dynamic_mentor.agent_id
                
                # 注册导师
                self.register_agent(agent_id, dynamic_mentor, {
                    'name': dynamic_mentor.name,
                    'description': dynamic_mentor.description,
                    'priority': 2,  # 动态导师优先级较低
                    'enabled': True,
                    'voice': dynamic_mentor.voice,
                    'is_dynamic': True,  # 标记为动态导师
                    'topic': topic,
                    'session_id': session_id
                })
                
                dynamic_mentor_ids.append(agent_id)
                logger.info(f"✅ 动态导师注册成功: {dynamic_mentor.name} ({agent_id})")
            
            # 保存会话相关信息
            self.dynamic_mentors[session_id] = dynamic_mentor_ids
            self.session_topics[session_id] = topic
            
            logger.info(f"✅ 成功生成 {len(dynamic_mentor_ids)} 位动态导师")
            return [mentor.get_agent_info() for mentor in [self.agents[agent_id] for agent_id in dynamic_mentor_ids]]
            
        except Exception as e:
            logger.error(f"❌ 生成动态导师失败: {e}")
            return []
    
    def get_session_dynamic_mentors(self, session_id: str) -> List[Dict[str, Any]]:
        """
        获取会话的动态导师信息
        
        Args:
            session_id: 会话ID
            
        Returns:
            动态导师信息列表
        """
        if session_id not in self.dynamic_mentors:
            return []
        
        mentor_infos = []
        for agent_id in self.dynamic_mentors[session_id]:
            if agent_id in self.agents:
                mentor_infos.append(self.agents[agent_id].get_agent_info())
        
        return mentor_infos
    
    def get_session_topic(self, session_id: str) -> Optional[str]:
        """获取会话议题"""
        return self.session_topics.get(session_id)
    
    def cleanup_dynamic_mentors(self, session_id: str):
        """
        清理会话的动态导师
        
        Args:
            session_id: 会话ID
        """
        if session_id in self.dynamic_mentors:
            # 注销动态导师
            for agent_id in self.dynamic_mentors[session_id]:
                if agent_id in self.agents:
                    del self.agents[agent_id]
                if agent_id in self.agent_configs:
                    del self.agent_configs[agent_id]
            
            # 清理会话数据
            del self.dynamic_mentors[session_id]
            if session_id in self.session_topics:
                del self.session_topics[session_id]
            
            logger.info(f"🗑️ 清理会话 {session_id} 的动态导师")
    
    def is_dynamic_mentor(self, agent_id: str) -> bool:
        """判断是否为动态导师"""
        config = self.agent_configs.get(agent_id, {})
        return config.get('is_dynamic', False)

# 创建全局智能体管理器实例
agent_manager = AgentManager() 