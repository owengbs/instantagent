"""
用户管理API
提供多用户系统的管理和统计功能
"""
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.multi_user_manager import multi_user_manager

logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(tags=["users"])

class UserStatsResponse(BaseModel):
    """用户统计响应"""
    success: bool
    stats: Dict[str, Any]

class SystemStatsResponse(BaseModel):
    """系统统计响应"""
    success: bool
    stats: Dict[str, Any]

@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats():
    """
    获取系统统计信息
    
    Returns:
        系统统计数据
    """
    try:
        stats = multi_user_manager.get_system_stats()
        return SystemStatsResponse(
            success=True,
            stats=stats
        )
    except Exception as e:
        logger.error(f"❌ 获取系统统计失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取系统统计失败: {str(e)}")

@router.get("/{user_id}/stats", response_model=UserStatsResponse)
async def get_user_stats(user_id: str):
    """
    获取用户统计信息
    
    Args:
        user_id: 用户ID
        
    Returns:
        用户统计数据
    """
    try:
        stats = multi_user_manager.get_user_stats(user_id)
        if not stats:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        return UserStatsResponse(
            success=True,
            stats=stats
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 获取用户统计失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取用户统计失败: {str(e)}")

@router.get("/active")
async def get_active_users():
    """
    获取活跃用户列表
    
    Returns:
        活跃用户列表
    """
    try:
        active_users = list(multi_user_manager.active_users)
        return {
            "success": True,
            "active_users": active_users,
            "count": len(active_users)
        }
    except Exception as e:
        logger.error(f"❌ 获取活跃用户失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取活跃用户失败: {str(e)}")

@router.post("/cleanup")
async def cleanup_inactive_sessions():
    """
    清理非活跃会话
    
    Returns:
        清理结果
    """
    try:
        multi_user_manager.cleanup_inactive_sessions()
        return {
            "success": True,
            "message": "清理完成"
        }
    except Exception as e:
        logger.error(f"❌ 清理会话失败: {e}")
        raise HTTPException(status_code=500, detail=f"清理会话失败: {str(e)}")

@router.get("/{user_id}/sessions")
async def get_user_sessions(user_id: str):
    """
    获取用户会话列表
    
    Args:
        user_id: 用户ID
        
    Returns:
        用户会话列表
    """
    try:
        user_sessions_dict = multi_user_manager.user_sessions.get(user_id, {})
        sessions = []
        
        for session_id, session in user_sessions_dict.items():
            sessions.append({
                "session_id": session_id,
                "topic": session.topic,
                "created_at": session.created_at,
                "last_active_at": session.last_active_at,
                "is_active": session.is_active,
                "message_count": len(session.messages),
                "selected_mentors": session.selected_mentors,
                "dynamic_mentors": session.dynamic_mentors
            })
        
        # 按最后活跃时间排序
        sessions.sort(key=lambda x: x["last_active_at"], reverse=True)
        
        return {
            "success": True,
            "user_id": user_id,
            "sessions": sessions,
            "count": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"❌ 获取用户会话失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取用户会话失败: {str(e)}")

@router.get("/{user_id}/agents")
async def get_user_agents(user_id: str):
    """
    获取用户智能体列表
    
    Args:
        user_id: 用户ID
        
    Returns:
        用户智能体列表
    """
    try:
        agent_pool = multi_user_manager.get_user_agent_pool(user_id)
        
        agents = []
        for agent_id, agent in agent_pool.agents.items():
            config = agent_pool.agent_configs.get(agent_id, {})
            agents.append({
                "agent_id": agent_id,
                "name": agent.name,
                "description": agent.description,
                "voice": getattr(agent, 'voice', 'Cherry'),
                "is_dynamic": config.get('is_dynamic', False),
                "enabled": config.get('enabled', True),
                "registered_at": config.get('registered_at', ''),
                "session_id": config.get('session_id', ''),
                "topic": config.get('topic', '')
            })
        
        return {
            "success": True,
            "user_id": user_id,
            "agents": agents,
            "count": len(agents)
        }
        
    except Exception as e:
        logger.error(f"❌ 获取用户智能体失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取用户智能体失败: {str(e)}")

@router.delete("/{user_id}/sessions/{session_id}")
async def delete_user_session(user_id: str, session_id: str):
    """
    删除用户会话
    
    Args:
        user_id: 用户ID
        session_id: 会话ID
        
    Returns:
        删除结果
    """
    try:
        user_sessions = multi_user_manager.user_sessions.get(user_id, {})
        if session_id not in user_sessions:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        # 删除会话
        del user_sessions[session_id]
        
        # 删除相关的动态导师
        agent_pool = multi_user_manager.user_agent_pools.get(user_id)
        if agent_pool and session_id in agent_pool.dynamic_mentors:
            mentor_ids = agent_pool.dynamic_mentors[session_id]
            for mentor_id in mentor_ids:
                if mentor_id in agent_pool.agents:
                    del agent_pool.agents[mentor_id]
                if mentor_id in agent_pool.agent_configs:
                    del agent_pool.agent_configs[mentor_id]
            del agent_pool.dynamic_mentors[session_id]
        
        logger.info(f"🗑️ 删除用户会话: {user_id}/{session_id}")
        
        return {
            "success": True,
            "message": f"会话 {session_id} 已删除"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 删除用户会话失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除用户会话失败: {str(e)}")
