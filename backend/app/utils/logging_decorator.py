"""
API调用日志装饰器
用于记录Qwen接口调用的详细信息
"""
import time
import logging
import functools
from typing import Callable, Any, Dict
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

def log_api_call(api_name: str, service_type: str = "qwen"):
    """
    API调用日志装饰器
    
    Args:
        api_name: API接口名称
        service_type: 服务类型 (qwen, openai等)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            
            # 提取关键信息
            context_length = 0
            text_length = 0
            request_info = {}
            
            # 根据函数名和参数提取信息
            if "recognize" in func.__name__:
                # ASR相关
                if args and hasattr(args[0], 'audio_stream'):
                    request_info["type"] = "audio_stream"
                elif "text" in kwargs:
                    text_length = len(kwargs["text"])
                    request_info["text_preview"] = kwargs["text"][:100] + "..." if len(kwargs["text"]) > 100 else kwargs["text"]
                    
            elif "synthesize" in func.__name__:
                # TTS相关
                if "text" in kwargs:
                    text_length = len(kwargs["text"])
                    request_info["text_preview"] = kwargs["text"][:100] + "..." if len(kwargs["text"]) > 100 else kwargs["text"]
                if "voice" in kwargs:
                    request_info["voice"] = kwargs["voice"]
                    
            elif "chat" in func.__name__ or "invoke" in func.__name__:
                # LLM相关
                if "message" in kwargs:
                    text_length = len(kwargs["message"])
                    request_info["message_preview"] = kwargs["message"][:100] + "..." if len(kwargs["message"]) > 100 else kwargs["message"]
                elif "messages" in kwargs:
                    messages = kwargs["messages"]
                    context_length = len(messages)
                    if messages:
                        last_message = messages[-1]
                        if hasattr(last_message, 'content'):
                            text_length = len(last_message.content)
                            request_info["last_message_preview"] = last_message.content[:100] + "..." if len(last_message.content) > 100 else last_message.content
            
            # 记录调用开始
            logger.info(f"🚀 [{service_type.upper()}] 调用 {api_name} 接口")
            logger.info(f"   📊 请求信息: {request_info}")
            if context_length > 0:
                logger.info(f"   📝 上下文长度: {context_length} 条消息")
            if text_length > 0:
                logger.info(f"   📄 文本长度: {text_length} 字符")
            
            try:
                # 执行函数
                result = await func(*args, **kwargs)
                
                # 计算耗时
                elapsed_time = time.time() - start_time
                
                # 记录成功结果
                logger.info(f"✅ [{service_type.upper()}] {api_name} 调用成功")
                logger.info(f"   ⏱️  耗时: {elapsed_time:.3f}秒")
                
                # 记录结果信息
                if hasattr(result, '__iter__') and not isinstance(result, (str, bytes)):
                    # 如果是生成器或流式结果
                    logger.info(f"   📤 返回类型: 流式数据")
                else:
                    result_length = len(str(result)) if result else 0
                    logger.info(f"   📤 返回长度: {result_length} 字符")
                
                return result
                
            except Exception as e:
                # 计算耗时
                elapsed_time = time.time() - start_time
                
                # 记录错误
                logger.error(f"❌ [{service_type.upper()}] {api_name} 调用失败")
                logger.error(f"   ⏱️  耗时: {elapsed_time:.3f}秒")
                logger.error(f"   🚨 错误: {str(e)}")
                raise
                
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            
            # 提取关键信息（同步版本）
            context_length = 0
            text_length = 0
            request_info = {}
            
            # 根据函数名和参数提取信息
            if "text" in kwargs:
                text_length = len(kwargs["text"])
                request_info["text_preview"] = kwargs["text"][:100] + "..." if len(kwargs["text"]) > 100 else kwargs["text"]
            
            # 记录调用开始
            logger.info(f"🚀 [{service_type.upper()}] 调用 {api_name} 接口")
            logger.info(f"   📊 请求信息: {request_info}")
            if text_length > 0:
                logger.info(f"   📄 文本长度: {text_length} 字符")
            
            try:
                # 执行函数
                result = func(*args, **kwargs)
                
                # 计算耗时
                elapsed_time = time.time() - start_time
                
                # 记录成功结果
                logger.info(f"✅ [{service_type.upper()}] {api_name} 调用成功")
                logger.info(f"   ⏱️  耗时: {elapsed_time:.3f}秒")
                
                return result
                
            except Exception as e:
                # 计算耗时
                elapsed_time = time.time() - start_time
                
                # 记录错误
                logger.error(f"❌ [{service_type.upper()}] {api_name} 调用失败")
                logger.error(f"   ⏱️  耗时: {elapsed_time:.3f}秒")
                logger.error(f"   🚨 错误: {str(e)}")
                raise
        
        # 根据函数类型返回对应的包装器
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
            
    return decorator 