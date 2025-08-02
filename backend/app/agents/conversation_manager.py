"""
对话管理器 - 智能化对话体验控制
包含：动态长度控制、对话模式管理、个性化学习
"""

import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import json

logger = logging.getLogger(__name__)

@dataclass
class TopicComplexity:
    """话题复杂度分析结果"""
    complexity_level: str  # "simple", "medium", "complex"
    complexity_score: float  # 0-1
    factors: List[str]  # 影响复杂度的因素
    suggested_length: Tuple[int, int]  # (min_length, max_length)
    conversation_mode: str  # "quick", "discussion", "debate"

@dataclass
class UserProfile:
    """用户画像"""
    user_id: str
    investment_level: str  # "beginner", "intermediate", "advanced"
    preferred_topics: List[str]
    interaction_style: str  # "brief", "detailed", "mixed"
    question_history: List[Dict]
    learning_progress: Dict[str, float]
    last_updated: str

class TopicComplexityAnalyzer:
    """话题复杂度分析器"""
    
    # 复杂话题关键词
    COMPLEX_KEYWORDS = [
        # 高级投资概念
        "衍生品", "期权", "套利", "对冲", "杠杆", "beta", "alpha", "夏普比率",
        "波动率", "相关性", "协方差", "蒙特卡洛", "VAR", "风险平价",
        
        # 宏观经济复杂概念
        "量化宽松", "收益率曲线", "利率平价", "购买力平价", "汇率机制",
        "央行政策", "货币乘数", "通胀预期", "菲利普斯曲线",
        
        # 高级财务分析
        "DCF模型", "WACC", "EBITDA", "ROE分解", "杜邦分析", "自由现金流",
        "企业估值", "并购", "重组", "财务杠杆",
        
        # 复杂理论
        "反身性", "行为金融学", "市场微观结构", "信息不对称", "代理成本"
    ]
    
    # 中等复杂度关键词
    MEDIUM_KEYWORDS = [
        "投资组合", "分散投资", "资产配置", "市场分析", "技术分析",
        "基本面分析", "财务报表", "现金流", "市盈率", "市净率",
        "护城河", "竞争优势", "商业模式", "行业分析", "估值"
    ]
    
    # 简单话题关键词
    SIMPLE_KEYWORDS = [
        "买什么", "什么时候", "怎么开始", "基础知识", "入门",
        "建议", "推荐", "如何", "为什么", "是什么"
    ]
    
    def analyze_complexity(self, user_message: str, context: Optional[Dict] = None) -> TopicComplexity:
        """分析话题复杂度"""
        try:
            message_lower = user_message.lower()
            
            # 计算复杂度得分
            complex_score = self._count_keywords(message_lower, self.COMPLEX_KEYWORDS) * 3
            medium_score = self._count_keywords(message_lower, self.MEDIUM_KEYWORDS) * 2
            simple_score = self._count_keywords(message_lower, self.SIMPLE_KEYWORDS) * 1
            
            total_score = complex_score + medium_score + simple_score
            
            # 额外因素分析
            factors = []
            
            # 问题长度因素
            if len(user_message) > 100:
                total_score += 1
                factors.append("问题详细")
            
            # 多个概念组合
            if len(re.findall(r'[？?]', user_message)) > 1:
                total_score += 1
                factors.append("多重问题")
            
            # 比较性问题
            if any(word in message_lower for word in ['比较', '区别', '不同', '对比', 'vs']):
                total_score += 1
                factors.append("比较分析")
            
            # 历史或案例分析
            if any(word in message_lower for word in ['历史', '案例', '实例', '经验', '过去']):
                total_score += 1
                factors.append("案例分析")
            
            # 标准化得分
            normalized_score = min(total_score / 10.0, 1.0)
            
            # 确定复杂度等级
            if normalized_score >= 0.7:
                level = "complex"
                suggested_length = (150, 250)
                conversation_mode = "debate"
            elif normalized_score >= 0.4:
                level = "medium"
                suggested_length = (120, 180)
                conversation_mode = "discussion"
            else:
                level = "simple"
                suggested_length = (80, 120)
                conversation_mode = "quick"
            
            # 记录分析因素
            if complex_score > 0:
                factors.append(f"高级概念({int(complex_score/3)}个)")
            if medium_score > 0:
                factors.append(f"中级概念({int(medium_score/2)}个)")
            if simple_score > 0:
                factors.append(f"基础概念({simple_score}个)")
            
            result = TopicComplexity(
                complexity_level=level,
                complexity_score=normalized_score,
                factors=factors,
                suggested_length=suggested_length,
                conversation_mode=conversation_mode
            )
            
            logger.info(f"📊 话题复杂度分析: 等级={level}, 得分={normalized_score:.2f}, "
                       f"建议长度={suggested_length}, 模式={conversation_mode}")
            logger.debug(f"📋 复杂度因素: {factors}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ 话题复杂度分析失败: {e}")
            # 返回默认中等复杂度
            return TopicComplexity(
                complexity_level="medium",
                complexity_score=0.5,
                factors=["分析失败，使用默认设置"],
                suggested_length=(120, 180),
                conversation_mode="discussion"
            )
    
    def _count_keywords(self, text: str, keywords: List[str]) -> int:
        """计算关键词出现次数"""
        count = 0
        for keyword in keywords:
            if keyword.lower() in text:
                count += 1
        return count

