"""
多用户系统测试接口
提供专门的API端点用于测试多用户功能
"""
import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from ..core.multi_user_manager import multi_user_manager
from ..agents.agent_manager import agent_manager
from ..api.realtime_chat import RealtimeChatManager

logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/test", tags=["test"])

# 获取全局连接管理器实例
connection_manager = RealtimeChatManager()

class TestResponse(BaseModel):
    """测试响应模型"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: str

class UserConnectionTest(BaseModel):
    """用户连接测试模型"""
    user_id: str
    session_id: str
    test_data: Dict[str, Any]

@router.get("/system-status", response_model=TestResponse)
async def get_detailed_system_status():
    """
    获取详细的系统状态用于测试
    
    Returns:
        详细的系统状态信息
    """
    try:
        # 多用户管理器状态
        multi_user_status = {
            "active_users": list(multi_user_manager.active_users),
            "total_connections": len(multi_user_manager.connections),
            "connection_details": {},
            "user_sessions": {},
            "user_agent_pools": {}
        }
        
        # 连接详情
        for conn_id, ws in multi_user_manager.connections.items():
            user_info = multi_user_manager.connection_users.get(conn_id, {})
            multi_user_status["connection_details"][conn_id] = {
                "user_id": user_info.get("user_id", "unknown"),
                "session_id": user_info.get("session_id", "unknown"),
                "websocket_state": str(ws.client_state) if hasattr(ws, 'client_state') else "unknown",
                "connected_at": user_info.get("connected_at", "unknown")
            }
        
        # 用户会话详情
        for user_id, sessions in multi_user_manager.user_sessions.items():
            if isinstance(sessions, dict):
                multi_user_status["user_sessions"][user_id] = {
                    "session_count": len(sessions),
                    "sessions": {}
                }
                for session_id, session in sessions.items():
                    if hasattr(session, 'topic'):
                        multi_user_status["user_sessions"][user_id]["sessions"][session_id] = {
                            "topic": getattr(session, 'topic', ''),
                            "is_active": getattr(session, 'is_active', False),
                            "message_count": len(getattr(session, 'messages', [])),
                            "created_at": getattr(session, 'created_at', ''),
                            "last_active_at": getattr(session, 'last_active_at', ''),
                            "selected_mentors": getattr(session, 'selected_mentors', []),
                            "dynamic_mentors": getattr(session, 'dynamic_mentors', [])
                        }
            else:
                multi_user_status["user_sessions"][user_id] = {
                    "session_count": 0,
                    "sessions": {},
                    "error": f"Invalid sessions type: {type(sessions)}"
                }
        
        # 用户智能体池详情
        for user_id, agent_pool in multi_user_manager.user_agent_pools.items():
            if agent_pool and hasattr(agent_pool, 'agents'):
                multi_user_status["user_agent_pools"][user_id] = {
                    "agent_count": len(getattr(agent_pool, 'agents', {})),
                    "agent_list": list(getattr(agent_pool, 'agents', {}).keys()),
                    "dynamic_mentors_sessions": list(getattr(agent_pool, 'dynamic_mentors', {}).keys()),
                    "agent_configs": {
                        agent_id: {
                            "name": config.get("name", "unknown") if isinstance(config, dict) else str(config),
                            "is_dynamic": config.get("is_dynamic", False) if isinstance(config, dict) else False,
                            "enabled": config.get("enabled", True) if isinstance(config, dict) else True,
                            "session_id": config.get("session_id", "") if isinstance(config, dict) else "",
                            "registered_at": config.get("registered_at", "") if isinstance(config, dict) else ""
                        }
                        for agent_id, config in getattr(agent_pool, 'agent_configs', {}).items()
                    }
                }
            else:
                multi_user_status["user_agent_pools"][user_id] = {
                    "agent_count": 0,
                    "agent_list": [],
                    "dynamic_mentors_sessions": [],
                    "agent_configs": {},
                    "error": f"Invalid agent_pool: {type(agent_pool)}"
                }
        
        # 全局agent_manager状态
        global_agent_status = {
            "total_agents": len(agent_manager.agents),
            "agent_list": list(agent_manager.agents.keys()),
            "conversation_sessions": len(agent_manager.conversation_sessions),
            "dynamic_mentors": len(agent_manager.dynamic_mentors),
            "agent_configs": {
                agent_id: {
                    "name": config.get("name", "unknown") if isinstance(config, dict) else str(config),
                    "is_dynamic": config.get("is_dynamic", False) if isinstance(config, dict) else False,
                    "enabled": config.get("enabled", True) if isinstance(config, dict) else True
                }
                for agent_id, config in agent_manager.agent_configs.items()
                if config is not None
            }
        }
        
        # ConnectionManager状态
        connection_manager_status = {
            "active_connections": len(connection_manager.active_connections),
            "user_sessions": len(connection_manager.user_sessions),
            "connection_list": list(connection_manager.active_connections.keys()),
            "session_details": {
                client_id: {
                    "voice": session.get("voice", "unknown") if isinstance(session, dict) else "unknown",
                    "is_speaking": session.get("is_speaking", False) if isinstance(session, dict) else False,
                    "session_id": session.get("session_id", "unknown") if isinstance(session, dict) else str(session),
                    "selected_mentors": session.get("selected_mentors", []) if isinstance(session, dict) else [],
                    "dynamic_mentors": session.get("dynamic_mentors", []) if isinstance(session, dict) else []
                }
                for client_id, session in connection_manager.user_sessions.items()
                if session is not None
            }
        }
        
        return TestResponse(
            success=True,
            message="系统状态获取成功",
            data={
                "multi_user_manager": multi_user_status,
                "global_agent_manager": global_agent_status,
                "connection_manager": connection_manager_status,
                "summary": {
                    "total_active_users": len(multi_user_manager.active_users),
                    "total_connections": len(multi_user_manager.connections),
                    "total_user_sessions": sum(len(sessions) for sessions in multi_user_manager.user_sessions.values()),
                    "total_user_agents": sum(len(pool.agents) for pool in multi_user_manager.user_agent_pools.values()),
                    "global_agents": len(agent_manager.agents),
                    "connection_manager_connections": len(connection_manager.active_connections)
                }
            },
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"❌ 获取系统状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取系统状态失败: {str(e)}")

@router.post("/user-isolation", response_model=TestResponse)
async def test_user_isolation(test_data: UserConnectionTest):
    """
    测试用户隔离功能
    
    Args:
        test_data: 测试数据
        
    Returns:
        用户隔离测试结果
    """
    try:
        user_id = test_data.user_id
        session_id = test_data.session_id
        
        # 获取或创建用户会话
        user_session = multi_user_manager.get_user_session(user_id, session_id)
        if not user_session:
            user_session = multi_user_manager.create_user_session(user_id, session_id)
        
        # 测试数据写入
        user_session.messages.append({
            "type": "test",
            "content": "用户隔离测试消息",
            "test_data": test_data.test_data,
            "timestamp": datetime.now().isoformat()
        })
        
        # 获取用户智能体池
        agent_pool = multi_user_manager.get_user_agent_pool(user_id)
        
        # 检查隔离性
        other_users_data = {}
        for other_user_id in multi_user_manager.active_users:
            if other_user_id != user_id:
                other_sessions = multi_user_manager.user_sessions.get(other_user_id, {})
                other_users_data[other_user_id] = {
                    "session_count": len(other_sessions),
                    "has_test_data": any(
                        any(msg.get("type") == "test" for msg in session.messages)
                        for session in other_sessions.values()
                    )
                }
        
        return TestResponse(
            success=True,
            message="用户隔离测试完成",
            data={
                "target_user": user_id,
                "target_session": session_id,
                "user_session_messages": len(user_session.messages),
                "user_agent_pool_exists": agent_pool is not None,
                "user_agent_count": len(agent_pool.agents) if agent_pool else 0,
                "other_users": other_users_data,
                "isolation_verified": all(
                    not data["has_test_data"] 
                    for data in other_users_data.values()
                ),
                "test_data_stored": test_data.test_data
            },
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"❌ 用户隔离测试失败: {e}")
        raise HTTPException(status_code=500, detail=f"用户隔离测试失败: {str(e)}")

@router.post("/session-conflict", response_model=TestResponse)
async def test_session_conflict(users_data: List[UserConnectionTest]):
    """
    测试多用户会话冲突
    
    Args:
        users_data: 多个用户的测试数据
        
    Returns:
        会话冲突测试结果
    """
    try:
        results = {}
        
        for user_test in users_data:
            user_id = user_test.user_id
            session_id = user_test.session_id
            
            # 创建或获取用户会话
            user_session = multi_user_manager.get_user_session(user_id, session_id)
            if not user_session:
                user_session = multi_user_manager.create_user_session(user_id, session_id)
                user_session.topic = f"测试话题_{user_id}"
            
            # 添加测试消息
            test_message = {
                "type": "test_conflict",
                "user_id": user_id,
                "session_id": session_id,
                "content": f"用户{user_id}的测试消息",
                "test_data": user_test.test_data,
                "timestamp": datetime.now().isoformat()
            }
            user_session.messages.append(test_message)
            
            # 记录结果
            results[user_id] = {
                "session_id": session_id,
                "topic": user_session.topic,
                "message_count": len(user_session.messages),
                "is_active": user_session.is_active,
                "last_message": test_message
            }
        
        # 检查冲突
        conflict_analysis = {
            "total_users_tested": len(users_data),
            "sessions_created": len(results),
            "topics_unique": len(set(r["topic"] for r in results.values())),
            "all_sessions_separate": len(results) == len(set(r["session_id"] for r in results.values())),
            "cross_contamination": False
        }
        
        # 检查交叉污染
        for user_id, result in results.items():
            user_sessions = multi_user_manager.user_sessions.get(user_id, {})
            for session_id, session in user_sessions.items():
                for message in session.messages:
                    if message.get("type") == "test_conflict" and message.get("user_id") != user_id:
                        conflict_analysis["cross_contamination"] = True
                        break
        
        return TestResponse(
            success=True,
            message="会话冲突测试完成",
            data={
                "user_results": results,
                "conflict_analysis": conflict_analysis,
                "isolation_successful": not conflict_analysis["cross_contamination"]
            },
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"❌ 会话冲突测试失败: {e}")
        raise HTTPException(status_code=500, detail=f"会话冲突测试失败: {str(e)}")

@router.delete("/cleanup-test-data")
async def cleanup_test_data():
    """
    清理测试数据
    
    Returns:
        清理结果
    """
    try:
        cleanup_stats = {
            "users_cleaned": 0,
            "sessions_cleaned": 0,
            "agents_cleaned": 0,
            "connections_closed": 0
        }
        
        # 清理用户会话中的测试数据
        for user_id, sessions in multi_user_manager.user_sessions.items():
            for session_id, session in sessions.items():
                # 清理测试消息
                original_count = len(session.messages)
                session.messages = [
                    msg for msg in session.messages 
                    if not msg.get("type", "").startswith("test")
                ]
                if len(session.messages) < original_count:
                    cleanup_stats["sessions_cleaned"] += 1
        
        # 清理测试用户（如果用户ID包含test字样）
        test_user_ids = [
            user_id for user_id in multi_user_manager.active_users 
            if "test" in user_id.lower()
        ]
        
        for user_id in test_user_ids:
            multi_user_manager.cleanup_user_session(user_id)
            cleanup_stats["users_cleaned"] += 1
        
        # 清理测试连接
        test_connections = [
            conn_id for conn_id in multi_user_manager.connections.keys()
            if "test" in conn_id.lower()
        ]
        
        for conn_id in test_connections:
            multi_user_manager.unregister_connection(conn_id)
            cleanup_stats["connections_closed"] += 1
        
        return TestResponse(
            success=True,
            message="测试数据清理完成",
            data=cleanup_stats,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"❌ 清理测试数据失败: {e}")
        raise HTTPException(status_code=500, detail=f"清理测试数据失败: {str(e)}")

@router.websocket("/ws/{user_id}")
async def test_websocket_connection(websocket: WebSocket, user_id: str):
    """
    测试WebSocket连接隔离
    
    Args:
        websocket: WebSocket连接
        user_id: 用户ID
    """
    session_id = f"test_session_{user_id}_{datetime.now().timestamp()}"
    connection_id = f"{user_id}_{session_id}"
    
    try:
        # 注册连接
        multi_user_manager.register_connection(connection_id, user_id, websocket)
        await websocket.accept()
        
        logger.info(f"🔌 测试WebSocket连接建立: {connection_id}")
        
        # 发送连接确认
        await websocket.send_json({
            "type": "connection_established",
            "user_id": user_id,
            "session_id": session_id,
            "connection_id": connection_id,
            "timestamp": datetime.now().isoformat()
        })
        
        # 处理消息
        while True:
            try:
                data = await websocket.receive_json()
                message_type = data.get("type", "unknown")
                
                if message_type == "ping":
                    # 响应ping
                    await websocket.send_json({
                        "type": "pong",
                        "user_id": user_id,
                        "timestamp": datetime.now().isoformat()
                    })
                
                elif message_type == "test_isolation":
                    # 测试隔离性
                    active_connections = len(multi_user_manager.connections)
                    user_connections = [
                        conn_id for conn_id in multi_user_manager.connections.keys()
                        if user_id in conn_id
                    ]
                    
                    await websocket.send_json({
                        "type": "isolation_status",
                        "user_id": user_id,
                        "total_connections": active_connections,
                        "user_connections": user_connections,
                        "user_connection_count": len(user_connections),
                        "timestamp": datetime.now().isoformat()
                    })
                
                elif message_type == "broadcast_test":
                    # 测试广播（仅发送给同一用户的其他连接）
                    message_content = data.get("message", "测试广播消息")
                    
                    for conn_id, ws in multi_user_manager.connections.items():
                        if user_id in conn_id and conn_id != connection_id:
                            try:
                                await ws.send_json({
                                    "type": "broadcast_received",
                                    "from_connection": connection_id,
                                    "message": message_content,
                                    "timestamp": datetime.now().isoformat()
                                })
                            except Exception as e:
                                logger.warning(f"⚠️ 发送广播失败: {conn_id}, {e}")
                
                else:
                    # 回显其他消息
                    await websocket.send_json({
                        "type": "echo",
                        "original_message": data,
                        "user_id": user_id,
                        "timestamp": datetime.now().isoformat()
                    })
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"❌ WebSocket消息处理错误: {e}")
                break
    
    except Exception as e:
        logger.error(f"❌ WebSocket连接错误: {e}")
    
    finally:
        # 清理连接
        multi_user_manager.unregister_connection(connection_id)
        logger.info(f"🔌 测试WebSocket连接关闭: {connection_id}")

@router.get("/connection-info/{connection_id}")
async def get_connection_info(connection_id: str):
    """
    获取连接信息
    
    Args:
        connection_id: 连接ID
        
    Returns:
        连接详情
    """
    try:
        user_info = multi_user_manager.connection_users.get(connection_id)
        websocket = multi_user_manager.connections.get(connection_id)
        
        if not user_info:
            raise HTTPException(status_code=404, detail="连接不存在")
        
        return TestResponse(
            success=True,
            message="连接信息获取成功",
            data={
                "connection_id": connection_id,
                "user_id": user_info.get("user_id"),
                "session_id": user_info.get("session_id"),
                "connected_at": user_info.get("connected_at"),
                "websocket_exists": websocket is not None,
                "websocket_state": str(websocket.client_state) if websocket and hasattr(websocket, 'client_state') else "unknown"
            },
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 获取连接信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取连接信息失败: {str(e)}")
