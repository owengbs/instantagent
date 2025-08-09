"""
动态导师生成器
负责根据用户议题调用OpenAI生成适合的导师特征
"""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from openai import OpenAI

logger = logging.getLogger(__name__)

class DynamicMentorGenerator:
    """动态导师生成器"""
    
    def __init__(self):
        self.openai_client = OpenAI(
            base_url="http://v2.open.venus.oa.com/llmproxy",
            api_key="xxBZykeTGIVeqyGNaxNoMDro@2468"
        )
        self.model = "deepseek-r1-local-II"
        
    async def generate_mentors_for_topic(self, topic: str) -> List[Dict[str, Any]]:
        """根据议题生成四位导师特征"""
        
        prompt = f"""
根据议题"{topic}"，生成四位最适合讨论该话题的导师或专家。

要求：
1. 根据议题领域选择合适的专家（如哲学、心理学、科学、艺术、商业、投资等）
2. 四位导师来自不同专业背景，能从不同角度讨论话题
3. 基于真实历史人物或当代知名人士的特征
4. 每位导师有独特的思想体系和表达风格

严格按以下JSON格式返回（不要包含任何其他文字）：
{{
  "mentors": [
    {{
      "id": "1",
      "name": "姓名",
      "title": "头衔/身份（20字内）",
      "philosophy": "核心思想/理念（50字内）",
      "personality_traits": ["性格特征1", "性格特征2", "性格特征3"],
      "expertise": ["专业领域1", "专业领域2", "专业领域3"],
      "famous_quotes": ["名言1（30字内）", "名言2（30字内）"],
      "background": "背景介绍（50字内）",
      "investment_style": "思考风格（10字内）"
    }},
    // 重复3次，共4位导师
  ]
}}

注意：只返回JSON，不要有其他说明文字。
"""
        
        try:
            logger.info(f"🎯 开始为议题生成导师: '{topic}'")
            
            # 调用OpenAI生成导师特征（同步调用，不使用await）
            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=4000  # 增加token限制避免JSON被截断
            )
            
            # openai>=1.0 返回结构兼容：choices[0].message.content
            content = response.choices[0].message.content
            logger.info(f"✅ OpenAI返回内容长度: {len(content)} 字符")
            logger.debug(f"OpenAI完整返回: {content}")
            
            # 解析返回的JSON数据
            mentor_data = self._parse_mentor_features(content)
            
            logger.info(f"✅ 成功生成 {len(mentor_data)} 位导师")
            return mentor_data
            
        except Exception as e:
            logger.error(f"❌ 生成导师失败: {e}")
            # 返回默认导师作为备用
            return self._generate_fallback_mentors(topic)
    
    def _parse_mentor_features(self, content: str) -> List[Dict[str, Any]]:
        """解析导师特征"""
        # 清理content，去除可能的markdown代码块标记
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            # 尝试直接解析JSON
            data = json.loads(content)
            if "mentors" in data:
                mentors = data["mentors"]
                # 确保每个导师都有必要的字段
                for i, mentor in enumerate(mentors):
                    mentor["id"] = mentor.get("id", str(i+1))
                return mentors
            elif isinstance(data, list):
                # 确保每个导师都有ID
                for i, mentor in enumerate(data):
                    mentor["id"] = mentor.get("id", str(i+1))
                return data
            else:
                raise ValueError("Invalid JSON format")
                
        except json.JSONDecodeError as e:
            logger.warning(f"JSON解析错误: {e}")
            # 如果JSON解析失败，尝试提取JSON部分
            try:
                # 查找JSON开始和结束位置
                start = content.find('{')
                end = content.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = content[start:end]
                    logger.info(f"尝试解析提取的JSON部分 (长度: {len(json_str)})")
                    
                    # 尝试修复常见的JSON错误
                    # 1. 检查是否有未闭合的字符串
                    if json_str.count('"') % 2 != 0:
                        # 在最后添加一个引号尝试修复
                        json_str = json_str.rstrip() + '"}'
                        logger.info("尝试修复未闭合的字符串")
                    
                    data = json.loads(json_str)
                    if "mentors" in data:
                        mentors = data["mentors"]
                        for i, mentor in enumerate(mentors):
                            mentor["id"] = mentor.get("id", str(i+1))
                        return mentors
                    elif isinstance(data, list):
                        for i, mentor in enumerate(data):
                            mentor["id"] = mentor.get("id", str(i+1))
                        return data
            except Exception as e2:
                logger.error(f"提取JSON失败: {e2}")
            
            # 如果都失败了，返回默认导师
            logger.warning("⚠️ JSON解析失败，使用默认导师")
            return self._generate_fallback_mentors("投资分析")
    
    def _generate_fallback_mentors(self, topic: str) -> List[Dict[str, Any]]:
        """生成备用导师（当AI生成失败时使用）"""
        # 根据话题关键词判断领域
        if any(word in topic.lower() for word in ['爱情', '生命', '人生', '意义', '幸福']):
            # 哲学/心理学导师
            return self._get_philosophy_mentors()
        elif any(word in topic.lower() for word in ['科技', '技术', 'ai', '人工智能', '创新']):
            # 科技导师
            return self._get_tech_mentors()
        else:
            # 默认返回通用思想家
            return self._get_general_mentors()
    
    def _get_philosophy_mentors(self) -> List[Dict[str, Any]]:
        """哲学/心理学导师"""
        return [
            {
                "id": "1",
                "name": "哲学思考者",
                "title": "存在主义哲学家",
                "philosophy": "人生的意义在于创造和选择，爱情是生命力的最高表现",
                "personality_traits": ["深邃", "理性", "富有洞察力"],
                "expertise": ["存在主义", "人生哲学", "爱情心理学"],
                "famous_quotes": [
                    "爱情是两个灵魂的相遇",
                    "生命的意义在于不断超越自我"
                ],
                "background": "深入研究人类存在的本质问题",
                "investment_style": "哲学思辨"
            },
            {
                "id": "2",
                "name": "心理学家",
                "title": "分析心理学创始人",
                "philosophy": "探索潜意识和集体无意识，理解人类心灵的深层结构",
                "personality_traits": ["深刻", "直觉", "富有想象力"],
                "expertise": ["分析心理学", "原型理论", "梦的解析"],
                "famous_quotes": [
                    "谁向外看，他在做梦；谁向内看，他已觉醒",
                    "你没有意识到的事情会主导你的生活，然后成为你的命运"
                ],
                "background": "深入研究人类心灵的集体无意识",
                "investment_style": "心理分析"
            },
            {
                "id": "3",
                "name": "人文主义者",
                "title": "人本主义心理学家",
                "philosophy": "相信人性本善，强调自我实现和个人成长",
                "personality_traits": ["温暖", "乐观", "共情"],
                "expertise": ["人本主义", "自我实现", "需求层次理论"],
                "famous_quotes": [
                    "真正的爱是建立在相互理解和接纳的基础上",
                    "自我实现是生命的最高追求"
                ],
                "background": "致力于研究人类潜能和自我实现",
                "investment_style": "人本主义"
            },
            {
                "id": "4",
                "name": "文学家",
                "title": "浪漫主义诗人",
                "philosophy": "用诗意的语言表达生命和爱情的本质",
                "personality_traits": ["感性", "浪漫", "富有诗意"],
                "expertise": ["文学创作", "诗歌", "爱情哲学"],
                "famous_quotes": [
                    "爱情是生命的诗篇",
                    "生命因爱而绚烂，因梦想而不朽"
                ],
                "background": "通过文学作品探讨爱情与生命的意义",
                "investment_style": "浪漫主义"
            }
        ]
    
    def _get_tech_mentors(self) -> List[Dict[str, Any]]:
        """科技领域导师"""
        return [
            {
                "id": "1",
                "name": "科技创新者",
                "title": "人工智能先驱",
                "philosophy": "技术应该增强人类能力，而不是取代人类",
                "personality_traits": ["创新", "远见", "理性"],
                "expertise": ["人工智能", "机器学习", "未来科技"],
                "famous_quotes": [
                    "AI的目标是增强人类智慧",
                    "创新来自于跨界思维"
                ],
                "background": "推动人工智能技术的发展和应用",
                "investment_style": "技术创新"
            },
            {
                "id": "2",
                "name": "互联网先锋",
                "title": "科技企业家",
                "philosophy": "连接世界，让信息自由流动",
                "personality_traits": ["进取", "务实", "专注"],
                "expertise": ["互联网", "创业", "产品设计"],
                "famous_quotes": [
                    "保持饥饿，保持愚蠢",
                    "产品的本质是解决用户问题"
                ],
                "background": "创建改变世界的科技产品",
                "investment_style": "产品思维"
            },
            {
                "id": "3",
                "name": "量子物理学家",
                "title": "理论物理学家",
                "philosophy": "探索宇宙的基本规律和量子世界的奥秘",
                "personality_traits": ["好奇", "严谨", "思辨"],
                "expertise": ["量子物理", "理论物理", "科学哲学"],
                "famous_quotes": [
                    "上帝不掷骰子",
                    "想象力比知识更重要"
                ],
                "background": "研究物理学的基础理论",
                "investment_style": "科学思维"
            },
            {
                "id": "4",
                "name": "未来学家",
                "title": "技术趋势分析师",
                "philosophy": "预见技术发展趋势，理解技术对社会的影响",
                "personality_traits": ["前瞻", "分析", "跨界"],
                "expertise": ["未来学", "技术趋势", "社会影响"],
                "famous_quotes": [
                    "未来已来，只是分布不均",
                    "技术是中性的，关键在于如何使用"
                ],
                "background": "研究技术发展对人类社会的影响",
                "investment_style": "未来思维"
            }
        ]
    
    def _get_general_mentors(self) -> List[Dict[str, Any]]:
        """通用思想家导师"""
        return [
            {
                "id": "1",
                "name": "价值投资大师",
                "title": "资深价值投资者",
                "philosophy": "长期持有优质企业，关注企业内在价值",
                "personality_traits": ["耐心", "理性", "谨慎"],
                "expertise": ["价值投资", "企业分析", "财务报表"],
                "famous_quotes": [
                    "时间是优秀企业的朋友",
                    "价格是你付出的，价值是你得到的"
                ],
                "background": "拥有20年投资经验，专注于价值投资策略",
                "investment_style": "价值投资"
            },
            {
                "id": "2",
                "name": "宏观策略专家",
                "title": "宏观经济分析师",
                "philosophy": "关注宏观经济趋势，把握市场时机",
                "personality_traits": ["敏锐", "果断", "前瞻"],
                "expertise": ["宏观分析", "货币政策", "经济周期"],
                "famous_quotes": [
                    "市场可能在很长时间内保持非理性",
                    "重要的不是你是否正确，而是正确时赚了多少"
                ],
                "background": "专注于宏观经济分析和投资策略",
                "investment_style": "宏观投资"
            },
            {
                "id": "3",
                "name": "多元思维导师",
                "title": "跨学科投资专家",
                "philosophy": "运用多元思维模型，避免认知偏差",
                "personality_traits": ["睿智", "理性", "批判思维"],
                "expertise": ["多元思维", "心理学", "概率论"],
                "famous_quotes": [
                    "多元思维模型是成功的关键",
                    "避免愚蠢比追求聪明更重要"
                ],
                "background": "运用多元思维模型进行决策",
                "investment_style": "多元思维"
            },
            {
                "id": "4",
                "name": "技术分析专家",
                "title": "量化投资分析师",
                "philosophy": "基于数据和模型进行投资决策",
                "personality_traits": ["严谨", "数据驱动", "系统化"],
                "expertise": ["技术分析", "量化投资", "风险管理"],
                "famous_quotes": [
                    "数据不会说谎，但需要正确解读",
                    "系统化投资比情绪化投资更可靠"
                ],
                "background": "专注于量化投资和技术分析",
                "investment_style": "量化投资"
            }
        ]

# 创建全局实例
dynamic_mentor_generator = DynamicMentorGenerator()
