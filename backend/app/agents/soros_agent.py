"""
索罗斯智能体
宏观投资大师，激进风格，关注市场趋势和时机
"""
import logging
from typing import Dict, Any, Optional
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class SorosAgent(BaseAgent):
    """索罗斯智能体 - 宏观投资大师"""
    
    def __init__(self):
        super().__init__(
            agent_id="soros",
            name="乔治·索罗斯",
            description="宏观投资大师，量子基金创始人，以宏观趋势判断和时机把握著称",
            voice="Chelsie"  # 使用活泼机智的女声，体现敏锐的市场洞察力
        )
        
        # 索罗斯的投资哲学和风格
        self.investment_philosophy = """
        我的投资哲学基于以下几个核心原则：
        1. 反身性理论：市场参与者的认知会影响市场本身
        2. 宏观分析：关注全球经济和政治趋势
        3. 时机把握：在市场转折点进行大额投资
        4. 风险管理：严格控制风险，及时止损
        5. 全球视野：在全球范围内寻找投资机会
        """
        
        self.personality_traits = [
            "敏锐洞察", "宏观思维", "时机把握", "风险控制", "全球视野"
        ]
        
        # 索罗斯的对话风格参数（犀利直接）
        self.conversation_styles = {
            "greeting_casual": {
                "tone": "犀利友好",
                "length": "简短",
                "professional_level": "低",
                "personal_touch": "高",
                "example_phrases": ["嗨", "市场怎么样", "有什么动向", "什么情况"]
            },
            "light_chat": {
                "tone": "直接随意", 
                "length": "简短到中等",
                "professional_level": "低到中等",
                "personal_touch": "高",
                "example_phrases": ["哈", "你知道吗", "有意思", "我发现", "这提醒我"]
            },
            "professional_discussion": {
                "tone": "犀利敏锐",
                "length": "中等",
                "professional_level": "高", 
                "personal_touch": "中等",
                "example_phrases": ["我觉得", "从宏观角度", "市场反身性", "时机很重要"]
            },
            "deep_analysis": {
                "tone": "深刻洞察",
                "length": "中等到长",
                "professional_level": "很高",
                "personal_touch": "中等",
                "example_phrases": ["关键在于", "宏观趋势", "市场转折点", "我的经验告诉我"]
            }
        }
    
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
        生成索罗斯风格的回复 - 智能识别对话情境并自适应风格
        
        Args:
            user_message: 用户消息
            context: 对话上下文，可能包含其他智能体的回复
            
        Returns:
            索罗斯风格的回复
        """
        try:
            # 构建智能的系统提示词，让LLM自己识别情境和调整风格
            system_prompt = f"""
你是乔治·索罗斯，正在和投资朋友们轻松聊天。你需要根据对话情境智能调整自己的回复风格。

你的投资哲学：
{self.investment_philosophy}

你的性格特点：{', '.join(self.personality_traits)}

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
- 始终保持索罗斯犀利敏锐的个性
- 像真正的朋友聊天一样自然
- 如果其他朋友刚说了什么，要犀利地回应他们的观点

记住：你是在和朋友聊天，要根据话题深浅自然调节回复的专业程度和直接程度。
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

请犀利地参与这个对话，就像朋友间的直接交流。根据话题情境自动调整你的回复风格。
                    """
                
                # 如果有完整的对话背景
                if context.get('previous_speakers') and len(context['previous_speakers']) > 1:
                    user_prompt += "\n【完整对话背景】：\n"
                    for speaker in context['previous_speakers']:
                        user_prompt += f"- {speaker['agent_name']}: {speaker['content'][:80]}...\n"
                    user_prompt += "\n请综合考虑以上对话，犀利地发表你的看法。\n"
                    
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
【对话背景】：我们之前讨论了：
"{context['soros_reply']}"

请在此基础上继续对话。
                """
            
            # 调用现有的customer_agent进行回复生成
            from .customer_agent import customer_agent
            
            # 构建完整的提示词
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # 使用customer_agent的聊天功能生成回复
            response_stream = customer_agent.chat_stream(
                message=full_prompt,
                user_id="soros_agent",
                session_id="soros_session"
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
            logger.error(f"索罗斯智能体生成回复失败: {e}")
            return self._generate_default_response(user_message, context)
    
    def _generate_default_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """生成默认回复"""
        # 如果有巴菲特的回复，进行回应
        if context and context.get('buffett_reply'):
            buffet_reply = context['buffett_reply']
            
            # 根据巴菲特的回复生成相应的回应
            if '价值' in buffet_reply or '长期' in buffet_reply:
                return f"巴菲特说得对，但我想补充一点。当前的市场环境需要我们更加关注宏观经济的变化。{self._get_macro_analysis(user_message)}"
            elif '波动' in buffet_reply or '风险' in buffet_reply:
                return f"巴菲特的观点很有道理，但我想从另一个角度分析。{self._get_timing_analysis(user_message)}"
            else:
                return f"巴菲特的观点值得考虑，但我想从宏观角度提供一些不同的见解。{self._get_macro_analysis(user_message)}"
        else:
            # 没有上下文时的默认回复
            return self._get_macro_analysis(user_message)
    
    def _get_macro_analysis(self, user_message: str) -> str:
        """获取宏观分析回复"""
        if any(keyword in user_message.lower() for keyword in ['波动', '风险', '下跌']):
            return "当前的市场波动可能反映了更深层的宏观经济变化。投资者需要密切关注政策动向和市场情绪，适时调整策略。"
        elif any(keyword in user_message.lower() for keyword in ['时机', '买入', '卖出']):
            return "市场时机确实重要，但更重要的是理解市场的反身性。当市场情绪达到极端时，往往意味着转折点的到来。"
        elif any(keyword in user_message.lower() for keyword in ['趋势', '方向', '未来']):
            return "宏观趋势分析是投资成功的关键。我们需要关注全球经济、政治和货币政策的变化，这些因素往往决定了市场的长期方向。"
        else:
            return "宏观分析告诉我们，当前的市场环境需要我们更加敏锐地把握时机。投资者应该关注全球经济的结构性变化。"
    
    def _get_timing_analysis(self, user_message: str) -> str:
        """获取时机分析回复"""
        if any(keyword in user_message.lower() for keyword in ['时机', '买入', '卖出']):
            return "市场时机把握需要敏锐的洞察力。当市场情绪达到极端时，往往意味着转折点的到来。"
        elif any(keyword in user_message.lower() for keyword in ['趋势', '方向']):
            return "趋势分析需要关注市场的反身性。投资者的认知会影响市场，而市场的变化又会反过来影响投资者的认知。"
        else:
            return "时机把握是投资艺术的核心。我们需要在市场转折点进行大额投资，而不是在市场趋势明确时跟随。" 