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
            voice="Cherry"  # 保持温柔智慧的女声，体现睿智和温和的特质
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
        
        # 芒格的对话风格参数（睿智哲理）
        self.conversation_styles = {
            "greeting_casual": {
                "tone": "温和睿智",
                "length": "简短",
                "professional_level": "低",
                "personal_touch": "高",
                "example_phrases": ["你好", "很高兴", "今天怎么样", "学了什么"]
            },
            "light_chat": {
                "tone": "睿智随意", 
                "length": "简短到中等",
                "professional_level": "低到中等",
                "personal_touch": "高",
                "example_phrases": ["嗯", "有趣", "这让我想起", "从心理学角度"]
            },
            "professional_discussion": {
                "tone": "理性深刻",
                "length": "中等",
                "professional_level": "高", 
                "personal_touch": "中等",
                "example_phrases": ["我觉得", "多元思维", "逆向思考", "认知偏差"]
            },
            "deep_analysis": {
                "tone": "哲理深邃",
                "length": "中等到长",
                "professional_level": "很高",
                "personal_touch": "中等",
                "example_phrases": ["从根本上说", "跨学科分析", "思维模型告诉我们", "智慧在于"]
            }
        }
        
        # 芒格的经典思维模型
        self.thinking_models = [
            "心理学模型", "数学模型", "物理学模型", "生物学模型", 
            "经济学模型", "工程学模型", "统计学模型", "决策树模型"
        ]
    
    def _build_style_instruction(self, style_config: dict) -> str:
        """根据风格配置构建指导语"""
        return f"""
        对话风格要求：
        - 语调：{style_config['tone']}
        - 回复长度：{style_config['length']}
        - 专业程度：{style_config['professional_level']}
        - 亲切程度：{style_config['personal_touch']}
        - 可以使用的表达方式：{', '.join(style_config['example_phrases'])}
        """
    
    async def generate_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        生成芒格风格的回复 - 智能识别对话情境并自适应风格
        
        Args:
            user_message: 用户消息
            context: 对话上下文，可能包含其他智能体的回复和长度要求
            
        Returns:
            芒格风格的回复
        """
        try:
            # 构建智能的系统提示词，让LLM自己识别情境和调整风格
            system_prompt = f"""
你是查理·芒格，正在和投资朋友们轻松聊天。你需要根据对话情境智能调整自己的回复风格。

你的投资哲学：
{self.investment_philosophy}

你的性格特点：{', '.join(self.personality_traits)}

你的思维模型：{', '.join(self.thinking_models)}

【重要】请首先分析用户的话属于哪种情境，然后选择对应的风格：

1. **轻松打招呼/问候**
   {self._build_style_instruction(self.conversation_styles['greeting_casual'])}

2. **随意闲聊/轻松话题**
   {self._build_style_instruction(self.conversation_styles['light_chat'])}

3. **投资相关讨论**
   {self._build_style_instruction(self.conversation_styles['professional_discussion'])}

4. **深度投资分析**
   {self._build_style_instruction(self.conversation_styles['deep_analysis'])}

回复指南：
- 自然判断对话情境，无需说明你的判断过程
- 根据情境自动调整语言风格和专业深度
- 始终保持芒格睿智理性的个性
- 像真正的朋友聊天一样自然
- 善于运用多元思维模型，但要根据情境调节深度
- 如果其他朋友刚说了什么，要睿智地分析他们的观点

记住：你是在和朋友聊天，要根据话题深浅自然调节回复的哲理程度和亲近程度。
            """
            
            # 构建用户消息和上下文
            user_prompt = f"【用户的话】：{user_message}\n\n"
            
            # 处理对话上下文 - 更自然的方式
            if context and context.get('is_responding'):
                if context.get('last_speaker'):
                    last_speaker = context['last_speaker']
                    user_prompt += f"""
【对话背景】：{last_speaker['agent_name']} 刚才说了：
"{last_speaker['content']}"

请睿智地参与这个对话，就像朋友间的理性交流。根据话题情境自动调整你的回复风格。
                    """
                
                # 如果有完整的对话背景
                if context.get('previous_speakers') and len(context['previous_speakers']) > 1:
                    user_prompt += "\n【完整对话背景】：\n"
                    for speaker in context['previous_speakers']:
                        user_prompt += f"- {speaker['agent_name']}: {speaker['content'][:80]}...\n"
                    user_prompt += "\n请从多元思维角度综合分析以上对话。\n"
            elif context and context.get('buffett_reply'):
                # 兼容旧格式
                user_prompt += f"""
【对话背景】：巴菲特刚才说了：
"{context['buffett_reply']}"

请自然地参与对话，根据话题深浅调整回复风格。
                """
            elif context and context.get('soros_reply'):
                # 兼容旧格式
                user_prompt += f"""
【对话背景】：索罗斯刚才说了：
"{context['soros_reply']}"

请自然地参与对话，根据话题深浅调整回复风格。
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
                "context": context,
                "style": "intelligent_adaptive"  # 标记为智能自适应风格
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