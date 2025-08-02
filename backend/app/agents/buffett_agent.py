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
            voice="Cherry"  # 使用成熟稳重的男声
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
        
    async def generate_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        生成巴菲特风格的回复 - 支持动态上下文
        
        Args:
            user_message: 用户消息
            context: 对话上下文，可能包含其他智能体的回复
            
        Returns:
            巴菲特风格的回复
        """
        try:
            # 构建系统提示词
            system_prompt = f"""
            你是沃伦·巴菲特，世界著名的价值投资大师。请以巴菲特的风格和投资哲学来回复用户的问题。

            巴菲特的投资哲学：
            {self.investment_philosophy}
            
            巴菲特的性格特点：{', '.join(self.personality_traits)}
            
            回复要求：
            1. 使用温和、睿智、富有哲理的语言风格
            2. 强调长期价值投资理念
            3. 关注企业基本面而非短期市场波动
            4. 体现稳健理性的投资态度
            5. 如果其他投资大师已经发言，请明确引用他们的观点并给出你的看法
            6. 可以赞同、补充、质疑或从不同角度分析，但要坚持价值投资理念
            7. 回复要简洁明了，富有启发性
            
            请用中文回复，保持巴菲特一贯的睿智和温和风格。
            """
            
            # 构建用户消息 - 支持多种上下文格式
            user_prompt = f"用户问题：{user_message}\n\n"
            
            # 处理新的上下文格式
            if context and context.get('is_responding'):
                # 新的动态上下文格式
                if context.get('last_speaker'):
                    last_speaker = context['last_speaker']
                    user_prompt += f"""
                    {last_speaker['agent_name']} 刚刚发表了观点：
                    "{last_speaker['content']}"
                    
                    请针对以上观点给出你的看法。你可以：
                    - 赞同并补充更多见解
                    - 提出不同观点或质疑
                    - 从价值投资角度分析同一问题
                    - 分享相关的投资案例或经验
                    
                    请在回复开始明确引用对方的关键观点，然后给出你的分析。
                    """
                
                # 如果有多个之前的发言者
                if context.get('previous_speakers') and len(context['previous_speakers']) > 1:
                    user_prompt += "\n本轮对话的完整背景：\n"
                    for speaker in context['previous_speakers']:
                        user_prompt += f"- {speaker['agent_name']}: {speaker['content'][:100]}...\n"
                    
            elif context and context.get('soros_reply'):
                # 兼容旧的上下文格式
                user_prompt += f"""
                索罗斯的回复：{context['soros_reply']}
                
                请基于用户问题给出巴菲特的回复，如果需要的话可以礼貌地回应索罗斯的观点，但要坚持价值投资的理念。
                """
            elif context and context.get('buffett_reply'):
                # 兼容旧的上下文格式（当巴菲特需要回应自己之前的观点时）
                user_prompt += f"""
                之前的讨论：{context['buffett_reply']}
                
                请基于用户问题和之前的讨论给出进一步的回复。
                """
            
            # 调用现有的customer_agent进行回复生成
            from .customer_agent import customer_agent
            
            # 构建完整的提示词
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # 使用customer_agent的聊天功能生成回复
            response_stream = customer_agent.chat_stream(
                message=full_prompt,
                user_id="buffett_agent",
                session_id="buffett_session"
            )
            
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
                "context": context
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