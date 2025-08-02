"""
ASR WebSocket端点
处理实时音频流识别
"""
import asyncio
import json
import logging
import threading
from typing import Dict, Any, Tuple
from fastapi import WebSocket, WebSocketDisconnect
from app.services.qwen_asr_realtime import QwenASRRealtimeService
import queue

logger = logging.getLogger(__name__)

class ASRWebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.asr_services: Dict[str, QwenASRRealtimeService] = {}
        self.recognition_results: Dict[str, str] = {}
        self.audio_queues: Dict[str, asyncio.Queue] = {}
        # 添加结果队列用于线程间通信
        self.result_queues: Dict[str, queue.Queue] = {}
        self.result_processors: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.audio_queues[client_id] = asyncio.Queue(maxsize=20)
        self.result_queues[client_id] = queue.Queue()
        self.recognition_results[client_id] = ""
        logger.info(f"🔌 ASR WebSocket连接已建立: client_id={client_id}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.asr_services:
            del self.asr_services[client_id]
        if client_id in self.audio_queues:
            del self.audio_queues[client_id]
        if client_id in self.recognition_results:
            del self.recognition_results[client_id]
        if client_id in self.result_queues:
            del self.result_queues[client_id]
        if client_id in self.result_processors:
            self.result_processors[client_id].cancel()
            del self.result_processors[client_id]
        logger.info(f"🔌 ASR WebSocket连接已断开: client_id={client_id}")

    async def send_message(self, client_id: str, message: Dict[str, Any]):
        if client_id in self.active_connections:
            try:
                message_json = json.dumps(message)
                await self.active_connections[client_id].send_text(message_json)
                logger.info(f"📤 发送消息成功: client_id={client_id}, type={message.get('type')}")
            except Exception as e:
                logger.error(f"❌ 发送消息失败: client_id={client_id}, error={e}")
        else:
            logger.warning(f"⚠️ 客户端连接不存在: client_id={client_id}")

    async def process_audio_chunk(self, client_id: str, audio_data: bytes, chunk: int):
        """处理音频块"""
        try:
            if client_id not in self.audio_queues:
                logger.warn(f"⚠️ 客户端不存在: client_id={client_id}")
                return

            queue = self.audio_queues[client_id]
            
            # 如果队列满了，丢弃最旧的数据
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            
            await queue.put(audio_data)
            
            # 限制日志频率
            if chunk % 50 == 0:
                logger.info(f"🎤 处理音频块: client_id={client_id}, chunk={chunk}")
            
        except Exception as e:
            logger.error(f"❌ 处理音频块失败: client_id={client_id}, error={e}")

    async def start_asr_service(self, client_id: str, config: Dict[str, Any] = None):
        """启动ASR服务"""
        try:
            if client_id in self.asr_services:
                logger.warn(f"⚠️ ASR服务已存在: client_id={client_id}")
                return

            # 获取配置
            model = config.get("model", "paraformer-realtime-v2") if config else "paraformer-realtime-v2"
            language = config.get("language", "zh") if config else "zh"
            
            # 创建ASR服务
            asr_service = QwenASRRealtimeService()
            self.asr_services[client_id] = asr_service
            
            # 启动音频处理
            asyncio.create_task(self._process_audio_stream(client_id))
            
            # 启动结果处理器
            self.result_processors[client_id] = asyncio.create_task(self._process_results(client_id))
            
            logger.info(f"🎤 启动ASR服务: client_id={client_id}, model={model}, language={language}")
            
        except Exception as e:
            logger.error(f"❌ 启动ASR服务失败: client_id={client_id}, error={e}")

    async def _process_results(self, client_id: str):
        """处理ASR结果队列"""
        try:
            result_queue = self.result_queues[client_id]
            while client_id in self.result_queues:
                try:
                    # 从队列中获取结果（非阻塞）
                    result = result_queue.get_nowait()
                    text, is_final = result
                    
                    # 更新识别结果
                    self.recognition_results[client_id] = text
                    logger.info(f"📝 ASR结果: client_id={client_id}, text='{text}', is_final={is_final}")
                    
                    # 发送结果给前端
                    await self.send_message(client_id, {
                        "type": "final" if is_final else "partial",
                        "text": text
                    })
                    
                except queue.Empty:
                    # 队列为空，等待一小段时间
                    await asyncio.sleep(0.1)
                except Exception as e:
                    logger.error(f"❌ 处理ASR结果失败: client_id={client_id}, error={e}")
                    await asyncio.sleep(0.1)
                    
        except asyncio.CancelledError:
            logger.info(f"🛑 结果处理器已取消: client_id={client_id}")
        except Exception as e:
            logger.error(f"❌ 结果处理器错误: client_id={client_id}, error={e}")

    async def _process_audio_stream(self, client_id: str):
        """处理音频流"""
        try:
            asr_service = self.asr_services[client_id]
            audio_queue = self.audio_queues[client_id]
            result_queue = self.result_queues[client_id]

            async def audio_stream():
                while client_id in self.audio_queues:
                    try:
                        # 从队列中获取音频数据
                        audio_data = await asyncio.wait_for(audio_queue.get(), timeout=1.0)
                        yield audio_data
                    except asyncio.TimeoutError:
                        # 超时，继续循环
                        continue
                    except Exception as e:
                        logger.error(f"❌ 音频流处理错误: client_id={client_id}, error={e}")
                        break

            def result_callback(text: str, is_final: bool):
                # 将结果放入队列，供异步处理器处理
                try:
                    result_queue.put_nowait((text, is_final))
                except queue.Full:
                    logger.warning(f"⚠️ 结果队列已满: client_id={client_id}")
                except Exception as e:
                    logger.error(f"❌ 添加结果到队列失败: client_id={client_id}, error={e}")

            # 启动ASR识别
            async for result in asr_service.recognize_stream(
                audio_stream(),
                on_result=result_callback
            ):
                pass
            
        except Exception as e:
            logger.error(f"❌ 处理音频流失败: client_id={client_id}, error={e}")

    async def handle_websocket(self, websocket: WebSocket, client_id: str):
        """处理WebSocket连接"""
        await self.connect(websocket, client_id)
        
        try:
            while True:
                # 接收消息
                data = await websocket.receive()
                
                if data["type"] == "websocket.disconnect":
                    break
                
                if data["type"] == "websocket.receive":
                    # 处理文本消息（JSON格式）
                    message_data = data.get("text", "")
                    if message_data:
                        try:
                            message = json.loads(message_data)
                            message_type = message.get("type")
                            
                            if message_type == "start":
                                # 开始识别
                                config = message.get("config", {})
                                await self.start_asr_service(client_id, config)
                                
                            elif message_type == "end":
                                # 结束识别
                                if client_id in self.asr_services:
                                    del self.asr_services[client_id]
                                    logger.info(f"🛑 停止ASR识别: client_id={client_id}")
                                    
                        except json.JSONDecodeError:
                            logger.error(f"❌ JSON解析失败: client_id={client_id}")
                        except Exception as e:
                            logger.error(f"❌ 处理消息失败: client_id={client_id}, error={e}")
                    
                    # 处理二进制音频数据
                    binary_data = data.get("bytes")
                    if binary_data:
                        try:
                            chunk_count = getattr(self, '_chunk_count', {}).get(client_id, 0) + 1
                            if not hasattr(self, '_chunk_count'):
                                self._chunk_count = {}
                            self._chunk_count[client_id] = chunk_count
                            
                            await self.process_audio_chunk(client_id, binary_data, chunk_count)
                            
                        except Exception as e:
                            logger.error(f"❌ 处理二进制音频数据失败: client_id={client_id}, error={e}")
                            
        except WebSocketDisconnect:
            logger.info(f"🔌 WebSocket断开连接: client_id={client_id}")
        except Exception as e:
            logger.error(f"❌ WebSocket处理失败: client_id={client_id}, error={e}")
        finally:
            self.disconnect(client_id)

# 全局管理器实例
asr_manager = ASRWebSocketManager()

# 创建路由
from fastapi import APIRouter
router = APIRouter(prefix="/asr", tags=["asr"])

@router.websocket("/ws/{client_id}")
async def asr_websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    ASR WebSocket端点
    处理实时音频流识别
    """
    logger.info(f"🎤 新的ASR连接: client_id={client_id}")
    await asr_manager.handle_websocket(websocket, client_id) 