"""
查理·芒格智能体
多元思维模型专家，巴菲特的长期合作伙伴
"""

import logging
from typing import Optional, Dict, Any
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class MungerAgent(BaseAgent):
    """芒格智能体 - 多元思维模型大师"""
    
    def __init__(self):
        super().__init__(
            agent_id="munger",
            name="查理·芒格", 
            description="多元思维模型专家，巴菲特的长期合作伙伴，以跨学科思维和逆向思考著称",
            voice="Cherry"
        )
        
        self.investment_philosophy = """
        多元思维模型投资哲学：
        - 跨学科思维：运用心理学、经济学、数学等多领域知识
        - 逆向思考：避免愚蠢比追求聪明更重要
        - 格栅理论：用多个思维模型交叉验证
        - 认知偏差防范：识别并避免常见的思维陷阱
        - 简单常识：复杂问题往往有简单的解决方案
        - 长期耐心：与巴菲特一样坚持长期价值投资
        - 学习机器：终身学习，不断完善思维框架
        """
        
        self.personality_traits = [
            "理性冷静", "跨学科思维", "逆向思考", "实用主义", "终身学习"
        ]
        
        # 芒格的经典思维模型
        self.thinking_models = [
            "心理学模型", "数学模型", "物理学模型", "生物学模型", 
            "经济学模型", "工程学模型", "统计学模型", "决策树模型"
        ]
    
    async def generate_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        生成芒格风格的回复 - 支持动态上下文和长度控制
        
        Args:
            user_message: 用户消息
            context: 对话上下文，可能包含其他智能体的回复和长度要求
            
        Returns:
            芒格风格的回复
        """
        try:
            # 获取长度控制参数
            target_length = self._get_target_length(context)
            conversation_mode = context.get('conversation_mode', 'discussion') if context else 'discussion'
            
            # 构建系统提示词
            system_prompt = f"""
            你是查理·芒格，沃伦·巴菲特的长期合作伙伴，多元思维模型的倡导者。请以芒格的风格和投资哲学来回复用户的问题。

            芒格的投资哲学：
            {self.investment_philosophy}
            
            芒格的性格特点：{', '.join(self.personality_traits)}
            
            芒格的思维模型：{', '.join(self.thinking_models)}
            
            回复要求：
            1. 使用理性、深刻、带有哲理的语言风格
            2. 运用多元思维模型分析问题
            3. 善用逆向思考和常识判断
            4. 识别并指出可能的认知偏差
            5. 如果其他投资大师已经发言，请从多元思维角度分析他们的观点
            6. 可以赞同、质疑、补充或提供不同的思维框架
            7. 【重要】回复长度控制在{target_length[0]}-{target_length[1]}字以内
            8. 当前对话模式：{self._get_mode_description(conversation_mode)}
            
            请用中文回复，保持芒格一贯的理性和深刻洞察力。
            """
            
            # 构建用户消息 - 支持多种上下文格式
            user_prompt = f"用户问题：{user_message}\n\n"
            
            # 处理上下文格式
            if context and context.get('is_responding'):
                user_prompt += self._build_context_prompt(context, conversation_mode)
            elif context and context.get('buffett_reply'):
                # 兼容旧格式 - 巴菲特先发言
                user_prompt += f"""
                巴菲特刚刚表达了观点：{context['buffett_reply']}
                
                请从多元思维模型的角度分析这个问题，可以补充巴菲特的观点或提供不同的思维框架。
                """
            elif context and context.get('soros_reply'):
                # 兼容旧格式 - 索罗斯先发言
                user_prompt += f"""
                索罗斯刚刚表达了观点：{context['soros_reply']}
                
                请从多元思维模型的角度分析这个问题，可以补充索罗斯的观点或提供不同的思维框架。
                """
            
            # 调用LLM生成回复
            from .customer_agent import customer_agent
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            response_stream = customer_agent.chat_stream(
                message=full_prompt,
                user_id="munger_agent", 
                session_id="munger_session"
            )
            
            # 收集流式回复
            full_response = ""
            async for chunk in response_stream:
                if chunk:
                    full_response += chunk
            
            # 如果回复为空，使用默认回复
            if not full_response.strip():
                full_response = self._generate_default_response(user_message, context)
            
            # 记录到历史
            self.add_to_history({
                "type": "agent",
                "agent_id": self.agent_id,
                "user_message": user_message,
                "response": full_response,
                "context": context
            })
            
            return full_response.strip()
            
        except Exception as e:
            logger.error(f"芒格智能体生成回复失败: {e}")
            return self._generate_default_response(user_message, context)
    
    def _get_target_length(self, context: Optional[Dict[str, Any]]) -> tuple:
        """获取目标回复长度"""
        if context and context.get('suggested_length'):
            return context['suggested_length']
        
        # 默认中等长度
        return (120, 180)
    
    def _get_mode_description(self, mode: str) -> str:
        """获取对话模式描述"""
        mode_descriptions = {
            "quick": "快速回复模式 - 言简意赅，突出核心思维模型",
            "discussion": "讨论模式 - 适度展开，运用多元思维分析", 
            "debate": "深度辩论模式 - 详细分析，可以挑战既有观点"
        }
        return mode_descriptions.get(mode, "讨论模式")
    
    def _build_context_prompt(self, context: Dict[str, Any], conversation_mode: str) -> str:
        """构建上下文提示词"""
        prompt = ""
        
        if context.get('last_speaker'):
            last_speaker = context['last_speaker']
            prompt += f"""
            {last_speaker['agent_name']} 刚刚发表了观点：
            "{last_speaker['content']}"
            
            请从多元思维模型的角度分析这个观点。你可以：
            - 运用心理学模型分析其中的认知因素
            - 用经济学或数学模型验证逻辑
            - 指出可能存在的思维盲点或偏差
            - 提供跨学科的补充视角
            - 运用逆向思考质疑或验证
            
            请在回复开始简要引用对方的核心观点，然后给出你的多元思维分析。
            """
        
        # 如果有多个之前的发言者，提供完整背景
        if context.get('previous_speakers') and len(context['previous_speakers']) > 1:
            prompt += "\n本轮对话的完整背景：\n"
            for speaker in context['previous_speakers']:
                prompt += f"- {speaker['agent_name']}: {speaker['content'][:80]}...\n"
            
            if conversation_mode == "debate":
                prompt += "\n请综合分析以上观点，运用多元思维模型找出共同点、分歧点和盲点。\n"
        
        return prompt
    
    def _generate_default_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """生成默认回复"""
        if context and context.get('last_speaker'):
            return f"针对刚刚的观点，我需要运用更多思维模型来分析。让我从心理学和经济学角度重新思考这个问题。"
        else:
            return f"这是一个很好的问题。让我运用多元思维模型来分析，从心理学、经济学和常识的角度来看..."
    
    def get_agent_info(self) -> Dict[str, Any]:
        """获取智能体信息"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "voice": self.voice,
            "specialties": self.thinking_models,
            "philosophy": "运用多元思维模型，避免认知偏差，坚持长期理性投资"
        }