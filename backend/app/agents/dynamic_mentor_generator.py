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
生成四位适合讨论"{topic}"的投资导师。

要求：
1. 四位导师来自不同投资领域
2. 每位导师有独特性格和投资风格
3. 基于真实投资大师特征

严格按以下JSON格式返回（不要包含任何其他文字）：
{{
  "mentors": [
    {{
      "id": "1",
      "name": "姓名",
      "title": "头衔（20字内）",
      "philosophy": "投资哲学（50字内）",
      "personality_traits": ["特征1", "特征2", "特征3"],
      "expertise": ["领域1", "领域2", "领域3"],
      "famous_quotes": ["名言1（30字内）", "名言2（30字内）"],
      "background": "背景介绍（50字内）",
      "investment_style": "风格标签（10字内）"
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
        return [
            {
                "id": "1",
                "name": "价值投资大师",
                "title": "资深价值投资者",
                "philosophy": "长期持有优质企业，关注企业内在价值",
                "personality_traits": ["耐心", "理性", "谨慎", "长期思维"],
                "expertise": ["价值投资", "企业分析", "财务报表", "护城河理论"],
                "famous_quotes": [
                    "时间是优秀企业的朋友，是平庸企业的敌人",
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
                "personality_traits": ["敏锐", "果断", "前瞻", "全局思维"],
                "expertise": ["宏观分析", "货币政策", "经济周期", "市场时机"],
                "famous_quotes": [
                    "市场可能在很长时间内保持非理性",
                    "重要的不是你是否正确，而是你正确时赚了多少钱"
                ],
                "background": "专注于宏观经济分析和投资策略",
                "investment_style": "宏观投资"
            },
            {
                "id": "3",
                "name": "多元思维导师",
                "title": "跨学科投资专家",
                "philosophy": "运用多元思维模型，避免认知偏差",
                "personality_traits": ["睿智", "理性", "全面", "批判思维"],
                "expertise": ["多元思维", "心理学", "概率论", "逆向思维"],
                "famous_quotes": [
                    "多元思维模型是投资成功的关键",
                    "避免愚蠢比追求聪明更重要"
                ],
                "background": "运用多元思维模型进行投资决策",
                "investment_style": "多元思维"
            },
            {
                "id": "4",
                "name": "技术分析专家",
                "title": "量化投资分析师",
                "philosophy": "基于数据和模型进行投资决策",
                "personality_traits": ["严谨", "数据驱动", "系统化", "创新"],
                "expertise": ["技术分析", "量化投资", "风险管理", "算法交易"],
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
