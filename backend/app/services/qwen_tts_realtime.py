"""
Qwen-TTS Realtime API 服务
基于WebSocket实现流式语音合成
"""
import asyncio
import websockets
import json
import base64
import time
import logging
from typing import Optional, Callable, Dict, Any, AsyncGenerator
from enum import Enum
import io
from ..utils.logging_decorator import log_api_call

logger = logging.getLogger(__name__)

class SessionMode(Enum):
    SERVER_COMMIT = "server_commit"
    COMMIT = "commit"

class QwenTTSRealtimeService:
    """
    Qwen-TTS Realtime API 服务类
    支持流式语音合成，边生成边播放
    """
    
    def __init__(self):
        self.base_url = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen-tts-realtime"
        self.api_key = "sk-ff980442223b45868202e5cb35724bb1"
        self.default_voice = "Cherry"
        self.sample_rate = 24000  # Qwen TTS Realtime只支持24kHz
        
    @log_api_call("Qwen TTS Realtime", "qwen")
    async def synthesize_stream(
        self, 
        text: str, 
        voice: str = None
    ) -> AsyncGenerator[bytes, None]:
        """
        流式语音合成
        
        Args:
            text: 要合成的文本
            voice: 语音类型，默认Cherry
            
        Yields:
            bytes: 音频数据片段
        """
        if not voice:
            voice = self.default_voice
            
        logger.info(f"开始Realtime语音合成: text='{text[:50]}...', voice={voice}")
        
        # 音频数据收集器
        audio_chunks = []
        synthesis_complete = False
        synthesis_error = None
        
        # 音频回调函数
        def audio_callback(audio_bytes: bytes):
            nonlocal audio_chunks
            audio_chunks.append(audio_bytes)
            logger.debug(f"收到音频片段: {len(audio_bytes)} bytes")
        
        try:
            # 建立WebSocket连接
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            async with websockets.connect(self.base_url, additional_headers=headers) as ws:
                logger.info("WebSocket连接已建立")
                
                # 创建TTS客户端实例
                client = TTSRealtimeClient(
                    ws=ws,
                    voice=voice,
                    audio_callback=audio_callback
                )
                
                # 设置会话配置
                await client.update_session({
                    "mode": SessionMode.SERVER_COMMIT.value,
                    "voice": voice,
                    "response_format": "pcm",
                    "sample_rate": self.sample_rate
                })
                
                # 发送文本并处理消息
                async def send_text():
                    try:
                        await client.append_text(text)
                        await asyncio.sleep(0.1)  # 短暂延迟
                        await client.finish_session()
                        logger.info("文本发送完成")
                    except Exception as e:
                        logger.error(f"发送文本失败: {e}")
                        nonlocal synthesis_error
                        synthesis_error = e
                
                async def handle_messages():
                    try:
                        await client.handle_messages()
                        nonlocal synthesis_complete
                        synthesis_complete = True
                        logger.info("消息处理完成")
                    except Exception as e:
                        logger.error(f"消息处理失败: {e}")
                        nonlocal synthesis_error
                        synthesis_error = e
                
                # 并行执行发送文本和处理消息
                sender_task = asyncio.create_task(send_text())
                handler_task = asyncio.create_task(handle_messages())
                
                # 实时返回音频片段
                last_chunk_index = 0
                while not synthesis_complete and not synthesis_error:
                    # 检查是否有新的音频片段
                    if len(audio_chunks) > last_chunk_index:
                        for i in range(last_chunk_index, len(audio_chunks)):
                            yield audio_chunks[i]
                        last_chunk_index = len(audio_chunks)
                    
                    await asyncio.sleep(0.05)  # 50ms检查间隔
                
                # 等待任务完成
                await sender_task
                
                # 取消处理任务（避免无限等待）
                if not handler_task.done():
                    handler_task.cancel()
                    try:
                        await handler_task
                    except asyncio.CancelledError:
                        pass
                
                # 返回剩余的音频片段
                if len(audio_chunks) > last_chunk_index:
                    for i in range(last_chunk_index, len(audio_chunks)):
                        yield audio_chunks[i]
                
                if synthesis_error:
                    raise synthesis_error
                    
                logger.info(f"语音合成完成: 共生成 {len(audio_chunks)} 个音频片段")
                
        except Exception as e:
            logger.error(f"Realtime语音合成失败: {e}")
            raise
    
    @log_api_call("Qwen TTS Complete", "qwen")
    async def synthesize_complete(self, text: str, voice: str = None) -> bytes:
        """
        完整语音合成（兼容性方法）
        将所有音频片段合并返回
        """
        audio_data = b""
        async for chunk in self.synthesize_stream(text, voice):
            audio_data += chunk
        return audio_data