class ConversationModeManager:
    """对话模式管理器"""
    
    CONVERSATION_MODES = {
        "quick": {
            "description": "快速回复模式",
            "response_style": "简洁直接",
            "interaction_pattern": "快速给出核心观点",
            "follow_up": False
        },
        "discussion": {
            "description": "讨论交流模式", 
            "response_style": "适度展开",
            "interaction_pattern": "给出观点并简单交流",
            "follow_up": True
        },
        "debate": {
            "description": "深度辩论模式",
            "response_style": "详细分析",
            "interaction_pattern": "深入讨论，可能有分歧",
            "follow_up": True
        }
    }
    
    def get_mode_instructions(self, mode: str, agent_id: str) -> str:
        """获取特定模式下的智能体指令"""
        mode_config = self.CONVERSATION_MODES.get(mode, self.CONVERSATION_MODES["discussion"])
        
        base_instruction = f"""
        当前对话模式：{mode_config['description']}
        回复风格：{mode_config['response_style']}
        互动方式：{mode_config['interaction_pattern']}
        """
        
        if mode == "quick":
            return base_instruction + """
            特别要求：
            - 直击核心，避免展开
            - 给出最重要的1-2个要点
            - 适合快节奏交流
            """
        elif mode == "discussion":
            return base_instruction + """
            特别要求：
            - 适度展开核心观点
            - 可以给出简单的理由或例子
            - 保持对话的连续性
            """
        elif mode == "debate":
            return base_instruction + """
            特别要求：
            - 允许更详细的分析
            - 可以表达不同观点或质疑
            - 鼓励深度思考和讨论
            """
        
        return base_instruction

