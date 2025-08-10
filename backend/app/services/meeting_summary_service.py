"""
会议总结服务
负责分析对话历史，生成智能会议纪要
"""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from openai import OpenAI

logger = logging.getLogger(__name__)

class MeetingSummaryService:
    """会议总结服务"""
    
    def __init__(self):
        self.openai_client = OpenAI(
            base_url="http://v2.open.venus.oa.com/llmproxy",
            api_key="xxBZykeTGIVeqyGNaxNoMDro@2468"
        )
        self.model = "deepseek-r1-local-II"
    
    async def generate_meeting_summary(
        self, 
        messages: List[Dict[str, Any]], 
        session_info: Dict[str, Any],
        participants: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        生成会议总结
        
        Args:
            messages: 对话消息列表
            session_info: 会话信息（主题、时间等）
            participants: 参与者信息
            
        Returns:
            包含会议总结的字典
        """
        try:
            logger.info(f"🎯 开始生成会议总结: 消息数={len(messages)}, 参与者数={len(participants)}")
            
            # 1. 整理对话历史
            conversation_text = self._format_conversation(messages, participants)
            
            # 2. 基于实际消息确定真实参与者
            actual_participants = self._get_actual_participants_from_messages(messages, participants)
            logger.info(f"🎯 实际参与者: {[p['name'] for p in actual_participants]}")
            
            # 3. 构建总结提示词（使用实际参与者）
            summary_prompt = self._build_summary_prompt(conversation_text, session_info, actual_participants)
            
            # 4. 调用大模型生成总结
            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一位专业的会议记录员和投资顾问，擅长整理会议纪要和提炼核心观点。"},
                    {"role": "user", "content": summary_prompt}
                ],
                max_tokens=3000,
                temperature=0.3
            )
            
            # 5. 解析总结内容
            summary_content = response.choices[0].message.content
            structured_summary = self._parse_summary(summary_content)
            
            # 6. 构建完整的会议纪要
            meeting_summary = {
                "id": f"summary_{session_info.get('session_id', datetime.now().strftime('%Y%m%d_%H%M%S'))}",
                "meeting_info": {
                    "topic": session_info.get("topic", "投资圆桌讨论"),
                    "date": datetime.now().strftime("%Y年%m月%d日"),
                    "time": datetime.now().strftime("%H:%M"),
                    "duration": self._calculate_duration(messages),
                    "participants_count": len(actual_participants),
                    "messages_count": len(messages)
                },
                "participants": [
                    {
                        "name": p.get("name", "未知"),
                        "role": p.get("title", p.get("description", "投资顾问")),
                        "message_count": len([m for m in messages if m.get("agent_id") == p.get("id")])
                    }
                    for p in actual_participants
                ],
                "summary": structured_summary,
                "generated_at": datetime.now().isoformat(),
                "raw_conversation": conversation_text if len(conversation_text) < 5000 else conversation_text[:5000] + "..."
            }
            
            logger.info(f"✅ 会议总结生成成功: {meeting_summary['id']}")
            return meeting_summary
            
        except Exception as e:
            logger.error(f"❌ 生成会议总结失败: {e}")
            # 如果actual_participants未定义，使用原始participants
            fallback_participants = actual_participants if 'actual_participants' in locals() else participants
            return self._generate_fallback_summary(session_info, fallback_participants, len(messages))
    
    def _format_conversation(self, messages: List[Dict[str, Any]], participants: List[Dict[str, Any]]) -> str:
        """格式化对话历史"""
        # 创建参与者名称映射
        participant_names = {p.get("id", ""): p.get("name", "未知") for p in participants}
        participant_names["user"] = "用户"
        
        formatted_lines = []
        logger.info(f"🔍 格式化对话: 总共{len(messages)}条消息")
        
        for msg in messages:
            # 处理用户消息和智能体回复消息
            msg_type = msg.get("type", "")
            if msg_type in ["user", "agent", "multi_agent_response"]:
                agent_id = msg.get("agent_id", "")
                speaker = participant_names.get(agent_id, f"未知发言人({agent_id})")
                content = msg.get("content", "").strip()
                
                if content:
                    timestamp = msg.get("timestamp", "")
                    formatted_lines.append(f"【{speaker}】: {content}")
                    logger.debug(f"✅ 添加消息: {speaker} - {content[:50]}...")
                else:
                    logger.warning(f"⚠️ 空消息: {msg}")
            else:
                logger.debug(f"🔍 跳过消息类型: {msg_type}")
        
        formatted_text = "\n\n".join(formatted_lines)
        logger.info(f"📝 格式化完成: {len(formatted_lines)}条有效消息, 总长度{len(formatted_text)}字符")
        return formatted_text
    
    def _get_actual_participants_from_messages(self, messages: List[Dict[str, Any]], all_participants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        根据实际消息确定真正参与对话的参与者
        
        Args:
            messages: 所有消息
            all_participants: 所有可能的参与者
            
        Returns:
            实际参与对话的参与者列表
        """
        # 从消息中提取实际发言的agent_id
        actual_agent_ids = set()
        for msg in messages:
            msg_type = msg.get("type", "")
            if msg_type in ["user", "agent", "multi_agent_response"]:
                agent_id = msg.get("agent_id", "")
                if agent_id:
                    actual_agent_ids.add(agent_id)
        
        logger.info(f"🔍 从消息中找到的实际参与者ID: {actual_agent_ids}")
        
        # 筛选出实际参与的参与者
        actual_participants = []
        participant_id_map = {p.get("id", ""): p for p in all_participants}
        
        for agent_id in actual_agent_ids:
            if agent_id in participant_id_map:
                actual_participants.append(participant_id_map[agent_id])
                logger.info(f"✅ 确认参与者: {participant_id_map[agent_id].get('name', agent_id)}")
            else:
                logger.warning(f"⚠️ 找不到参与者信息: {agent_id}")
        
        # 确保用户总是被包含（如果不在列表中的话）
        user_participant = participant_id_map.get("user")
        if user_participant and user_participant not in actual_participants:
            actual_participants.insert(0, user_participant)
        
        return actual_participants
    
    def _build_summary_prompt(self, conversation: str, session_info: Dict[str, Any], participants: List[Dict[str, Any]]) -> str:
        """构建总结提示词"""
        topic = session_info.get("topic", "投资讨论")
        participant_list = "、".join([p.get("name", "未知") for p in participants])
        
        prompt = f"""
请对以下投资圆桌会议进行专业总结，生成结构化的会议纪要。

会议主题：{topic}
参与导师：{participant_list}

对话内容：
{conversation}

请按以下JSON格式生成总结（只返回JSON，不要其他内容）：
{{
  "executive_summary": "会议核心要点总结（100-200字）",
  "key_insights": [
    {{
      "topic": "关键议题1",
      "insights": ["观点1", "观点2", "观点3"],
      "participants": ["发表此观点的导师名单"]
    }}
  ],
  "mentor_perspectives": [
    {{
      "mentor": "导师姓名",
      "main_points": ["核心观点1", "核心观点2"],
      "key_quotes": ["重要引言1", "重要引言2"]
    }}
  ],
  "actionable_advice": [
    "具体可执行的投资建议1",
    "具体可执行的投资建议2"
  ],
  "discussion_highlights": [
    "会议精彩片段或重要讨论点1",
    "会议精彩片段或重要讨论点2"
  ],
  "consensus_and_disagreements": {{
    "consensus": ["达成共识的观点"],
    "disagreements": ["存在分歧的议题"]
  }}
}}

要求：
1. 内容要准确反映对话内容，不要编造
2. 突出各导师的独特观点和专业见解
3. 提炼出可操作的投资建议
4. 语言要专业但易懂，适合投资者阅读
5. 如果对话内容较少，请如实反映并相应调整总结长度
"""
        return prompt
    
    def _parse_summary(self, content: str) -> Dict[str, Any]:
        """解析AI生成的总结内容"""
        try:
            # 清理content，去除可能的markdown代码块标记
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            return json.loads(content)
            
        except json.JSONDecodeError as e:
            logger.warning(f"总结内容JSON解析失败: {e}")
            # 返回结构化的默认总结
            return {
                "executive_summary": "本次投资圆桌会议进行了深入的讨论，各位导师分享了宝贵的投资见解和建议。",
                "key_insights": [
                    {
                        "topic": "投资策略讨论",
                        "insights": ["多位导师分享了各自的投资理念"],
                        "participants": ["所有参与导师"]
                    }
                ],
                "mentor_perspectives": [],
                "actionable_advice": ["继续关注市场动态", "保持理性投资心态"],
                "discussion_highlights": ["各导师进行了精彩的观点交流"],
                "consensus_and_disagreements": {
                    "consensus": ["理性投资的重要性"],
                    "disagreements": []
                }
            }
    
    def _calculate_duration(self, messages: List[Dict[str, Any]]) -> str:
        """计算会议时长"""
        if not messages:
            return "0分钟"
        
        try:
            first_msg = messages[0]
            last_msg = messages[-1]
            
            first_time = datetime.fromisoformat(first_msg.get("timestamp", "").replace("Z", ""))
            last_time = datetime.fromisoformat(last_msg.get("timestamp", "").replace("Z", ""))
            
            duration = last_time - first_time
            minutes = int(duration.total_seconds() / 60)
            
            if minutes < 1:
                return "不到1分钟"
            elif minutes < 60:
                return f"{minutes}分钟"
            else:
                hours = minutes // 60
                remaining_minutes = minutes % 60
                return f"{hours}小时{remaining_minutes}分钟"
                
        except Exception:
            return "未知时长"
    
    def _generate_fallback_summary(self, session_info: Dict[str, Any], participants: List[Dict[str, Any]], message_count: int) -> Dict[str, Any]:
        """生成备用总结（当AI生成失败时使用）"""
        return {
            "id": f"fallback_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "meeting_info": {
                "topic": session_info.get("topic", "投资圆桌讨论"),
                "date": datetime.now().strftime("%Y年%m月%d日"),
                "time": datetime.now().strftime("%H:%M"),
                "duration": "未知时长",
                "participants_count": len(participants),
                "messages_count": message_count
            },
            "participants": [
                {
                    "name": p.get("name", "未知"),
                    "role": p.get("title", "投资顾问"),
                    "message_count": 0
                }
                for p in participants
            ],
            "summary": {
                "executive_summary": f"本次关于'{session_info.get('topic', '投资策略')}'的圆桌会议已圆满结束。各位导师进行了深入的讨论和交流，分享了宝贵的投资见解。",
                "key_insights": [
                    {
                        "topic": "会议讨论",
                        "insights": ["各位导师分享了专业观点", "进行了深入的投资分析"],
                        "participants": [p.get("name", "未知") for p in participants]
                    }
                ],
                "mentor_perspectives": [
                    {
                        "mentor": p.get("name", "未知"),
                        "main_points": ["分享了专业的投资见解"],
                        "key_quotes": []
                    }
                    for p in participants
                ],
                "actionable_advice": [
                    "继续关注市场动态和投资机会",
                    "保持理性和长期的投资视角"
                ],
                "discussion_highlights": [
                    "导师们进行了专业而深入的讨论",
                    "会议氛围热烈，观点交流充分"
                ],
                "consensus_and_disagreements": {
                    "consensus": ["理性投资的重要性"],
                    "disagreements": []
                }
            },
            "generated_at": datetime.now().isoformat(),
            "is_fallback": True
        }

# 创建全局会议总结服务实例
meeting_summary_service = MeetingSummaryService()
