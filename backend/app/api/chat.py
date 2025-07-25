"""
聊天API路由
"""
import json
import uuid
import logging
from typing import Dict, Any, List
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..agents.customer_agent import customer_agent
from ..core.config import settings

# 设置日志
logger = logging.getLogger(__name__)


# 请求/响应模型
class ChatRequest(BaseModel):
    message: str
    user_id: str = "default"
    session_id: str = "default"


class ChatResponse(BaseModel):
    response: str
    retrieved_docs: List[Dict[str, Any]] = []
    turn_count: int = 0
    context: Dict[str, Any] = {}
    timestamp: str = ""


class HistoryResponse(BaseModel):
    history: List[Dict[str, Any]]
    total_turns: int


# 创建路由
router = APIRouter(prefix="/chat", tags=["chat"])


# WebSocket连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        print(f"客户端 {client_id} 已连接")
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            print(f"客户端 {client_id} 已断开连接")
    
    async def send_message(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                print(f"发送消息失败: {e}")
                self.disconnect(client_id)


manager = ConnectionManager()


@router.post("/send", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    发送聊天消息 (REST API)
    """
    try:
        # 调用Agent处理消息
        result = await customer_agent.chat(
            message=request.message,
            user_id=request.user_id,
            session_id=request.session_id
        )
        
        # 构建响应
        response = ChatResponse(
            response=result["response"],
            retrieved_docs=result.get("retrieved_docs", []),
            turn_count=result.get("turn_count", 0),
            context=result.get("context", {}),
            timestamp=datetime.now().isoformat()
        )
        
        return response
        
    except Exception as e:
        print(f"处理聊天消息失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket聊天端点
    """
    logger.info(f"🔌 新的WebSocket连接: client_id={client_id}")
    await manager.connect(websocket, client_id)
    
    try:
        # 发送欢迎消息
        welcome_message = {
            "type": "welcome",
            "message": "欢迎使用智能交易客服！我是您的专属助手，有什么问题请随时询问我。",
            "timestamp": datetime.now().isoformat()
        }
        await manager.send_message(client_id, welcome_message)
        logger.info(f"👋 已发送欢迎消息: client_id={client_id}")
        
        while True:
            # 接收客户端消息
            logger.info(f"📡 等待接收消息: client_id={client_id}")
            data = await websocket.receive_text()
            logger.info(f"📨 收到原始消息: client_id={client_id}, data='{data}'")
            
            try:
                message_data = json.loads(data)
                logger.info(f"📋 解析消息成功: client_id={client_id}, keys={list(message_data.keys())}")
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON解析失败: client_id={client_id}, error={str(e)}")
                error_response = {
                    "type": "error", 
                    "message": "消息格式错误：无效的JSON",
                    "timestamp": datetime.now().isoformat()
                }
                await manager.send_message(client_id, error_response)
                continue
            
            # 验证消息格式
            if "message" not in message_data:
                logger.warning(f"⚠️ 消息格式错误: client_id={client_id}, 缺少message字段")
                error_response = {
                    "type": "error",
                    "message": "消息格式错误：缺少message字段",
                    "timestamp": datetime.now().isoformat()
                }
                await manager.send_message(client_id, error_response)
                continue
            
            # 提取参数
            user_message = message_data["message"]
            user_id = message_data.get("user_id", client_id)
            session_id = message_data.get("session_id", "default")
            
            logger.info(f"🗣️ 处理用户消息: client_id={client_id}, user_id={user_id}, session_id={session_id}, message='{user_message}'")
            
            # 发送处理中状态
            processing_message = {
                "type": "processing",
                "message": "正在思考中...",
                "timestamp": datetime.now().isoformat()
            }
            await manager.send_message(client_id, processing_message)
            logger.info(f"⏳ 已发送处理中状态: client_id={client_id}")
            
            try:
                # 调用Agent处理消息
                logger.info(f"🤖 开始调用Agent: client_id={client_id}")
                result = await customer_agent.chat(
                    message=user_message,
                    user_id=user_id,
                    session_id=session_id
                )
                logger.info(f"✅ Agent处理完成: client_id={client_id}, response_length={len(result['response'])}")
                
                # 发送回复
                response_message = {
                    "type": "response",
                    "message": result["response"],
                    "retrieved_docs": result.get("retrieved_docs", []),
                    "turn_count": result.get("turn_count", 0),
                    "context": result.get("context", {}),
                    "timestamp": datetime.now().isoformat()
                }
                await manager.send_message(client_id, response_message)
                logger.info(f"📤 已发送回复: client_id={client_id}, turn_count={result.get('turn_count', 0)}")
                
            except Exception as e:
                logger.error(f"❌ 处理WebSocket消息失败: client_id={client_id}, error={type(e).__name__}: {str(e)}", exc_info=True)
                error_response = {
                    "type": "error",
                    "message": "抱歉，系统遇到了问题，请稍后再试。",
                    "timestamp": datetime.now().isoformat()
                }
                await manager.send_message(client_id, error_response)
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"🔌 WebSocket正常断开: client_id={client_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket意外错误: client_id={client_id}, error={type(e).__name__}: {str(e)}", exc_info=True)
        manager.disconnect(client_id)


@router.get("/history/{user_id}/{session_id}", response_model=HistoryResponse)
async def get_conversation_history(user_id: str, session_id: str):
    """
    获取对话历史
    """
    try:
        history = await customer_agent.get_conversation_history(user_id, session_id)
        
        return HistoryResponse(
            history=history,
            total_turns=len([msg for msg in history if msg.get("type") == "human"])
        )
        
    except Exception as e:
        print(f"获取对话历史失败: {e}")
        raise HTTPException(status_code=500, detail="获取对话历史失败")


@router.delete("/history/{user_id}/{session_id}")
async def clear_conversation_history(user_id: str, session_id: str):
    """
    清除对话历史
    """
    try:
        success = await customer_agent.clear_conversation(user_id, session_id)
        
        if success:
            return {"message": "对话历史已清除"}
        else:
            raise HTTPException(status_code=500, detail="清除对话历史失败")
            
    except Exception as e:
        print(f"清除对话历史失败: {e}")
        raise HTTPException(status_code=500, detail="清除对话历史失败")


@router.get("/health")
async def health_check():
    """
    健康检查
    """
    try:
        health_status = await customer_agent.health_check()
        return health_status
        
    except Exception as e:
        print(f"健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@router.get("/stats")
async def get_system_stats():
    """
    获取系统统计信息
    """
    try:
        # 获取活跃连接数
        active_connections = len(manager.active_connections)
        
        # 获取健康状态
        health_status = await customer_agent.health_check()
        
        return {
            "active_websocket_connections": active_connections,
            "system_health": health_status,
            "app_version": settings.app_version,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"获取系统统计失败: {e}")
        raise HTTPException(status_code=500, detail="获取系统统计失败") 