class UserPersonalizationManager:
    """用户个性化管理器"""
    
    def __init__(self):
        self.user_profiles: Dict[str, UserProfile] = {}
        self.session_data: Dict[str, Dict] = {}
    
    def get_or_create_profile(self, user_id: str) -> UserProfile:
        """获取或创建用户画像"""
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = UserProfile(
                user_id=user_id,
                investment_level="intermediate",  # 默认中级
                preferred_topics=[],
                interaction_style="mixed",
                question_history=[],
                learning_progress={},
                last_updated=datetime.now().isoformat()
            )
            logger.info(f"👤 创建新用户画像: {user_id}")
        
        return self.user_profiles[user_id]
    
    def update_user_interaction(
        self, 
        user_id: str, 
        question: str, 
        complexity: TopicComplexity,
        responses: List[Dict]
    ):
        """更新用户交互记录"""
        profile = self.get_or_create_profile(user_id)
        
        # 记录问题历史
        profile.question_history.append({
            "question": question,
            "complexity": complexity.complexity_level,
            "timestamp": datetime.now().isoformat(),
            "agents_count": len(responses)
        })
        
        # 更新话题偏好
        self._update_topic_preferences(profile, question, complexity)
        
        # 评估投资水平
        self._assess_investment_level(profile, complexity)
        
        # 限制历史记录长度
        if len(profile.question_history) > 50:
            profile.question_history = profile.question_history[-50:]
        
        profile.last_updated = datetime.now().isoformat()
        
        logger.info(f"📈 更新用户画像: {user_id}, 投资水平={profile.investment_level}")
    
    def _update_topic_preferences(self, profile: UserProfile, question: str, complexity: TopicComplexity):
        """更新话题偏好"""
        # 简单的话题提取（可以后续用NLP优化）
        topics = []
        
        if any(word in question.lower() for word in ['价值投资', '巴菲特', '护城河', '长期投资']):
            topics.append("value_investing")
        
        if any(word in question.lower() for word in ['宏观', '索罗斯', '汇率', '经济政策']):
            topics.append("macro_investing")
        
        if any(word in question.lower() for word in ['技术分析', '图表', '趋势']):
            topics.append("technical_analysis")
        
        # 更新偏好权重
        for topic in topics:
            if topic not in profile.learning_progress:
                profile.learning_progress[topic] = 0.1
            profile.learning_progress[topic] = min(profile.learning_progress[topic] + 0.1, 1.0)
        
        # 更新偏好话题列表
        sorted_topics = sorted(
            profile.learning_progress.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        profile.preferred_topics = [topic for topic, score in sorted_topics[:5] if score > 0.3]
    
    def _assess_investment_level(self, profile: UserProfile, complexity: TopicComplexity):
        """评估用户投资水平"""
        recent_complexities = [
            item.get("complexity", "medium") 
            for item in profile.question_history[-10:]
        ]
        
        complex_ratio = recent_complexities.count("complex") / len(recent_complexities)
        simple_ratio = recent_complexities.count("simple") / len(recent_complexities)
        
        if complex_ratio > 0.6:
            profile.investment_level = "advanced"
        elif simple_ratio > 0.6:
            profile.investment_level = "beginner"
        else:
            profile.investment_level = "intermediate"
    
    def suggest_follow_up_questions(self, user_id: str, current_topic: str) -> List[str]:
        """推荐后续问题"""
        profile = self.get_or_create_profile(user_id)
        
        # 根据用户水平和偏好推荐问题
        suggestions = []
        
        if "value_investing" in profile.preferred_topics:
            if profile.investment_level == "beginner":
                suggestions.extend([
                    "什么样的公司具有护城河？",
                    "如何分析公司的财务报表？",
                    "长期投资需要注意什么？"
                ])
            elif profile.investment_level == "advanced":
                suggestions.extend([
                    "如何量化企业的护城河价值？",
                    "DCF估值模型在实践中的局限性？",
                    "价值投资在成长股上的应用？"
                ])
        
        if "macro_investing" in profile.preferred_topics:
            if profile.investment_level == "beginner":
                suggestions.extend([
                    "美联储政策如何影响股市？",
                    "通胀对投资有什么影响？",
                    "如何理解汇率变化？"
                ])
            elif profile.investment_level == "advanced":
                suggestions.extend([
                    "量化宽松对资产价格的传导机制？",
                    "如何构建宏观对冲策略？",
                    "反身性理论在外汇市场的应用？"
                ])
        
        # 随机选择3-5个建议
        import random
        return random.sample(suggestions, min(len(suggestions), 4))

# 创建全局实例
complexity_analyzer = TopicComplexityAnalyzer()
conversation_mode_manager = ConversationModeManager()
personalization_manager = UserPersonalizationManager()