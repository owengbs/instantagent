"""
TTS (Text-to-Speech) API路由
"""
import asyncio
import logging
import tempfile
import os
from typing import Optional, List, Dict, Any
from datetime import datetime

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..services.qwen_tts_realtime import qwen_tts_realtime

logger = logging.getLogger(__name__)

# Qwen-TTS 服务配置
QWEN_TTS_BASE_URL = "http://127.0.0.1:8001"
QWEN_TTS_TIMEOUT = 30.0

# 请求/响应模型
class TTSRequest(BaseModel):
    text: str
    voice: str = "Cherry"  # 默认语音
    speed: float = 1.0     # 语速 (0.5-2.0)

class TTSResponse(BaseModel):
    success: bool
    message: str = ""
    audio_url: Optional[str] = None
    duration: Optional[float] = None

class VoiceInfo(BaseModel):
    name: str
    language: str
    description: str
    dialect: str

# 创建路由
router = APIRouter(prefix="/tts", tags=["tts"])

class QwenTTSService:
    """Qwen-TTS服务客户端"""
    
    def __init__(self):
        self.base_url = QWEN_TTS_BASE_URL
        self.timeout = QWEN_TTS_TIMEOUT
    
    async def get_voices(self) -> List[VoiceInfo]:
        """获取可用语音列表"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/api/voices")
                response.raise_for_status()
                
                data = response.json()
                voices_data = data.get("voices", {})
                logger.info(f"获取到 {len(voices_data)} 个语音选项")
                
                # 转换为标准格式
                voices = []
                for voice_name, voice_info in voices_data.items():
                    voices.append(VoiceInfo(
                        name=voice_info.get("name", voice_name),
                        language=voice_info.get("language", "Chinese"),
                        description=voice_info.get("description", ""),
                        dialect=voice_info.get("dialect", "Standard Mandarin")
                    ))
                
                return voices
                
        except httpx.RequestError as e:
            logger.error(f"Qwen-TTS服务连接失败: {e}")
            raise HTTPException(status_code=503, detail="TTS服务不可用")
        except Exception as e:
            logger.error(f"获取语音列表失败: {e}")
            raise HTTPException(status_code=500, detail="内部服务错误")
    
    async def synthesize_speech(self, text: str, voice: str = "Cherry") -> bytes:
        """合成语音"""
        try:
            logger.info(f"开始合成语音: text='{text[:50]}...', voice={voice}")
            
            payload = {
                "text": text,
                "voice": voice
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # 第一步：请求语音合成
                response = await client.post(
                    f"{self.base_url}/api/synthesize",
                    json=payload
                )
                response.raise_for_status()
                
                # 解析响应获取音频文件路径
                result = response.json()
                if not result.get("success"):
                    raise HTTPException(status_code=500, detail=f"TTS合成失败: {result.get('message', 'Unknown error')}")
                
                audio_url = result.get("audio_url")
                if not audio_url:
                    raise HTTPException(status_code=500, detail="TTS服务未返回音频文件路径")
                
                logger.info(f"获取音频文件路径: {audio_url}")
                
                # 第二步：下载音频文件
                audio_response = await client.get(f"{self.base_url}{audio_url}")
                audio_response.raise_for_status()
                
                audio_data = audio_response.content
                logger.info(f"语音合成完成: 音频大小={len(audio_data)}字节, 时长={result.get('duration', 'unknown')}秒")
                
                return audio_data
                
        except httpx.RequestError as e:
            logger.error(f"Qwen-TTS合成请求失败: {e}")
            raise HTTPException(status_code=503, detail="TTS服务连接失败")
        except httpx.HTTPStatusError as e:
            logger.error(f"Qwen-TTS服务错误: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=502, detail=f"TTS服务错误: {e.response.status_code}")
        except Exception as e:
            logger.error(f"语音合成失败: {e}")
            raise HTTPException(status_code=500, detail="语音合成内部错误")

# 创建服务实例
qwen_tts = QwenTTSService()

@router.get("/voices", response_model=List[VoiceInfo])
async def get_available_voices():
    """
    获取可用的语音选项 (Qwen-TTS Realtime API)
    """
    # Qwen-TTS Realtime API 支持的语音列表
    voices = [
        VoiceInfo(
            name="Cherry",
            language="中英双语",
            description="温柔甜美的女声",
            dialect="标准普通话"
        ),
        VoiceInfo(
            name="Ethan", 
            language="中英双语",
            description="成熟稳重的男声",
            dialect="标准普通话"
        ),
        VoiceInfo(
            name="Chelsie",
            language="中英双语", 
            description="活泼可爱的女声",
            dialect="标准普通话"
        ),
        VoiceInfo(
            name="Serena",
            language="中英双语",
            description="优雅知性的女声", 
            dialect="标准普通话"
        ),
        VoiceInfo(
            name="Dylan",
            language="中文",
            description="地道的北京爷们儿",
            dialect="北京话"
        ),
        VoiceInfo(
            name="Jada",
            language="中文", 
            description="温婉的上海女声",
            dialect="上海话"
        ),
        VoiceInfo(
            name="Sunny",
            language="中文",
            description="热情的四川女声",
            dialect="四川话"
        )
    ]
    
    logger.info(f"返回 {len(voices)} 个Realtime语音选项")
    return voices

@router.post("/synthesize")
async def synthesize_text_to_speech(request: TTSRequest):
    """
    文本转语音合成 (使用Qwen-TTS Realtime API)
    """
    try:
        logger.info(f"收到Realtime TTS请求: text='{request.text[:50]}...', voice={request.voice}")
        
        # 验证输入
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="文本内容不能为空")
        
        if len(request.text) > 5000:  # Realtime API支持更长文本
            raise HTTPException(status_code=400, detail="文本长度不能超过5000字符")
        
        # 调用Qwen-TTS Realtime服务进行完整合成
        audio_data = await qwen_tts_realtime.synthesize_complete(
            text=request.text.strip(),
            voice=request.voice
        )
        
        # 返回音频流
        def generate():
            yield audio_data
        
        return StreamingResponse(
            generate(),
            media_type="audio/pcm",  # Realtime API返回PCM格式
            headers={
                "Content-Disposition": "inline; filename=speech.pcm",
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*",
                "X-Sample-Rate": "24000",  # 提供采样率信息
                "X-Channels": "1",         # 单声道
                "X-Bit-Depth": "16"        # 16位深度
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Realtime TTS请求处理失败: {e}")
        raise HTTPException(status_code=500, detail="语音合成失败")

@router.post("/synthesize-stream")
async def synthesize_text_to_speech_stream(request: TTSRequest):
    """
    流式文本转语音合成 (实时返回音频片段)
    """
    try:
        logger.info(f"收到流式TTS请求: text='{request.text[:50]}...', voice={request.voice}")
        
        # 验证输入
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="文本内容不能为空")
        
        if len(request.text) > 5000:
            raise HTTPException(status_code=400, detail="文本长度不能超过5000字符")
        
        # 流式音频生成器
        async def audio_stream():
            try:
                async for chunk in qwen_tts_realtime.synthesize_stream(
                    text=request.text.strip(),
                    voice=request.voice
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"流式合成过程中出错: {e}")
                # 在流中发送错误（实际项目中可能需要更复杂的错误处理）
                yield b""  # 空数据表示结束
        
        return StreamingResponse(
            audio_stream(),
            media_type="audio/pcm",
            headers={
                "Content-Disposition": "inline; filename=speech_stream.pcm",
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*",
                "X-Sample-Rate": "24000",
                "X-Channels": "1",
                "X-Bit-Depth": "16"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"流式TTS请求处理失败: {e}")
        raise HTTPException(status_code=500, detail="流式语音合成失败")

@router.get("/health")
async def check_tts_health():
    """
    检查TTS服务健康状态 (Qwen-TTS Realtime API)
    """
    try:
        # 简单检查：验证API Key是否配置
        api_key = qwen_tts_realtime.api_key
        if not api_key or not api_key.startswith("sk-"):
            raise ValueError("API Key未正确配置")
        
        # 可选：做一个轻量级的连接测试（这里为了性能考虑暂时跳过）
        # 实际使用中可以尝试建立WebSocket连接并立即关闭
        
        return {
            "status": "healthy",
            "service": "Qwen-TTS Realtime API",
            "endpoint": "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
            "model": "qwen-tts-realtime",
            "supported_voices": 7,
            "api_key_configured": bool(api_key),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Realtime TTS健康检查失败: {e}")
        return {
            "status": "unhealthy", 
            "error": str(e),
            "service": "Qwen-TTS Realtime API",
            "timestamp": datetime.now().isoformat()
        } 