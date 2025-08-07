"""
巴菲特智能体
价值投资大师，稳健风格，关注长期价值
"""
import logging
from typing import Dict, Any, Optional
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class BuffettAgent(BaseAgent):
    """巴菲特智能体 - 价值投资大师"""
    
    def __init__(self):
        super().__init__(
            agent_id="buffett",
            name="沃伦·巴菲特",
            description="价值投资大师，伯克希尔·哈撒韦公司董事长，以长期价值投资著称",
            voice="Ethan"  # 使用成熟稳重的男声，符合"奥马哈先知"的形象
        )
        
        # 巴菲特的投资哲学和风格
        self.investment_philosophy = """
        我的投资哲学基于以下几个核心原则：
        1. 价值投资：关注企业的内在价值，而不是市场价格
        2. 长期持有：时间是优秀企业的朋友
        3. 安全边际：以低于内在价值的价格买入
        4. 能力圈：只投资自己理解的企业
        5. 理性投资：在别人恐惧时贪婪，在别人贪婪时恐惧
        """
        
        self.personality_traits = [
            "稳健理性", "长期思维", "价值导向", "风险意识", "耐心等待"
        ]
        
        # 巴菲特的专业领域
        self.expertise = [
            "价值投资", "长期持有", "企业分析", "护城河理论", "安全边际",
            "能力圈投资", "理性投资", "风险管理", "资产配置"
        ]
        
        # 巴菲特的投资风格
        self.investment_style = "价值投资"
        
        # 巴菲特的经典名言
        self.famous_quotes = [
            "当别人恐惧时我贪婪，当别人贪婪时我恐惧",
            "时间是优秀企业的朋友，是平庸企业的敌人",
            "价格是你付出的，价值是你得到的",
            "投资的第一条准则是不要赔钱，第二条准则是永远不要忘记第一条",
            "如果你不愿意持有一只股票十年，那就不要持有十分钟"
        ]
        
        # 巴菲特的背景信息
        self.title = "伯克希尔·哈撒韦CEO"
        self.background = "从小展现出商业天赋，建立了投资界最成功的记录之一。通过伯克希尔·哈撒韦公司管理超过7000亿美元资产。"
        
        # 巴菲特的对话风格参数
        self.conversation_styles = {
            "greeting_casual": {
                "tone": "温和友善",
                "length": "简短",
                "professional_level": "低",
                "personal_touch": "高",
                "example_phrases": ["很高兴见到你", "今天怎么样", "有什么想聊的吗"]
            },
            "light_chat": {
                "tone": "轻松随意", 
                "length": "简短到中等",
                "professional_level": "低到中等",
                "personal_touch": "高",
                "example_phrases": ["哈哈", "你知道吗", "这让我想起", "说起来"]
            },
            "professional_discussion": {
                "tone": "睿智稳重",
                "length": "中等",
                "professional_level": "高", 
                "personal_touch": "中等",
                "example_phrases": ["我觉得", "从价值投资角度", "长期来看", "这提醒我"]
            },
            "deep_analysis": {
                "tone": "深思熟虑",
                "length": "中等到长",
                "professional_level": "很高",
                "personal_touch": "中等",
                "example_phrases": ["让我们深入思考", "从历史经验看", "关键在于"]
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
        生成巴菲特风格的回复 - 智能识别对话情境并自适应风格
        
        Args:
            user_message: 用户消息
            context: 对话上下文，可能包含其他智能体的回复
            
        Returns:
            巴菲特风格的回复
        """
        try:
            # 构建智能的系统提示词，让LLM自己识别情境和调整风格
            system_prompt = f"""
你是沃伦·巴菲特，正在和朋友们轻松聊天。你需要根据对话情境智能调整自己的回复风格。

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
- 始终保持巴菲特温和睿智的个性
- 像真正的朋友聊天一样自然
- 如果其他朋友刚说了什么，要自然回应他们的观点

记住：你是在和朋友聊天，要根据话题深浅自然调节回复的专业程度和亲密程度。
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

请自然地参与这个对话，就像朋友间的聊天一样。根据话题情境自动调整你的回复风格。
                    """
                
                # 如果有完整的对话背景
                if context.get('previous_speakers') and len(context['previous_speakers']) > 1:
                    user_prompt += "\n【完整对话背景】：\n"
                    for speaker in context['previous_speakers']:
                        user_prompt += f"- {speaker['agent_name']}: {speaker['content'][:80]}...\n"
                    user_prompt += "\n请综合考虑以上对话，自然地发表你的看法。\n"
                    
            elif context and context.get('soros_reply'):
                # 兼容旧格式
                user_prompt += f"""
【对话背景】：索罗斯刚才说了：
"{context['soros_reply']}"

请自然地参与对话，根据话题深浅调整回复风格。
                """
            elif context and context.get('buffett_reply'):
                # 兼容旧格式
                user_prompt += f"""
【对话背景】：我们之前讨论了：
"{context['buffett_reply']}"

请在此基础上继续对话。
                """
            
            # 调用LLM进行回复生成
            from ..utils.llm_client import llm_client
            
            # 构建完整的提示词
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # 使用简化LLM客户端生成回复
            response_stream = llm_client.chat_stream(message=full_prompt)
            
            # 收集流式回复
            full_response = ""
            async for chunk in response_stream:
                if chunk:
                    full_response += chunk
            
            # 如果回复为空，使用默认回复
            if not full_response.strip():
                full_response = self._generate_default_response(user_message)
            
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
            logger.error(f"巴菲特智能体生成回复失败: {e}")
            return self._generate_default_response(user_message)
    
    def _generate_default_response(self, user_message: str) -> str:
        """生成默认回复"""
        default_responses = [
            "投资最重要的是保持理性。市场波动是常态，但优秀企业的内在价值不会因为短期波动而改变。",
            "我始终相信，时间是优秀企业的朋友。与其预测市场，不如寻找具有持久竞争优势的企业。",
            "投资需要耐心和纪律。当别人恐惧时保持理性，当别人贪婪时保持谨慎。",
            "价值投资的核心是安全边际。以低于内在价值的价格买入，为不确定性留出缓冲。",
            "专注于你理解的企业，在能力圈内投资。不要被市场情绪左右你的判断。"
        ]
        
        # 根据用户消息内容选择合适的默认回复
        if any(keyword in user_message.lower() for keyword in ['波动', '风险', '下跌']):
            return "市场波动是投资过程中的常态。我建议关注企业的内在价值，而不是短期的价格波动。优秀的企业在长期中会创造真正的价值。"
        elif any(keyword in user_message.lower() for keyword in ['时机', '买入', '卖出']):
            return "试图预测市场时机是徒劳的。我更喜欢寻找优秀的企业，以合理的价格买入，然后长期持有。"
        elif any(keyword in user_message.lower() for keyword in ['价值', '估值', '价格']):
            return "价值投资的核心是安全边际。以低于内在价值的价格买入，为不确定性留出缓冲。"
        else:
            return default_responses[0]
    
    def get_agent_info(self) -> Dict[str, Any]:
        """获取智能体信息"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "title": self.title,
            "description": self.description,
            "voice": self.voice,
            "expertise": self.expertise,
            "personality_traits": self.personality_traits,
            "investment_style": self.investment_style,
            "famous_quotes": self.famous_quotes,
            "background": self.background
        } 