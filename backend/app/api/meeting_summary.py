"""
会议总结API
提供会议纪要生成、获取和管理功能
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.meeting_summary_service import meeting_summary_service
from ..agents.agent_manager import agent_manager

logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/meeting-summary", tags=["meeting-summary"])

# 存储会议总结（内存中，生产环境应使用数据库）
meeting_summaries: Dict[str, Dict[str, Any]] = {}

class GenerateSummaryRequest(BaseModel):
    """生成总结请求"""
    session_id: str
    topic: Optional[str] = None
    custom_instructions: Optional[str] = None

class SummaryResponse(BaseModel):
    """总结响应"""
    success: bool
    summary_id: str
    message: str
    summary: Optional[Dict[str, Any]] = None

@router.post("/generate", response_model=SummaryResponse)
async def generate_meeting_summary(request: GenerateSummaryRequest):
    """
    生成会议总结
    
    Args:
        request: 生成总结请求
        
    Returns:
        会议总结响应
    """
    try:
        logger.info(f"🎯 收到会议总结生成请求: session_id={request.session_id}")
        logger.info(f"🎯 请求主题: {request.topic}")
        logger.info(f"🔍 当前所有会话ID: {list(agent_manager.conversation_sessions.keys())}")
        logger.info(f"🔍 当前动态导师会话: {list(agent_manager.dynamic_mentors.keys())}")
        
        # 1. 获取会话消息历史
        messages = get_session_messages(request.session_id)
        if not messages:
            logger.error(f"❌ 未找到会话消息历史: session_id={request.session_id}")
            logger.error(f"💡 可用的会话ID: {list(agent_manager.conversation_sessions.keys())}")
            raise HTTPException(status_code=404, detail="未找到会话消息历史")
        
        logger.info(f"📋 获取到 {len(messages)} 条消息")
        
        # 2. 获取会话信息和参与者
        session_info = get_session_info(request.session_id)
        participants = get_session_participants(request.session_id)
        
        if request.topic:
            session_info["topic"] = request.topic
        
        logger.info(f"👥 参与者: {[p.get('name') for p in participants]}")
        
        # 3. 生成会议总结
        summary = await meeting_summary_service.generate_meeting_summary(
            messages=messages,
            session_info=session_info,
            participants=participants
        )
        
        # 4. 保存总结
        summary_id = summary["id"]
        meeting_summaries[summary_id] = summary
        
        logger.info(f"✅ 会议总结生成成功: {summary_id}")
        
        return SummaryResponse(
            success=True,
            summary_id=summary_id,
            message="会议总结生成成功",
            summary=summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 生成会议总结失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成会议总结失败: {str(e)}")

@router.get("/{summary_id}")
async def get_meeting_summary(summary_id: str):
    """
    获取会议总结
    
    Args:
        summary_id: 总结ID
        
    Returns:
        会议总结详情
    """
    try:
        if summary_id not in meeting_summaries:
            raise HTTPException(status_code=404, detail="会议总结不存在")
        
        summary = meeting_summaries[summary_id]
        logger.info(f"📖 获取会议总结: {summary_id}")
        
        return {
            "success": True,
            "summary": summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 获取会议总结失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取会议总结失败: {str(e)}")

@router.get("/session/{session_id}/messages")
async def get_session_messages_api(session_id: str):
    """
    获取会话消息（调试用）
    
    Args:
        session_id: 会话ID
        
    Returns:
        会话消息列表
    """
    try:
        messages = get_session_messages(session_id)
        participants = get_session_participants(session_id)
        
        # 统计消息类型
        message_types = {}
        agent_message_counts = {}
        
        for msg in messages:
            msg_type = msg.get("type", "unknown")
            agent_id = msg.get("agent_id", "unknown")
            
            message_types[msg_type] = message_types.get(msg_type, 0) + 1
            agent_message_counts[agent_id] = agent_message_counts.get(agent_id, 0) + 1
        
        return {
            "success": True,
            "session_id": session_id,
            "message_count": len(messages),
            "message_types": message_types,
            "agent_message_counts": agent_message_counts,
            "participants": [{"id": p.get("id"), "name": p.get("name")} for p in participants],
            "messages": messages
        }
        
    except Exception as e:
        logger.error(f"❌ 获取会话消息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取会话消息失败: {str(e)}")

def get_session_messages(session_id: str) -> List[Dict[str, Any]]:
    """
    从agent_manager获取会话消息历史
    
    Args:
        session_id: 会话ID
        
    Returns:
        消息列表
    """
    try:
        logger.info(f"🔍 查找会话消息: session_id={session_id}")
        logger.info(f"🔍 当前conversation_sessions: {list(agent_manager.conversation_sessions.keys())}")
        
        # 从agent_manager的conversation_sessions中获取消息
        if session_id in agent_manager.conversation_sessions:
            session = agent_manager.conversation_sessions[session_id]
            messages = session.get("messages", [])
            logger.info(f"📋 找到 {len(messages)} 条消息")
            return messages
        else:
            # 智能匹配：查找包含该sessionId的会话
            logger.info(f"🔍 尝试智能匹配sessionId: {session_id}")
            
            # 方法1：查找以sessionId结尾的会话
            for stored_session_id in agent_manager.conversation_sessions.keys():
                if stored_session_id.endswith(session_id):
                    logger.info(f"✅ 智能匹配成功: {stored_session_id} -> {session_id}")
                    session = agent_manager.conversation_sessions[stored_session_id]
                    messages = session.get("messages", [])
                    logger.info(f"📋 找到 {len(messages)} 条消息")
                    return messages
            
            # 方法2：查找包含sessionId的会话
            for stored_session_id in agent_manager.conversation_sessions.keys():
                if session_id in stored_session_id:
                    logger.info(f"✅ 智能匹配成功: {stored_session_id} -> {session_id}")
                    session = agent_manager.conversation_sessions[stored_session_id]
                    messages = session.get("messages", [])
                    logger.info(f"📋 找到 {len(messages)} 条消息")
                    return messages
            
            # 方法3：查找默认导师会话（去掉用户ID前缀）
            if session_id.startswith('default_'):
                for stored_session_id in agent_manager.conversation_sessions.keys():
                    if 'default_' in stored_session_id and session_id.replace('default_', '') in stored_session_id:
                        logger.info(f"✅ 默认导师会话匹配成功: {stored_session_id} -> {session_id}")
                        session = agent_manager.conversation_sessions[stored_session_id]
                        messages = session.get("messages", [])
                        logger.info(f"📋 找到 {len(messages)} 条消息")
                        return messages
            
            logger.warning(f"⚠️ 会话不存在: {session_id}")
            logger.warning(f"💡 提示：可能的会话ID: {list(agent_manager.conversation_sessions.keys())}")
            return []
            
    except Exception as e:
        logger.error(f"❌ 获取会话消息失败: {e}")
        return []

def get_session_info(session_id: str) -> Dict[str, Any]:
    """
    获取会话基本信息
    
    Args:
        session_id: 会话ID
        
    Returns:
        会话信息字典
    """
    try:
        session_info = {
            "session_id": session_id,
            "topic": "投资圆桌讨论",
            "created_at": datetime.now().isoformat()
        }
        
        # 尝试从agent_manager获取更多信息
        if session_id in agent_manager.conversation_sessions:
            session = agent_manager.conversation_sessions[session_id]
            if "created_at" in session:
                session_info["created_at"] = session["created_at"]
        else:
            # 智能匹配：查找包含该sessionId的会话
            for stored_session_id in agent_manager.conversation_sessions.keys():
                if session_id in stored_session_id:
                    logger.info(f"✅ 智能匹配会话信息: {stored_session_id} -> {session_id}")
                    session = agent_manager.conversation_sessions[stored_session_id]
                    if "created_at" in session:
                        session_info["created_at"] = session["created_at"]
                    break
        
        # 检查是否为动态导师会话
        if session_id in agent_manager.session_topics:
            session_info["topic"] = agent_manager.session_topics[session_id]
            session_info["is_dynamic"] = True
        
        return session_info
        
    except Exception as e:
        logger.error(f"❌ 获取会话信息失败: {e}")
        return {
            "session_id": session_id,
            "topic": "投资圆桌讨论",
            "created_at": datetime.now().isoformat()
        }

def get_session_participants(session_id: str) -> List[Dict[str, Any]]:
    """
    获取会话参与者信息
    
    Args:
        session_id: 会话ID
        
    Returns:
        参与者信息列表
    """
    try:
        participants = []
        
        # 添加用户
        participants.append({
            "id": "user",
            "name": "用户",
            "title": "投资者",
            "description": "会议主持人和提问者"
        })
        
        logger.info(f"🔍 获取会话参与者: session_id={session_id}")
        logger.info(f"🔍 动态导师会话: {list(agent_manager.dynamic_mentors.keys())}")
        logger.info(f"🔍 当前智能体: {list(agent_manager.agents.keys())}")
        
        # 获取参与的导师
        if session_id in agent_manager.dynamic_mentors:
            # 动态导师会话
            dynamic_mentor_ids = agent_manager.dynamic_mentors[session_id]
            logger.info(f"🎯 动态导师ID: {dynamic_mentor_ids}")
            for mentor_id in dynamic_mentor_ids:
                if mentor_id in agent_manager.agents:
                    agent = agent_manager.agents[mentor_id]
                    participants.append({
                        "id": mentor_id,
                        "name": agent.name,
                        "title": getattr(agent, 'title', '投资顾问'),
                        "description": agent.description
                    })
                    logger.info(f"✅ 添加动态导师: {agent.name}")
                else:
                    logger.warning(f"⚠️ 动态导师不存在: {mentor_id}")
        else:
            # 静态导师会话，获取所有启用的导师
            logger.info(f"📋 使用静态导师")
            for agent_id, agent in agent_manager.agents.items():
                if agent_id != "user":  # 排除用户
                    config = agent_manager.agent_configs.get(agent_id, {})
                    if config.get("enabled", True) and not config.get("is_dynamic", False):
                        participants.append({
                            "id": agent_id,
                            "name": agent.name,
                            "title": getattr(agent, 'title', '投资顾问'),
                            "description": agent.description
                        })
                        logger.info(f"✅ 添加静态导师: {agent.name}")
        
        logger.info(f"👥 获取到 {len(participants)} 位参与者: {[p['name'] for p in participants]}")
        return participants
        
    except Exception as e:
        logger.error(f"❌ 获取参与者信息失败: {e}")
        return [
            {
                "id": "user",
                "name": "用户",
                "title": "投资者",
                "description": "会议主持人"
            }
        ]

@router.delete("/{summary_id}")
async def delete_meeting_summary(summary_id: str):
    """
    删除会议总结
    
    Args:
        summary_id: 总结ID
        
    Returns:
        删除结果
    """
    try:
        if summary_id not in meeting_summaries:
            raise HTTPException(status_code=404, detail="会议总结不存在")
        
        del meeting_summaries[summary_id]
        logger.info(f"🗑️ 删除会议总结: {summary_id}")
        
        return {
            "success": True,
            "message": "会议总结已删除"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 删除会议总结失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除会议总结失败: {str(e)}")

@router.get("/")
async def list_meeting_summaries():
    """
    获取所有会议总结列表
    
    Returns:
        会议总结列表
    """
    try:
        summaries = []
        for summary_id, summary in meeting_summaries.items():
            summaries.append({
                "id": summary_id,
                "topic": summary.get("meeting_info", {}).get("topic", "未知主题"),
                "date": summary.get("meeting_info", {}).get("date", "未知日期"),
                "participants_count": summary.get("meeting_info", {}).get("participants_count", 0),
                "messages_count": summary.get("meeting_info", {}).get("messages_count", 0),
                "generated_at": summary.get("generated_at", "")
            })
        
        # 按生成时间倒序排列
        summaries.sort(key=lambda x: x.get("generated_at", ""), reverse=True)
        
        return {
            "success": True,
            "summaries": summaries
        }
        
    except Exception as e:
        logger.error(f"❌ 获取会议总结列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取会议总结列表失败: {str(e)}")
