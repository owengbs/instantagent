"""
语音识别API
支持实时语音识别和文件识别
"""
import logging
import json
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime

from ..services.qwen_asr_realtime import qwen_asr_realtime

logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/asr", tags=["asr"])

class ASRRequest(BaseModel):
    """语音识别请求"""
    model: str = "paraformer-realtime-v2"
    format: str = "pcm"
    sample_rate: int = 16000

class ASRResponse(BaseModel):
    """语音识别响应"""
    text: str
    is_final: bool
    model: str
    timestamp: str

@router.post("/recognize-stream")
async def recognize_speech_stream(request: ASRRequest):
    """
    流式语音识别
    接收音频流并返回识别结果
    """
    try:
        logger.info(f"🎤 收到流式ASR请求: model={request.model}")
        
        # 这里需要从请求体中获取音频流
        # 实际实现中，音频数据应该通过WebSocket或HTTP流传输
        # 这里提供一个示例框架
        
        async def generate_response():
            # 模拟音频流处理
            yield json.dumps({
                "type": "start",
                "message": "ASR服务已启动，等待音频数据"
            }) + "\n"
            
            # 实际实现中，这里应该处理真实的音频流
            # 并调用 qwen_asr_realtime.recognize_stream()
            
            yield json.dumps({
                "type": "error", 
                "message": "音频流处理功能需要WebSocket实现"
            }) + "\n"
        
        return StreamingResponse(
            generate_response(),
            media_type="application/x-ndjson",
            headers={
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ 流式ASR请求处理失败: {e}")
        raise HTTPException(status_code=500, detail="语音识别失败")

@router.post("/recognize-file")
async def recognize_speech_file(
    file: UploadFile = File(...),
    model: str = "paraformer-realtime-v2"
):
    """
    文件语音识别
    上传音频文件并返回识别结果
    """
    try:
        logger.info(f"🎤 收到文件ASR请求: file={file.filename}, model={model}")
        
        # 验证文件类型
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="请上传音频文件")
        
        # 保存上传的文件
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # 调用ASR服务识别文件
            result = await qwen_asr_realtime.recognize_file(temp_file_path, model)
            
            return ASRResponse(
                text=result,
                is_final=True,
                model=model,
                timestamp=datetime.now().isoformat()
            )
            
        finally:
            # 清理临时文件
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
    except Exception as e:
        logger.error(f"❌ 文件ASR请求处理失败: {e}")
        raise HTTPException(status_code=500, detail="语音识别失败")

@router.get("/models")
async def get_asr_models():
    """
    获取支持的ASR模型列表
    """
    models = [
        {
            "id": "paraformer-realtime-v2",
            "name": "Paraformer实时识别",
            "description": "支持中文、英文等多语种实时识别",
            "languages": ["zh-CN", "en-US"],
            "features": ["实时识别", "噪音抑制", "情感识别"]
        },
        {
            "id": "gummy-realtime-v2", 
            "name": "Gummy实时识别",
            "description": "高精度多语种识别，支持方言",
            "languages": ["zh-CN", "zh-HK", "en-US", "ja-JP", "ko-KR"],
            "features": ["高精度", "方言支持", "多语种混合"]
        }
    ]
    
    return {
        "models": models,
        "default_model": "paraformer-realtime-v2"
    }

@router.get("/health")
async def check_asr_health():
    """
    检查ASR服务健康状态
    """
    try:
        # 简单检查API Key配置
        api_key = qwen_asr_realtime.api_key
        if not api_key or not api_key.startswith("sk-"):
            raise ValueError("API Key未正确配置")
        
        return {
            "status": "healthy",
            "service": "Qwen ASR Realtime API",
            "endpoint": "wss://dashscope.aliyuncs.com/api-ws/v1/asr",
            "supported_models": 2,
            "api_key_configured": bool(api_key),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"ASR健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "service": "Qwen ASR Realtime API",
            "timestamp": datetime.now().isoformat()
        } 