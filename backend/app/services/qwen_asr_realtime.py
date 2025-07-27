"""
Qwen实时语音识别服务
基于阿里云百炼的实时语音识别API
使用官方dashscope SDK
参考官方示例：https://github.com/aliyun/alibabacloud-bailian-speech-demo/blob/master/samples/speech-recognition/recognize_speech_from_microphone/python/run.py
"""
import asyncio
import logging
import json
from typing import Optional, Callable, Dict, Any, AsyncGenerator
from datetime import datetime
from ..utils.logging_decorator import log_api_call
import time
import numpy as np

# 导入dashscope SDK
try:
    import dashscope
    from dashscope.audio.asr import Recognition, RecognitionCallback, RecognitionResult
    DASHSCOPE_AVAILABLE = True
except ImportError:
    DASHSCOPE_AVAILABLE = False
    logging.warning("dashscope SDK未安装，请运行: pip install dashscope")

logger = logging.getLogger(__name__)

def resample_audio(audio_data: bytes, from_rate: int, to_rate: int) -> bytes:
    """
    简单的音频重采样函数
    将音频从from_rate采样率转换为to_rate采样率
    
    Args:
        audio_data: 原始音频数据（字节）
        from_rate: 原始采样率
        to_rate: 目标采样率
        
    Returns:
        bytes: 重采样后的音频数据
    """
    try:
        # 将字节数据转换为numpy数组
        audio_array = np.frombuffer(audio_data, dtype=np.int16)
        
        # 计算重采样比例
        ratio = to_rate / from_rate
        
        # 简单的线性插值重采样
        new_length = int(len(audio_array) * ratio)
        resampled = np.interp(
            np.linspace(0, len(audio_array), new_length),
            np.arange(len(audio_array)),
            audio_array
        )
        
        # 转换回int16并返回字节
        return resampled.astype(np.int16).tobytes()
        
    except Exception as e:
        logger.warning(f"⚠️ 重采样失败: {e}，返回原始数据")
        return audio_data

class QwenASRCallback(RecognitionCallback):
    """Qwen ASR回调处理类"""
    
    def __init__(self, on_result: Optional[Callable[[str, bool], None]] = None):
        self.on_result = on_result
        self.is_open = False
        self.last_partial_text = ""
        self.silence_start_time = None
        self.silence_threshold = 2.0  # 2秒静音后认为说话结束
        self.last_activity_time = time.time()
        
    def on_open(self) -> None:
        """连接打开回调"""
        logger.info("🎤 Qwen ASR连接已打开")
        self.is_open = True
        self.last_activity_time = time.time()
        
    def on_close(self) -> None:
        """连接关闭回调"""
        logger.info("🎤 Qwen ASR连接已关闭")
        self.is_open = False
        
    def on_event(self, result: RecognitionResult) -> None:
        """识别结果回调"""
        try:
            # 更新活动时间
            self.last_activity_time = time.time()
            
            # 获取识别结果
            sentence_data = result.get_sentence()
            
            # 检查是否有识别结果
            if sentence_data:
                # 提取文本内容
                if isinstance(sentence_data, dict):
                    text = sentence_data.get('text', '')
                elif isinstance(sentence_data, list) and len(sentence_data) > 0:
                    text = sentence_data[0].get('text', '') if isinstance(sentence_data[0], dict) else str(sentence_data[0])
                else:
                    text = str(sentence_data)
                
                # 判断是否是句子结束
                is_final = RecognitionResult.is_sentence_end(sentence_data)
                
                if text and text.strip():
                    if is_final:
                        # 句子级别结果
                        sentence_text = text.strip()
                        logger.info(f"🎤 Qwen ASR句子结果: '{sentence_text}'")
                        if self.on_result:
                            self.on_result(sentence_text, True)  # 句子级别结果
                        # 重置静音计时器
                        self.silence_start_time = None
                        self.last_partial_text = ""
                    else:
                        # 部分识别结果
                        partial_text = text.strip()
                        if partial_text != self.last_partial_text:
                            logger.info(f"🎤 Qwen ASR部分结果: '{partial_text}'")
                            self.last_partial_text = partial_text
                            if self.on_result:
                                self.on_result(partial_text, False)  # 部分结果
                            # 重置静音计时器
                            self.silence_start_time = None
            else:
                # 没有识别结果，可能是静音
                current_time = time.time()
                if self.silence_start_time is None:
                    self.silence_start_time = current_time
                elif current_time - self.silence_start_time > self.silence_threshold:
                    # 静音超过阈值，可以认为说话结束
                    if self.last_partial_text:
                        logger.info(f"🎤 检测到静音，最终结果: '{self.last_partial_text}'")
                        if self.on_result:
                            self.on_result(self.last_partial_text, True)
                        self.last_partial_text = ""
                    
        except Exception as e:
            logger.error(f"❌ 处理ASR结果失败: {e}")
            # 打印更详细的错误信息
            import traceback
            logger.error(f"❌ 错误详情: {traceback.format_exc()}")

