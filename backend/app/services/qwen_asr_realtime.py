"""
Qwen实时语音识别服务
基于阿里云百炼的实时语音识别API
"""
import asyncio
import logging
import json
import websockets
from typing import Optional, Callable, Dict, Any, AsyncGenerator
from datetime import datetime

logger = logging.getLogger(__name__)

class QwenASRRealtimeService:
    """
    Qwen实时语音识别服务
    支持流式语音识别，边说话边识别
    """
    
    def __init__(self):
        self.api_key = "sk-ff980442223b45868202e5cb35724bb1"
        self.base_url = "wss://dashscope.aliyuncs.com/api-ws/v1/asr"
        self.default_model = "paraformer-realtime-v2"
        self.sample_rate = 16000
        self.channels = 1
        self.format = "pcm"
        
    async def recognize_stream(
        self, 
        audio_stream: AsyncGenerator[bytes, None],
        model: str = None,
        on_result: Optional[Callable[[str, bool], None]] = None
    ) -> AsyncGenerator[str, None]:
        """
        流式语音识别
        
        Args:
            audio_stream: 音频流生成器
            model: 识别模型，默认paraformer-realtime-v2
            on_result: 结果回调函数 (text, is_final)
            
        Yields:
            str: 识别出的文本片段
        """
        if not model:
            model = self.default_model
            
        logger.info(f"🎤 开始实时语音识别: model={model}")
        
        try:
            # 建立WebSocket连接
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # 构建WebSocket URL
            ws_url = f"{self.base_url}?model={model}&format={self.format}&sample_rate={self.sample_rate}"
            
            async with websockets.connect(ws_url, additional_headers=headers) as ws:
                logger.info("🔌 ASR WebSocket连接已建立")
                
                # 发送识别开始事件
                await ws.send(json.dumps({
                    "type": "start",
                    "format": self.format,
                    "sample_rate": self.sample_rate,
                    "channels": self.channels
                }))
                
                # 创建音频发送任务
                async def send_audio():
                    try:
                        async for audio_chunk in audio_stream:
                            # 发送音频数据
                            await ws.send(audio_chunk)
                            await asyncio.sleep(0.01)  # 10ms间隔
                        
                        # 发送结束信号
                        await ws.send(json.dumps({"type": "end"}))
                        logger.info("📤 音频数据发送完成")
                        
                    except Exception as e:
                        logger.error(f"❌ 发送音频数据失败: {e}")
                        raise
                
                # 创建消息处理任务
                async def handle_messages():
                    try:
                        async for message in ws:
                            try:
                                data = json.loads(message)
                                event_type = data.get("type")
                                
                                if event_type == "sentence":
                                    # 句子级别的识别结果
                                    text = data.get("text", "")
                                    is_final = data.get("is_final", False)
                                    
                                    if text.strip():
                                        logger.debug(f"📝 ASR句子结果: '{text}' (final={is_final})")
                                        yield text
                                        if on_result:
                                            on_result(text, is_final)
                                
                                elif event_type == "partial":
                                    # 部分识别结果（实时显示）
                                    text = data.get("text", "")
                                    if text.strip():
                                        logger.debug(f"📝 ASR部分结果: '{text}'")
                                        yield text
                                        if on_result:
                                            on_result(text, False)
                                
                                elif event_type == "error":
                                    error_msg = data.get("message", "未知错误")
                                    logger.error(f"❌ ASR识别错误: {error_msg}")
                                    raise Exception(f"ASR识别错误: {error_msg}")
                                
                                elif event_type == "end":
                                    logger.info("✅ ASR识别完成")
                                    break
                                
                            except json.JSONDecodeError:
                                logger.warning("⚠️ 收到非JSON格式消息")
                                continue
                    
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("🔌 ASR WebSocket连接已关闭")
                    except Exception as e:
                        logger.error(f"❌ ASR消息处理失败: {e}")
                        raise
                
                # 并行执行音频发送和消息处理
                audio_task = asyncio.create_task(send_audio())
                message_task = asyncio.create_task(handle_messages())
                
                try:
                    # 等待消息处理完成
                    async for result in message_task:
                        yield result
                finally:
                    # 清理任务
                    if not audio_task.done():
                        audio_task.cancel()
                    if not message_task.done():
                        message_task.cancel()
                    
                    try:
                        await audio_task
                    except asyncio.CancelledError:
                        pass
                    
                    try:
                        await message_task
                    except asyncio.CancelledError:
                        pass
                
        except Exception as e:
            logger.error(f"❌ 实时语音识别失败: {e}")
            raise
    
    async def recognize_file(self, file_path: str, model: str = None) -> str:
        """
        识别音频文件
        
        Args:
            file_path: 音频文件路径
            model: 识别模型
            
        Returns:
            str: 识别结果
        """
        if not model:
            model = self.default_model
            
        logger.info(f"🎤 开始文件语音识别: file={file_path}, model={model}")
        
        try:
            # 读取音频文件
            with open(file_path, 'rb') as f:
                audio_data = f.read()
            
            # 创建音频流生成器
            async def audio_stream():
                # 分块发送音频数据
                chunk_size = 3200  # 200ms @ 16kHz
                for i in range(0, len(audio_data), chunk_size):
                    yield audio_data[i:i + chunk_size]
                    await asyncio.sleep(0.1)  # 模拟实时流
            
            # 进行流式识别
            full_text = ""
            async for text_chunk in self.recognize_stream(audio_stream(), model):
                full_text += text_chunk
            
            logger.info(f"✅ 文件识别完成: {len(full_text)} 字符")
            return full_text
            
        except Exception as e:
            logger.error(f"❌ 文件语音识别失败: {e}")
            raise

# 全局服务实例
qwen_asr_realtime = QwenASRRealtimeService() 