class TTSRealtimeClient:
    """
    TTS Realtime WebSocket 客户端
    基于提供的代码修改
    """
    
    def __init__(self, ws, voice: str = "Cherry", audio_callback: Optional[Callable[[bytes], None]] = None):
        self.ws = ws
        self.voice = voice
        self.audio_callback = audio_callback
        
        # 当前回复状态
        self._current_response_id = None
        self._current_item_id = None
        self._is_responding = False
        
    async def send_event(self, event) -> None:
        """发送事件到服务器"""
        event['event_id'] = "event_" + str(int(time.time() * 1000))
        logger.debug(f"发送事件: type={event['type']}, event_id={event['event_id']}")
        await self.ws.send(json.dumps(event))
    
    async def update_session(self, config: Dict[str, Any]) -> None:
        """更新会话配置"""
        event = {
            "type": "session.update",
            "session": config
        }
        logger.info(f"更新会话配置: {config}")
        await self.send_event(event)
    
    async def append_text(self, text: str) -> None:
        """向API发送文本数据"""
        event = {
            "type": "input_text_buffer.append",
            "text": text
        }
        await self.send_event(event)
    
    async def finish_session(self) -> None:
        """结束会话"""
        event = {
            "type": "session.finish"
        }
        await self.send_event(event)
    
    async def handle_messages(self) -> None:
        """处理来自服务器的消息"""
        try:
            async for message in self.ws:
                event = json.loads(message)
                event_type = event.get("type")
                
                if event_type != "response.audio.delta":
                    logger.debug(f"收到事件: {event_type}")
                
                if event_type == "error":
                    error_info = event.get('error', {})
                    logger.error(f"服务器错误: {error_info}")
                    raise Exception(f"TTS服务器错误: {error_info}")
                    
                elif event_type == "session.created":
                    logger.info(f"会话创建，ID: {event.get('session', {}).get('id')}")
                    
                elif event_type == "session.updated":
                    logger.info(f"会话更新，ID: {event.get('session', {}).get('id')}")
                    
                elif event_type == "input_text_buffer.committed":
                    logger.info(f"文本缓冲区已提交，项目ID: {event.get('item_id')}")
                    
                elif event_type == "response.created":
                    self._current_response_id = event.get("response", {}).get("id")
                    self._is_responding = True
                    logger.info(f"响应已创建，ID: {self._current_response_id}")
                    
                elif event_type == "response.output_item.added":
                    self._current_item_id = event.get("item", {}).get("id")
                    logger.info(f"输出项已添加，ID: {self._current_item_id}")
                    
                # 处理音频增量 - 关键部分
                elif event_type == "response.audio.delta" and self.audio_callback:
                    audio_bytes = base64.b64decode(event.get("delta", ""))
                    if audio_bytes:  # 确保不为空
                        self.audio_callback(audio_bytes)
                        
                elif event_type == "response.audio.done":
                    logger.info("音频生成完成")
                    
                elif event_type == "response.done":
                    self._is_responding = False
                    self._current_response_id = None
                    self._current_item_id = None
                    logger.info("响应完成")
                    
                elif event_type == "session.finished":
                    logger.info("会话已结束")
                    break  # 退出消息循环
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket连接已关闭")
        except Exception as e:
            logger.error(f"消息处理出错: {e}")
            raise

# 全局服务实例
qwen_tts_realtime = QwenTTSRealtimeService() 