class QwenASRRealtimeService:
    """
    Qwen实时语音识别服务
    使用官方dashscope SDK
    """
    
    def __init__(self):
        self.api_key = "sk-ff980442223b45868202e5cb35724bb1"
        self.default_model = "paraformer-realtime-v2"
        self.sample_rate = 16000
        self.channels = 1
        self.format = "pcm"
        
        # 设置API Key
        if DASHSCOPE_AVAILABLE:
            dashscope.api_key = self.api_key
            logger.info("✅ dashscope SDK已配置")
        else:
            logger.error("❌ dashscope SDK未安装")
    
    @log_api_call("Qwen ASR Realtime", "qwen")
    async def recognize_stream(
        self, 
        audio_stream: AsyncGenerator[bytes, None],
        model: str = None,
        on_result: Optional[Callable[[str, bool], None]] = None,
        input_sample_rate: int = 16000,  # 输入音频的采样率
        language: str = "zh-CN"  # 添加语言参数
    ) -> AsyncGenerator[str, None]:
        """
        流式语音识别
        
        Args:
            audio_stream: 音频流生成器
            model: 识别模型，默认paraformer-realtime-v2
            on_result: 结果回调函数 (text, is_final)
            input_sample_rate: 输入音频的采样率，默认16kHz
            language: 识别语言，默认中文
            
        Yields:
            str: 识别出的文本片段
        """
        if not DASHSCOPE_AVAILABLE:
            raise Exception("dashscope SDK未安装，请运行: pip install dashscope")
            
        if not model:
            model = self.default_model
            
        logger.info(f"🎤 开始实时语音识别: model={model}, input_sample_rate={input_sample_rate}, language={language}")
        
        # 用于收集结果的列表
        results = []
        
        def result_callback(text: str, is_final: bool):
            if text.strip():
                if is_final:
                    results.append(text)
                if on_result:
                    on_result(text, is_final)
        
        try:
            # 创建回调处理器
            callback = QwenASRCallback(result_callback)
            
            # 创建识别实例，添加语言参数
            recognition = Recognition(
                model=model,
                format=self.format,
                sample_rate=self.sample_rate,
                callback=callback,
                # 添加语言参数
                language=language if language else "zh-CN"
            )
            
            logger.info("🚀 启动Qwen ASR识别...")
            recognition.start()
            
            # 等待连接建立
            await asyncio.sleep(1.0)  # 增加等待时间
            
            if not callback.is_open:
                raise Exception("ASR连接建立失败")
            
            logger.info("✅ Qwen ASR连接已建立，开始处理音频流")
            
            # 处理音频流
            chunk_count = 0
            last_activity_time = time.time()
            
            async for audio_chunk in audio_stream:
                try:
                    # 检查连接状态
                    if not callback.is_open:
                        logger.warning("⚠️ ASR连接已关闭，停止处理")
                        break
                    
                    # 检查音频数据格式
                    if len(audio_chunk) % 2 != 0:
                        logger.warning(f"⚠️ 音频数据长度不是2的倍数: {len(audio_chunk)}")
                        continue
                    
                    # 如果输入采样率与ASR期望的采样率不同，进行重采样
                    processed_chunk = audio_chunk
                    if input_sample_rate != self.sample_rate:
                        processed_chunk = resample_audio(audio_chunk, input_sample_rate, self.sample_rate)
                        logger.debug(f"🔄 重采样: {input_sample_rate}Hz -> {self.sample_rate}Hz, {len(audio_chunk)} -> {len(processed_chunk)} bytes")
                    
                    # 发送音频帧
                    recognition.send_audio_frame(processed_chunk)
                    chunk_count += 1
                    last_activity_time = time.time()
                    
                    # 每20个块记录一次日志，减少日志量
                    if chunk_count % 20 == 0:
                        logger.info(f"🎤 已处理音频块: {chunk_count}")
                    
                    # 检查活动超时（30秒无活动自动停止）
                    if time.time() - last_activity_time > 30:
                        logger.warning("⚠️ 活动超时，停止处理")
                        break
                        
                except Exception as e:
                    logger.error(f"❌ 发送音频帧失败: {e}")
                    # 如果是连接错误，停止处理
                    if "closing transport" in str(e) or "Speech recognition has stopped" in str(e):
                        logger.warning("⚠️ 检测到连接错误，停止处理")
                        break
                    continue
            
            logger.info(f"📤 音频流处理完成，共处理 {chunk_count} 个音频块")
            
            # 等待一段时间让最后的识别结果处理完成
            await asyncio.sleep(1.0)
            
            # 停止识别
            try:
                recognition.stop()
                logger.info("✅ Qwen ASR识别已停止")
            except Exception as e:
                logger.warning(f"⚠️ 停止识别时出错: {e}")
            
            # 返回所有结果
            for result in results:
                yield result
                
        except Exception as e:
            logger.error(f"❌ 实时语音识别失败: {e}")
            raise
    
    @log_api_call("Qwen ASR File", "qwen")
    async def recognize_file(self, file_path: str, model: str = None) -> str:
        """
        识别音频文件
        
        Args:
            file_path: 音频文件路径
            model: 识别模型
            
        Returns:
            str: 识别结果
        """
        if not DASHSCOPE_AVAILABLE:
            raise Exception("dashscope SDK未安装，请运行: pip install dashscope")
            
        if not model:
            model = self.default_model
            
        logger.info(f"🎤 开始文件语音识别: file={file_path}, model={model}")
        
        try:
            # 读取音频文件
            with open(file_path, 'rb') as f:
                audio_data = f.read()
            
            # 创建回调处理器
            results = []
            def on_result(text: str, is_final: bool):
                if is_final:
                    results.append(text)
            
            callback = QwenASRCallback(on_result)
            
            # 创建识别实例
            recognition = Recognition(
                model=model,
                format=self.format,
                sample_rate=self.sample_rate,
                callback=callback
            )
            
            logger.info("🚀 启动文件识别...")
            recognition.start()
            
            # 等待连接建立
            await asyncio.sleep(0.5)
            
            if not callback.is_open:
                raise Exception("ASR连接建立失败")
            
            # 分块发送音频数据
            chunk_size = 3200  # 200ms @ 16kHz
            for i in range(0, len(audio_data), chunk_size):
                chunk = audio_data[i:i + chunk_size]
                recognition.send_audio_frame(chunk)
                await asyncio.sleep(0.1)  # 模拟实时流
            
            # 停止识别
            recognition.stop()
            
            # 合并结果
            full_text = " ".join(results)
            logger.info(f"✅ 文件识别完成: {len(full_text)} 字符")
            return full_text
            
        except Exception as e:
            logger.error(f"❌ 文件语音识别失败: {e}")
            raise

# 全局服务实例
qwen_asr_realtime = QwenASRRealtimeService() 