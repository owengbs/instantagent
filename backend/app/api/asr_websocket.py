"""
ASR WebSocket端点
处理实时音频流识别
"""
import json
import logging
import asyncio
from typing import Dict, Any
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services.qwen_asr_realtime import qwen_asr_realtime

logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/asr", tags=["asr"])

class ASRWebSocketManager:
    """ASR WebSocket管理器"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """建立连接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.user_sessions[client_id] = {
            "model": "paraformer-realtime-v2",
            "language": "zh-CN",
            "is_recognizing": False
        }
        logger.info(f"🔌 ASR客户端连接: {client_id}")
    
    def disconnect(self, client_id: str):
        """断开连接"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.user_sessions:
            del self.user_sessions[client_id]
        logger.info(f"🔌 ASR客户端断开: {client_id}")
    
    async def send_message(self, client_id: str, message: dict):
        """发送消息到客户端"""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.error(f"发送ASR消息失败: {e}")
                self.disconnect(client_id)
    
    async def process_audio_stream(self, client_id: str, audio_data: bytes):
        """处理音频流"""
        try:
            session = self.user_sessions.get(client_id, {})
            model = session.get("model", "paraformer-realtime-v2")
            
            # 创建音频流生成器
            async def audio_stream():
                # 将音频数据分块发送
                chunk_size = 3200  # 200ms @ 16kHz
                for i in range(0, len(audio_data), chunk_size):
                    yield audio_data[i:i + chunk_size]
                    await asyncio.sleep(0.01)  # 10ms间隔
            
            # 处理识别结果
            async def handle_recognition_result(text: str, is_final: bool):
                await self.send_message(client_id, {
                    "type": "sentence" if is_final else "partial",
                    "text": text,
                    "is_final": is_final,
                    "timestamp": datetime.now().isoformat()
                })
            
            # 调用ASR服务
            async for result in qwen_asr_realtime.recognize_stream(
                audio_stream(), 
                model,
                on_result=handle_recognition_result
            ):
                # 这里result是识别出的文本
                pass
                
        except Exception as e:
            logger.error(f"❌ 处理音频流失败: client_id={client_id}, error={e}")
            await self.send_message(client_id, {
                "type": "error",
                "message": f"音频处理失败: {str(e)}",
                "timestamp": datetime.now().isoformat()
            })

# 管理器实例
asr_manager = ASRWebSocketManager()

@router.websocket("/ws/{client_id}")
async def asr_websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    ASR WebSocket端点
    处理实时音频流识别
    """
    logger.info(f"🎤 新的ASR连接: client_id={client_id}")
    await asr_manager.connect(websocket, client_id)
    
    try:
        # 发送欢迎消息
        await asr_manager.send_message(client_id, {
            "type": "welcome",
            "message": "ASR服务已连接，支持实时语音识别",
            "supported_models": ["paraformer-realtime-v2", "gummy-realtime-v2"],
            "timestamp": datetime.now().isoformat()
        })
        
        while True:
            # 接收客户端消息
            data = await websocket.receive()
            
            if data["type"] == "websocket.receive":
                message_data = data.get("text")
                if message_data:
                    try:
                        message = json.loads(message_data)
                        await handle_asr_message(client_id, message)
                    except json.JSONDecodeError:
                        logger.error("❌ JSON解析失败")
                        await asr_manager.send_message(client_id, {
                            "type": "error",
                            "message": "消息格式错误"
                        })
                
                # 处理二进制音频数据
                binary_data = data.get("bytes")
                if binary_data:
                    await asr_manager.process_audio_stream(client_id, binary_data)
    
    except WebSocketDisconnect:
        asr_manager.disconnect(client_id)
        logger.info(f"🔌 ASR正常断开: client_id={client_id}")
    except Exception as e:
        logger.error(f"❌ ASR意外错误: client_id={client_id}, error={e}")
        asr_manager.disconnect(client_id)

async def handle_asr_message(client_id: str, message: dict):
    """处理ASR消息"""
    message_type = message.get("type")
    
    if message_type == "start":
        # 开始识别
        model = message.get("model", "paraformer-realtime-v2")
        language = message.get("language", "zh-CN")
        
        if client_id in asr_manager.user_sessions:
            asr_manager.user_sessions[client_id].update({
                "model": model,
                "language": language,
                "is_recognizing": True
            })
        
        logger.info(f"🎤 开始ASR识别: client_id={client_id}, model={model}")
        await asr_manager.send_message(client_id, {
            "type": "start",
            "model": model,
            "language": language,
            "timestamp": datetime.now().isoformat()
        })
    
    elif message_type == "end":
        # 结束识别
        if client_id in asr_manager.user_sessions:
            asr_manager.user_sessions[client_id]["is_recognizing"] = False
        
        logger.info(f"🛑 结束ASR识别: client_id={client_id}")
        await asr_manager.send_message(client_id, {
            "type": "end",
            "timestamp": datetime.now().isoformat()
        })
    
    elif message_type == "ping":
        # 心跳检测
        await asr_manager.send_message(client_id, {
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        })
    
    else:
        logger.warning(f"⚠️ 未知ASR消息类型: {message_type}")
        await asr_manager.send_message(client_id, {
            "type": "error",
            "message": f"未知消息类型: {message_type}"
        }) 