"""
ASR WebSocket端点
处理实时音频流识别
"""
import asyncio
import json
import logging
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.services.qwen_asr_realtime import QwenASRRealtimeService

logger = logging.getLogger(__name__)

class ASRWebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.asr_services: Dict[str, QwenASRRealtimeService] = {}
        self.recognition_results: Dict[str, str] = {}  # 存储每个会话的识别结果
        self.audio_queues: Dict[str, asyncio.Queue] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.audio_queues[client_id] = asyncio.Queue(maxsize=20)
        self.recognition_results[client_id] = ""  # 初始化识别结果
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
        logger.info(f"🔌 ASR WebSocket连接已断开: client_id={client_id}")

    async def send_message(self, client_id: str, message: Dict[str, Any]):
        if client_id in self.active_connections:
            try:
                message_json = json.dumps(message)
                await self.active_connections[client_id].send_text(message_json)
                logger.info(f"📤 发送消息成功: client_id={client_id}, type={message.get('type')}, content_length={len(message_json)}")
            except Exception as e:
                logger.error(f"❌ 发送消息失败: client_id={client_id}, error={e}")
        else:
            logger.warning(f"⚠️ 客户端连接不存在: client_id={client_id}, message_type={message.get('type')}")

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
                    logger.debug(f"🗑️ 丢弃旧音频数据: client_id={client_id}")
                except asyncio.QueueEmpty:
                    pass
            
            await queue.put(audio_data)
            
            # 限制日志频率
            if chunk % 50 == 0:
                logger.info(f"🎤 处理音频块: client_id={client_id}, chunk={chunk}, size={len(audio_data)} bytes")
            
        except Exception as e:
            logger.error(f"❌ 处理音频块失败: client_id={client_id}, error={e}")

    async def handle_send_request(self, client_id: str):
        """处理发送请求 - 将累积的识别结果发送给大模型"""
        try:
            current_result = self.recognition_results.get(client_id, "")
            if current_result and current_result.strip():
                logger.info(f"📤 收到发送请求: client_id={client_id}, 识别结果='{current_result}'")
                
                # 调用大模型API
                try:
                    from app.agents.customer_agent import customer_agent
                    
                    # 创建会话ID
                    session_id = f"{client_id}_asr"
                    
                    # 调用大模型
                    logger.info(f"🤖 调用大模型: session_id={session_id}, message='{current_result}'")
                    
                    # 这里需要调用customer_agent.chat方法
                    # 由于customer_agent.chat是异步的，我们需要创建一个任务
                    asyncio.create_task(self._call_llm_and_send_response(client_id, session_id, current_result))
                    
                    # 清空识别结果，准备下一轮
                    self.recognition_results[client_id] = ""
                    
                    return {"type": "send_success", "message": current_result}
                    
                except Exception as e:
                    logger.error(f"❌ 调用大模型失败: client_id={client_id}, error={e}")
                    return {"type": "send_error", "message": f"调用大模型失败: {str(e)}"}
            else:
                logger.warn(f"⚠️ 发送请求但无识别结果: client_id={client_id}")
                return {"type": "send_error", "message": "无识别结果"}
                
        except Exception as e:
            logger.error(f"❌ 处理发送请求失败: client_id={client_id}, error={e}")
            return {"type": "send_error", "message": str(e)}

    async def _call_llm_and_send_response(self, client_id: str, session_id: str, message: str):
        """调用大模型并发送响应"""
        try:
            from app.agents.customer_agent import customer_agent
            
            # 调用大模型
            response = await customer_agent.chat(message, user_id="default", session_id=session_id)
            
            logger.info(f"🤖 大模型回复: client_id={client_id}, response='{response}'")
            
            # 发送响应给前端
            await self.send_message(client_id, {
                "type": "llm_response",
                "message": response
            })
            
        except Exception as e:
            logger.error(f"❌ 调用大模型失败: client_id={client_id}, error={e}")
            await self.send_message(client_id, {
                "type": "llm_error",
                "message": f"调用大模型失败: {str(e)}"
            })

    async def handle_asr_result(self, client_id: str, result_type: str, text: str):
        """处理ASR识别结果"""
        try:
            if result_type == "partial":
                # 部分结果，更新当前识别
                self.recognition_results[client_id] = text
                logger.debug(f"📝 更新部分识别结果: client_id={client_id}, text='{text}'")
                
            elif result_type == "final":
                # 最终结果，更新并保持
                self.recognition_results[client_id] = text
                logger.info(f"✅ 更新最终识别结果: client_id={client_id}, text='{text}'")
                
            # 发送结果给前端
            await self.send_message(client_id, {
                "type": result_type,
                "text": text
            })
            
        except Exception as e:
            logger.error(f"❌ 处理ASR结果失败: client_id={client_id}, error={e}")

    async def start_asr_service(self, client_id: str, config: Dict[str, Any] = None):
        """启动ASR服务"""
        try:
            if client_id in self.asr_services:
                logger.warn(f"⚠️ ASR服务已存在: client_id={client_id}")
                return

            # 获取配置
            model = config.get("model", "qwen-turbo") if config else "qwen-turbo"
            language = config.get("language", "zh") if config else "zh"
            
            # 创建ASR服务
            asr_service = QwenASRRealtimeService()
            self.asr_services[client_id] = asr_service
            
            # 启动音频处理
            asyncio.create_task(self._process_audio_stream(client_id))
            
            logger.info(f"🎤 启动ASR服务: client_id={client_id}, model={model}, language={language}")
            
        except Exception as e:
            logger.error(f"❌ 启动ASR服务失败: client_id={client_id}, error={e}")

    async def _process_audio_stream(self, client_id: str):
        """处理音频流"""
        try:
            asr_service = self.asr_services.get(client_id)
            if not asr_service:
                logger.error(f"❌ ASR服务不存在: client_id={client_id}")
                return

            queue = self.audio_queues.get(client_id)
            if not queue:
                logger.error(f"❌ 音频队列不存在: client_id={client_id}")
                return

            # 创建结果队列
            result_queue = asyncio.Queue()

            # 创建音频流生成器
            async def audio_stream():
                while True:
                    try:
                        # 从队列获取音频数据
                        audio_data = await asyncio.wait_for(queue.get(), timeout=1.0)
                        yield audio_data
                    except asyncio.TimeoutError:
                        # 超时，检查是否应该停止
                        continue
                    except Exception as e:
                        logger.error(f"❌ 音频流处理错误: client_id={client_id}, error={e}")
                        break

            # 创建同步回调函数
            def result_callback(text: str, is_final: bool):
                # 首先更新识别结果
                if is_final:
                    self.recognition_results[client_id] = text
                else:
                    self.recognition_results[client_id] = text
                
                logger.info(f"📝 ASR结果: client_id={client_id}, text='{text}', is_final={is_final}")
                
                # 尝试使用call_soon_threadsafe来安全地调度异步任务
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        loop.call_soon_threadsafe(
                            lambda: asyncio.create_task(
                                self.send_message(client_id, {
                                    "type": "final" if is_final else "partial",
                                    "text": text
                                })
                            )
                        )
                        logger.info(f"📤 已调度ASR结果发送: client_id={client_id}, type={'final' if is_final else 'partial'}, text='{text}'")
                    else:
                        logger.warning(f"⚠️ 事件循环未运行: client_id={client_id}, text='{text}'")
                        # 尝试直接发送消息
                        try:
                            if client_id in self.active_connections:
                                # 创建一个新的事件循环来发送消息
                                new_loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(new_loop)
                                try:
                                    new_loop.run_until_complete(
                                        self.send_message(client_id, {
                                            "type": "final" if is_final else "partial",
                                            "text": text
                                        })
                                    )
                                    logger.info(f"📤 通过新事件循环发送ASR结果: client_id={client_id}, text='{text}'")
                                finally:
                                    new_loop.close()
                        except Exception as e:
                            logger.error(f"❌ 通过新事件循环发送失败: client_id={client_id}, error={e}")
                except RuntimeError as e:
                    logger.warning(f"⚠️ 无法发送ASR结果到前端: client_id={client_id}, text='{text}' (RuntimeError: {e})")
                    # 尝试直接发送消息
                    try:
                        if client_id in self.active_connections:
                            # 创建一个新的事件循环来发送消息
                            new_loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(new_loop)
                            try:
                                new_loop.run_until_complete(
                                    self.send_message(client_id, {
                                        "type": "final" if is_final else "partial",
                                        "text": text
                                    })
                                )
                                logger.info(f"📤 通过新事件循环发送ASR结果: client_id={client_id}, text='{text}'")
                            finally:
                                new_loop.close()
                    except Exception as e2:
                        logger.error(f"❌ 通过新事件循环发送失败: client_id={client_id}, error={e2}")
                except Exception as e:
                    logger.error(f"❌ 发送ASR结果到前端失败: client_id={client_id}, error={e}")

            # 启动ASR识别
            async for result in asr_service.recognize_stream(
                audio_stream(),
                on_result=result_callback
            ):
                # 处理识别结果（如果需要的话）
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
                                
                            elif message_type == "audio":
                                # 音频数据（JSON格式）
                                audio_data = message.get("data")
                                chunk = message.get("chunk", 0)
                                if audio_data:
                                    await self.process_audio_chunk(client_id, audio_data, chunk)
                                    
                            elif message_type == "send":
                                # 发送请求 - 新的处理逻辑
                                result = await self.handle_send_request(client_id)
                                await self.send_message(client_id, result)
                                
                            elif message_type == "end":
                                # 结束识别
                                if client_id in self.asr_services:
                                    asr_service = self.asr_services[client_id]
                                    await asr_service.stop()
                                    logger.info(f"🛑 停止ASR识别: client_id={client_id}")
                                    
                        except json.JSONDecodeError:
                            logger.error(f"❌ JSON解析失败: client_id={client_id}")
                        except Exception as e:
                            logger.error(f"❌ 处理消息失败: client_id={client_id}, error={e}")
                    
                    # 处理二进制音频数据
                    binary_data = data.get("bytes")
                    if binary_data:
                        try:
                            # 直接处理二进制音频数据
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