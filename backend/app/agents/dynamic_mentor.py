"""
动态导师类
根据AI生成的特征动态创建导师实例
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import random

from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class DynamicMentor(BaseAgent):
    """动态导师类 - 根据AI生成的特征创建导师实例"""
    
    def __init__(self, mentor_data: Dict[str, Any]):
        """
        初始化动态导师
        
        Args:
            mentor_data: 包含导师特征的字典
        """
        # 从生成的数据中提取基本信息
        # 生成唯一的动态导师ID，避免ID冲突
        base_id = mentor_data.get('id', str(random.randint(1000, 9999)))
        agent_id = f"dynamic_{base_id}_{random.randint(10000, 99999)}"
        name = mentor_data.get('name', '动态导师')
        title = mentor_data.get('title', '投资专家')
        description = mentor_data.get('background', '')
        
        # 根据导师ID分配语音
        voice = self._assign_voice(agent_id)
        
        super().__init__(agent_id, name, description, voice)
        
        # 设置导师特征
        self.title = title
        self.philosophy = mentor_data.get('philosophy', '')
        self.personality_traits = mentor_data.get('personality_traits', [])
        self.expertise = mentor_data.get('expertise', [])
        self.famous_quotes = mentor_data.get('famous_quotes', [])
        self.background = mentor_data.get('background', '')
        self.investment_style = mentor_data.get('investment_style', '')
        
        # 设置对话风格
        self.conversation_styles = self._build_conversation_styles()
        
        # 设置创建时间
        self.created_at = datetime.now().isoformat()
        
        logger.info(f"✅ 动态导师创建成功: {name} ({agent_id})")
    
    def _assign_voice(self, agent_id: str) -> str:
        """根据导师ID分配语音"""
        # 使用固定的语音分配逻辑
        voices = ["Chelsie", "Cherry", "Ethan", "Serena"]
        # 使用agent_id的哈希值来分配语音
        voice_index = hash(agent_id) % len(voices)
        return voices[voice_index]
    
    def _build_conversation_styles(self) -> Dict[str, Dict[str, Any]]:
        """构建对话风格配置"""
        # 根据性格特征构建对话风格
        is_analytical = any(trait in ['理性', '严谨', '分析'] for trait in self.personality_traits)
        is_enthusiastic = any(trait in ['热情', '积极', '乐观'] for trait in self.personality_traits)
        is_cautious = any(trait in ['谨慎', '保守', '稳健'] for trait in self.personality_traits)
        
        return {
            "greeting_casual": {
                "tone": "温和友善" if is_cautious else "热情友好" if is_enthusiastic else "专业理性",
                "length": "简短",
                "professional_level": "低",
                "personal_touch": "高",
                "example_phrases": ["很高兴见到你", "今天怎么样", "有什么想聊的吗"]
            },
            "light_chat": {
                "tone": "轻松随意" if is_enthusiastic else "温和随意" if is_cautious else "理性轻松",
                "length": "简短到中等",
                "professional_level": "低到中等",
                "personal_touch": "高",
                "example_phrases": ["哈哈", "你知道吗", "这让我想起", "说起来"]
            },
            "professional_discussion": {
                "tone": "专业理性" if is_analytical else "热情专业" if is_enthusiastic else "稳健专业",
                "length": "中等",
                "professional_level": "高",
                "personal_touch": "中等",
                "example_phrases": ["我觉得", f"从{self.investment_style}角度", "长期来看", "这提醒我"]
            },
            "deep_analysis": {
                "tone": "深思熟虑" if is_analytical else "热情深入" if is_enthusiastic else "稳健深入",
                "length": "中等到长",
                "professional_level": "很高",
                "personal_touch": "中等",
                "example_phrases": ["让我们深入思考", "从历史经验看", "关键在于", "我的观点是"]
            }
        }
    
    async def generate_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        生成导师回复
        
        Args:
            user_message: 用户消息
            context: 对话上下文
            
        Returns:
            导师的回复文本
        """
        try:
            # 构建系统提示词
            system_prompt = self._build_system_prompt(context)
            
            # 构建用户消息
            user_prompt = self._build_user_prompt(user_message, context)
            
            # 调用LLM生成回复
            from ..utils.llm_client import llm_client
            response = await llm_client.generate_response(
                system_prompt=system_prompt,
                user_message=user_prompt,
                temperature=0.7,
                max_tokens=500
            )
            
            # 记录对话历史
            self.add_to_history({
                "role": "user",
                "content": user_message,
                "timestamp": datetime.now().isoformat()
            })
            
            self.add_to_history({
                "role": "assistant",
                "content": response,
                "timestamp": datetime.now().isoformat()
            })
            
            return response
            
        except Exception as e:
            logger.error(f"❌ 动态导师回复生成失败: {e}")
            return self._generate_default_response(user_message)
    
    def _build_system_prompt(self, context: Optional[Dict[str, Any]] = None) -> str:
        """构建系统提示词"""
        # 确定对话风格
        style = self._determine_conversation_style(context)
        style_config = self.conversation_styles.get(style, self.conversation_styles["professional_discussion"])
        
        return f"""
你是{self.name}，{self.title}。

个人背景：{self.background}

投资哲学：{self.philosophy}

专业领域：{', '.join(self.expertise)}

性格特征：{', '.join(self.personality_traits)}

投资风格：{self.investment_style}

经典名言：
{chr(10).join([f"- {quote}" for quote in self.famous_quotes])}

{self._build_style_instruction(style_config)}

请以{self.name}的身份和风格回复用户的问题。保持专业性和个人特色。
"""
    
    def _build_user_prompt(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """构建用户提示词"""
        prompt = f"用户问题：{user_message}"
        
        if context and context.get('other_responses'):
            prompt += f"\n\n其他导师的观点：\n"
            for response in context['other_responses']:
                prompt += f"- {response['name']}: {response['content']}\n"
            prompt += f"\n请基于以上信息，以{self.name}的视角给出你的观点。"
        
        return prompt
    
    def _determine_conversation_style(self, context: Optional[Dict[str, Any]] = None) -> str:
        """确定对话风格"""
        if not context:
            return "greeting_casual"
        
        # 根据上下文确定风格
        if context.get('is_first_speaker'):
            return "greeting_casual"
        elif context.get('complexity') == 'high':
            return "deep_analysis"
        elif context.get('conversation_mode') == 'casual':
            return "light_chat"
        else:
            return "professional_discussion"
    
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
    
    def _generate_default_response(self, user_message: str) -> str:
        """生成默认回复"""
        responses = [
            f"作为{self.name}，我认为这是一个很有趣的问题。{self.philosophy}",
            f"从{self.investment_style}的角度来看，{user_message}确实值得深入思考。",
            f"这让我想起我常说的一句话：{random.choice(self.famous_quotes)}",
            f"基于我在{', '.join(self.expertise[:2])}方面的经验，我想分享一些看法。"
        ]
        return random.choice(responses)
    
    def get_agent_info(self) -> Dict[str, Any]:
        """获取导师信息"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "title": self.title,
            "description": self.description,
            "voice": self.voice,
            "philosophy": self.philosophy,
            "personality_traits": self.personality_traits,
            "expertise": self.expertise,
            "famous_quotes": self.famous_quotes,
            "background": self.background,
            "investment_style": self.investment_style,
            "created_at": self.created_at
        }

