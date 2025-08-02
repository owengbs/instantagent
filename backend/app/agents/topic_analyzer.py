"""
话题分析器 - 根据用户问题智能选择最适合的首发智能体
"""

import re
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class AnalysisResult:
    """话题分析结果"""
    preferred_agent: Optional[str]  # 推荐的首发智能体
    confidence: float               # 置信度 (0-1)
    matched_keywords: List[str]     # 匹配的关键词
    reason: str                     # 选择理由
    scores: Dict[str, float]        # 各智能体得分详情

class TopicAnalyzer:
    """智能话题分析器"""
    
    # 智能体专业领域配置
    AGENT_EXPERTISE = {
        'buffett': {
            'keywords': [
                # 价值投资核心概念
                '价值投资', '长期投资', '基本面分析', '财务分析', '企业价值', '内在价值',
                '护城河', '竞争优势', '分红', '股息', '现金流', '自由现金流',
                '市盈率', 'PE', '市净率', 'PB', 'ROE', '净资产收益率',
                
                # 巴菲特相关
                '巴菲特', '沃伦', 'warren', 'buffett', '伯克希尔', 'berkshire',
                '奥马哈', '股神', '投资之神',
                
                # 投资理念
                '长期持有', '价值发现', '安全边际', '逆向投资', '集中投资',
                '能力圈', '护城河企业', '优质企业', '白马股',
                
                # 相关公司和案例
                '可口可乐', '苹果', 'apple', '比亚迪', '中石油', '银行股',
                
                # 英文关键词
                'value investing', 'long term', 'fundamental analysis', 'moat',
                'dividend', 'cash flow', 'intrinsic value', 'margin of safety'
            ],
            'strength_score': 1.0,
            'description': '价值投资和长期持有策略专家'
        },
        
        'soros': {
            'keywords': [
                # 宏观投资
                '宏观投资', '宏观经济', '货币政策', '财政政策', '汇率', '外汇',
                '量化宽松', 'QE', '加息', '降息', '通胀', '通缩',
                '经济周期', '经济危机', '金融危机', '泡沫', '崩盘',
                
                # 索罗斯相关
                '索罗斯', '乔治', 'george', 'soros', '量子基金', 'quantum',
                '金融巨鳄', '做空之王', '反身性理论',
                
                # 投机和对冲
                '投机', '对冲', '套利', '做空', '杠杆', '衍生品',
                '期货', '期权', '外汇交易', 'forex',
                
                # 宏观事件
                '黑天鹅', '灰犀牛', '地缘政治', '贸易战', '脱欧',
                '美联储', 'fed', '央行', '欧洲央行', '日本央行',
                
                # 市场情绪
                '市场情绪', '恐慌', '贪婪', '非理性', '羊群效应',
                '技术分析', '趋势', '支撑', '阻力',
                
                # 英文关键词
                'macro investing', 'currency', 'forex', 'hedge fund',
                'speculation',                 'reflexivity', 'market sentiment', 'bubble'
            ],
            'strength_score': 1.0,
            'description': '宏观经济分析和投机策略专家'
        },
        
        'munger': {
            'keywords': [
                # 多元思维模型
                '多元思维', '思维模型', '格栅理论', '跨学科', '逆向思考', '逆向思维',
                '认知偏差', '心理学', '行为金融学', '认知陷阱', '思维陷阱',
                
                # 芒格相关
                '芒格', '查理', 'charlie', 'munger', '多元智慧', '格栅',
                
                # 学习和智慧
                '终身学习', '学习机器', '智慧', '常识', '简单', '复杂问题简单化',
                '第一性原理', '基本原理', '本质思考',
                
                # 决策和判断
                '决策', '判断', '选择', '错误', '失败', '经验教训',
                '概率思维', '统计思维', '数学思维',
                
                # 跨学科概念
                '物理学', '生物学', '化学', '工程学', '系统思维',
                '复合效应', '临界点', '网络效应', '规模效应',
                
                # 英文关键词
                'mental models', 'multidisciplinary', 'cognitive bias',
                'invert', 'latticework', 'first principles'
            ],
            'strength_score': 1.0,
            'description': '多元思维模型和跨学科分析专家'
        }
    }
    
    # 权重配置
    CONFIDENCE_THRESHOLD = 0.6  # 置信度阈值，低于此值则随机选择
    KEYWORD_MATCH_WEIGHT = 1.0   # 关键词匹配权重
    CONTEXT_BOOST_WEIGHT = 0.2   # 上下文增强权重
    
    def __init__(self):
        """初始化话题分析器"""
        self._compile_keyword_patterns()
        logger.info("🧠 话题分析器初始化完成")
    
    def _compile_keyword_patterns(self):
        """编译关键词正则表达式模式，提高匹配效率"""
        self.keyword_patterns = {}
        
        for agent_id, config in self.AGENT_EXPERTISE.items():
            patterns = []
            for keyword in config['keywords']:
                # 支持中英文关键词，忽略大小写
                pattern = re.escape(keyword)
                patterns.append(pattern)
            
            # 组合成单个正则表达式
            combined_pattern = '|'.join(patterns)
            self.keyword_patterns[agent_id] = re.compile(
                combined_pattern, 
                re.IGNORECASE | re.UNICODE
            )
            
        logger.debug(f"📝 编译关键词模式完成: {list(self.keyword_patterns.keys())}")
    
    def analyze_topic_preference(self, user_message: str, context: Optional[Dict] = None) -> AnalysisResult:
        """
        分析用户问题的话题倾向性
        
        Args:
            user_message: 用户输入的问题
            context: 可选的上下文信息（如会话历史）
            
        Returns:
            AnalysisResult: 分析结果
        """
        try:
            logger.info(f"🔍 开始分析话题倾向: '{user_message[:50]}...'")
            
            # 预处理用户消息
            processed_message = self._preprocess_message(user_message)
            
            # 计算各智能体的匹配得分
            agent_scores = {}
            all_matched_keywords = {}
            
            for agent_id, pattern in self.keyword_patterns.items():
                matches = pattern.findall(processed_message)
                matched_keywords = list(set(matches))  # 去重
                
                # 基础关键词匹配得分
                keyword_score = len(matched_keywords) * self.KEYWORD_MATCH_WEIGHT
                
                # 上下文增强得分（如果提供）
                context_score = self._calculate_context_score(agent_id, context) if context else 0
                
                # 总得分
                total_score = keyword_score + context_score
                
                agent_scores[agent_id] = total_score
                all_matched_keywords[agent_id] = matched_keywords
                
                logger.debug(f"📊 {agent_id} 得分: 关键词={keyword_score}, 上下文={context_score}, 总分={total_score}")
                logger.debug(f"🎯 {agent_id} 匹配关键词: {matched_keywords}")
            
            # 确定推荐的智能体
            if not any(agent_scores.values()):
                # 没有任何匹配，随机选择
                return AnalysisResult(
                    preferred_agent=None,
                    confidence=0.0,
                    matched_keywords=[],
                    reason="未找到明确的话题倾向，建议随机选择",
                    scores=agent_scores
                )
            
            # 找到得分最高的智能体
            best_agent = max(agent_scores.items(), key=lambda x: x[1])
            best_agent_id, best_score = best_agent
            
            # 计算置信度
            total_score = sum(agent_scores.values())
            confidence = best_score / total_score if total_score > 0 else 0
            
            # 生成选择理由
            reason = self._generate_reason(
                best_agent_id, 
                all_matched_keywords[best_agent_id], 
                confidence
            )
            
            result = AnalysisResult(
                preferred_agent=best_agent_id if confidence >= self.CONFIDENCE_THRESHOLD else None,
                confidence=confidence,
                matched_keywords=all_matched_keywords[best_agent_id],
                reason=reason,
                scores=agent_scores
            )
            
            logger.info(f"✅ 话题分析完成: 推荐={result.preferred_agent}, 置信度={result.confidence:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 话题分析失败: {e}")
            return AnalysisResult(
                preferred_agent=None,
                confidence=0.0,
                matched_keywords=[],
                reason=f"分析过程出错: {str(e)}",
                scores={}
            )
    
    def _preprocess_message(self, message: str) -> str:
        """预处理用户消息"""
        # 转换为小写，便于匹配
        processed = message.lower()
        
        # 移除多余的空白字符
        processed = re.sub(r'\s+', ' ', processed).strip()
        
        return processed
    
    def _calculate_context_score(self, agent_id: str, context: Dict) -> float:
        """计算上下文增强得分"""
        # 这里可以根据会话历史、用户偏好等计算额外得分
        # 暂时返回0，后续可以扩展
        return 0.0
    
    def _generate_reason(self, agent_id: str, matched_keywords: List[str], confidence: float) -> str:
        """生成选择理由"""
        if not matched_keywords:
            return "无明显话题倾向"
        
        agent_desc = self.AGENT_EXPERTISE[agent_id]['description']
        keywords_str = "、".join(matched_keywords[:3])  # 只显示前3个关键词
        
        if len(matched_keywords) > 3:
            keywords_str += f"等{len(matched_keywords)}个关键词"
        
        if confidence >= 0.8:
            confidence_desc = "强烈"
        elif confidence >= 0.6:
            confidence_desc = "较强"
        else:
            confidence_desc = "轻微"
        
        return f"检测到{confidence_desc}的{agent_desc}倾向，匹配关键词：{keywords_str}"
    
    def get_agent_expertise_summary(self) -> Dict[str, str]:
        """获取智能体专业领域摘要"""
        summary = {}
        for agent_id, config in self.AGENT_EXPERTISE.items():
            summary[agent_id] = {
                'description': config['description'],
                'keywords_count': len(config['keywords'])
            }
        return summary

# 创建全局实例
topic_analyzer = TopicAnalyzer()