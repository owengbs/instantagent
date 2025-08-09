"""
保罗·克鲁格曼智能体
诺贝尔经济学奖得主，新贸易理论和新经济地理学创始人
专注于宏观经济分析、国际贸易、货币政策等领域
"""
import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime

from .base_agent import BaseAgent
from ..utils.llm_client import llm_client

logger = logging.getLogger(__name__)

class KrugmanAgent(BaseAgent):
    """保罗·克鲁格曼智能体 - 宏观经济分析专家"""
    
    def __init__(self):
        super().__init__(
            agent_id="krugman",
            name="保罗·克鲁格曼",
            description="宏观经济分析专家，诺贝尔经济学奖得主",
            voice="Serena"
        )
        self.name = "保罗·克鲁格曼"
        self.title = "诺贝尔经济学奖得主"
        self.voice = "Serena"  # 使用Ethan声音，适合学术严谨的风格
        self.expertise = [
            "宏观经济学", "国际贸易", "货币政策", "经济周期",
            "新贸易理论", "新经济地理学", "经济政策分析", "金融危机"
        ]
        self.personality_traits = [
            "学术严谨", "批判思维", "数据驱动", "政策敏感",
            "理性分析", "证据导向", "直言不讳", "深度思考"
        ]
        self.investment_style = "宏观经济分析"
        self.famous_quotes = [
            "经济学不是一门精确科学，但它仍然是一门科学",
            "市场可能在很长时间内保持非理性",
            "政策制定者需要基于证据而非意识形态做决策",
            "贸易不是零和游戏，而是正和游戏",
            "货币政策的有效性取决于经济环境"
        ]
        
        # 克鲁格曼的专业领域关键词
        self.domain_keywords = {
            "宏观经济学": ["GDP", "通货膨胀", "失业率", "经济周期", "货币政策", "财政政策"],
            "国际贸易": ["比较优势", "贸易壁垒", "汇率", "贸易逆差", "全球化", "贸易战"],
            "货币政策": ["利率", "量化宽松", "通货膨胀目标", "央行", "货币供应", "汇率政策"],
            "金融危机": ["流动性危机", "系统性风险", "监管", "银行体系", "资产泡沫", "债务危机"],
            "经济政策": ["财政刺激", "结构性改革", "产业政策", "监管政策", "税收政策"]
        }
        
        # 克鲁格曼的学术背景和研究领域
        self.academic_background = {
            "education": "耶鲁大学、麻省理工学院",
            "awards": "2008年诺贝尔经济学奖",
            "research_areas": ["新贸易理论", "新经济地理学", "国际金融", "经济政策"],
            "institutions": ["麻省理工学院", "普林斯顿大学", "纽约时报专栏作家"]
        }
        
        logger.info(f"🎓 克鲁格曼智能体初始化完成: {self.name}")
    
    def get_agent_info(self) -> Dict[str, Any]:
        """获取智能体信息"""
        return {
            "agent_id": "krugman",
            "name": self.name,
            "title": self.title,
            "voice": self.voice,
            "expertise": self.expertise,
            "personality_traits": self.personality_traits,
            "investment_style": self.investment_style,
            "famous_quotes": self.famous_quotes,
            "academic_background": self.academic_background,
            "domain_keywords": self.domain_keywords
        }
    
    def _analyze_topic_domain(self, user_message: str) -> Dict[str, Any]:
        """分析用户问题属于哪个专业领域"""
        message_lower = user_message.lower()
        domain_scores = {}
        
        for domain, keywords in self.domain_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword.lower() in message_lower:
                    score += 1
            domain_scores[domain] = score
        
        # 找到得分最高的领域
        primary_domain = max(domain_scores.items(), key=lambda x: x[1])
        
        return {
            "primary_domain": primary_domain[0] if primary_domain[1] > 0 else "宏观经济学",
            "domain_scores": domain_scores,
            "confidence": primary_domain[1] / len(self.domain_keywords)
        }
    
    def _generate_domain_specific_prompt(self, domain: str, user_message: str) -> str:
        """根据专业领域生成特定的提示词"""
        domain_prompts = {
            "宏观经济学": f"""
作为诺贝尔经济学奖得主保罗·克鲁格曼，请从宏观经济学角度分析这个问题：{user_message}

请考虑以下方面：
- 宏观经济指标的影响（GDP、通货膨胀、失业率等）
- 经济周期的阶段和特征
- 政策传导机制
- 国际经济的相互影响

请用严谨的学术态度，基于数据和理论进行分析。
""",
            "国际贸易": f"""
作为国际贸易理论专家保罗·克鲁格曼，请从国际贸易角度分析这个问题：{user_message}

请考虑以下方面：
- 比较优势理论的应用
- 贸易壁垒的经济效应
- 汇率变动的影响
- 全球价值链的变化
- 贸易政策的经济学分析

请结合新贸易理论，用实证数据支持你的观点。
""",
            "货币政策": f"""
作为货币政策专家保罗·克鲁格曼，请从货币政策角度分析这个问题：{user_message}

请考虑以下方面：
- 货币政策的传导机制
- 利率政策的效果
- 量化宽松政策的影响
- 通货膨胀目标制
- 央行独立性的重要性

请基于货币经济学理论，分析政策的有效性和局限性。
""",
            "金融危机": f"""
作为金融危机研究专家保罗·克鲁格曼，请从金融危机角度分析这个问题：{user_message}

请考虑以下方面：
- 金融危机的根源和机制
- 系统性风险的形成
- 监管政策的作用
- 危机后的经济复苏
- 预防措施的有效性

请结合历史经验，分析当前的风险和机遇。
""",
            "经济政策": f"""
作为经济政策分析专家保罗·克鲁格曼，请从经济政策角度分析这个问题：{user_message}

请考虑以下方面：
- 政策工具的选择
- 政策效果的评估
- 政策协调的重要性
- 长期与短期目标的平衡
- 政策制定的政治经济学

请基于证据而非意识形态，提供客观的政策建议。
"""
        }
        
        return domain_prompts.get(domain, domain_prompts["宏观经济学"])
    
    async def generate_response(
        self, 
        user_message: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        生成克鲁格曼风格的回复
        
        Args:
            user_message: 用户消息
            context: 上下文信息
            
        Returns:
            智能体回复
        """
        try:
            logger.info(f"🎓 克鲁格曼开始分析问题: '{user_message[:50]}...'")
            
            # 1. 分析问题领域
            domain_analysis = self._analyze_topic_domain(user_message)
            primary_domain = domain_analysis["primary_domain"]
            confidence = domain_analysis["confidence"]
            
            logger.info(f"📊 领域分析: 主要领域={primary_domain}, 置信度={confidence:.2f}")
            
            # 2. 构建个性化提示词
            base_prompt = self._generate_domain_specific_prompt(primary_domain, user_message)
            
            # 3. 添加上下文信息
            if context:
                context_info = self._build_context_info(context)
                base_prompt += f"\n\n对话上下文：{context_info}"
            
            # 4. 添加克鲁格曼的个人风格
            style_prompt = f"""
请以保罗·克鲁格曼的风格回复，体现以下特点：
- 学术严谨，基于数据和理论
- 批判思维，不回避争议话题
- 直言不讳，敢于挑战主流观点
- 深度分析，关注长期影响
- 政策导向，提供实用的政策建议

回复要求：
- 长度控制在{context.get('suggested_length', (120, 180))[1] if context else 180}字以内
- 语言专业但易懂
- 包含具体的数据或案例
- 体现克鲁格曼的学术观点
"""
            
            full_prompt = base_prompt + "\n\n" + style_prompt
            
            # 5. 调用LLM生成回复（与其他智能体保持一致的流式方式）
            full_response = ""
            async for chunk in llm_client.chat_stream(message=full_prompt):
                if chunk:
                    full_response += chunk

            if not full_response or not full_response.strip():
                # 生成备用回复
                full_response = self._generate_fallback_response(user_message, primary_domain)

            # 6. 后处理回复
            processed_response = self._post_process_response(full_response, context)
            
            logger.info(f"✅ 克鲁格曼回复生成完成: '{processed_response[:50]}...'")
            return processed_response
            
        except Exception as e:
            logger.error(f"❌ 克鲁格曼回复生成失败: {e}")
            return self._generate_error_response(user_message)
    
    def _build_context_info(self, context: Dict[str, Any]) -> str:
        """构建上下文信息"""
        context_parts = []
        
        if context.get("conversation_mode"):
            context_parts.append(f"对话模式: {context['conversation_mode']}")
        
        if context.get("previous_speakers"):
            speakers = [f"{speaker['agent_name']}: {speaker['content'][:50]}..." 
                       for speaker in context["previous_speakers"]]
            context_parts.append(f"之前发言: {' | '.join(speakers)}")
        
        if context.get("last_speaker"):
            last_speaker = context["last_speaker"]
            context_parts.append(f"最近发言: {last_speaker['agent_name']}: {last_speaker['content'][:50]}...")
        
        return " | ".join(context_parts) if context_parts else "无特殊上下文"
    
    def _post_process_response(self, response: str, context: Optional[Dict[str, Any]] = None) -> str:
        """后处理回复"""
        # 清理回复
        response = response.strip()
        
        # 移除多余的引号
        response = re.sub(r'^["""]+|["""]+$', '', response)
        
        # 确保回复以句号结尾
        if response and not response.endswith(('。', '！', '？', '.', '!', '?')):
            response += '。'
        
        # 根据上下文调整回复
        if context and context.get("is_responding", False):
            # 如果是回应其他智能体，添加过渡语
            if not response.startswith(('我', '克鲁格曼', '作为')):
                response = f"从宏观经济学的角度来看，{response}"
        
        return response
    
    def _generate_fallback_response(self, user_message: str, domain: str) -> str:
        """生成备用回复"""
        fallback_responses = {
            "宏观经济学": f"从宏观经济学的角度来看，{user_message}这个问题涉及多个经济指标和政策层面的考量。我们需要基于数据和理论进行深入分析，而不是简单地依赖直觉或意识形态。",
            "国际贸易": f"在贸易问题上，{user_message}体现了全球化背景下的复杂经济关系。新贸易理论告诉我们，贸易不是零和游戏，而是能够创造共赢的正和游戏。",
            "货币政策": f"关于货币政策，{user_message}需要我们从货币传导机制的角度来分析。政策的效果往往取决于经济环境和市场预期。",
            "金融危机": f"在金融风险方面，{user_message}提醒我们要关注系统性风险的形成机制。历史经验表明，预防比治疗更重要。",
            "经济政策": f"在经济政策制定中，{user_message}需要基于证据而非意识形态。好的政策应该能够平衡短期目标和长期发展。"
        }
        
        return fallback_responses.get(domain, fallback_responses["宏观经济学"])
    
    def _generate_error_response(self, user_message: str) -> str:
        """生成错误回复"""
        return f"抱歉，我在分析'{user_message}'这个问题时遇到了技术困难。作为经济学家，我建议基于数据和理论来思考经济问题，而不是依赖简单的直觉判断。"
    
    def clear_history(self):
        """清空历史记录"""
        # 克鲁格曼智能体不需要维护复杂的历史记录
        pass
