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
            voice="Cherry"  # 使用睿智深沉的男声
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
        
    async def generate_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        生成索罗斯风格的回复
        
        Args:
            user_message: 用户消息
            context: 对话上下文，包含巴菲特的回复
            
        Returns:
            索罗斯风格的回复
        """
        try:
            # 构建系统提示词
            system_prompt = f"""
            你是乔治·索罗斯，世界著名的宏观投资大师。请以索罗斯的风格和投资哲学来回复用户的问题。

            索罗斯的投资哲学：
            {self.investment_philosophy}
            
            索罗斯的性格特点：{', '.join(self.personality_traits)}
            
            回复要求：
            1. 使用犀利、直接、富有洞察力的语言风格
            2. 强调宏观分析和趋势判断
            3. 关注市场时机和转折点
            4. 体现敏锐的市场洞察力
            5. 如果context中包含巴菲特的观点，可以礼貌地回应，但坚持宏观投资的理念
            6. 回复要富有洞察力，体现对市场趋势的敏锐判断
            
            请用中文回复，保持索罗斯一贯的犀利和洞察力。
            """
            
            # 构建用户消息
            if context and context.get('buffett_reply'):
                user_prompt = f"""
                用户问题：{user_message}
                
                巴菲特的回复：{context['buffett_reply']}
                
                请基于用户问题给出索罗斯的回复，如果需要的话可以礼貌地回应巴菲特的观点，但要坚持宏观投资的理念。
                """
            else:
                user_prompt = f"用户问题：{user_message}"
            
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
                "context": context
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