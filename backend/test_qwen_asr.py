#!/usr/bin/env python3
"""
Qwen ASR API连接测试脚本
用于验证Qwen ASR WebSocket API是否正常工作
"""
import asyncio
import websockets
import json
import logging
import time

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_qwen_asr_connection():
    """测试Qwen ASR WebSocket连接"""
    
    # Qwen ASR配置
    api_key = "sk-ff980442223b45868202e5cb35724bb1"
    base_url = "wss://dashscope.aliyuncs.com/api-ws/v1/asr"
    model = "paraformer-realtime-v2"
    format_type = "pcm"
    sample_rate = 16000
    
    # 构建WebSocket URL
    ws_url = f"{base_url}?model={model}&format={format_type}&sample_rate={sample_rate}"
    
    logger.info(f"🔌 尝试连接到Qwen ASR: {ws_url}")
    logger.info(f"🔑 API Key: {api_key[:10]}...")
    
    try:
        # 建立WebSocket连接
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        async with websockets.connect(ws_url, additional_headers=headers) as ws:
            logger.info("✅ Qwen ASR WebSocket连接成功")
            
            # 发送识别开始事件
            start_message = {
                "type": "start",
                "format": format_type,
                "sample_rate": sample_rate,
                "channels": 1
            }
            
            logger.info(f"📤 发送开始消息: {json.dumps(start_message, ensure_ascii=False)}")
            await ws.send(json.dumps(start_message))
            
            # 等待响应
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=10.0)
                logger.info(f"📨 收到响应: {response}")
                
                # 发送结束信号
                end_message = {"type": "end"}
                logger.info(f"📤 发送结束消息: {json.dumps(end_message, ensure_ascii=False)}")
                await ws.send(json.dumps(end_message))
                
                # 等待最终响应
                try:
                    final_response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    logger.info(f"📨 收到最终响应: {final_response}")
                except asyncio.TimeoutError:
                    logger.warning("⏰ 等待最终响应超时")
                    
            except asyncio.TimeoutError:
                logger.warning("⏰ 等待响应超时")
                
    except Exception as e:
        logger.error(f"❌ Qwen ASR连接失败: {e}")
        return False
    
    return True

async def test_qwen_asr_with_audio():
    """测试Qwen ASR带音频数据"""
    
    # Qwen ASR配置
    api_key = "sk-ff980442223b45868202e5cb35724bb1"
    base_url = "wss://dashscope.aliyuncs.com/api-ws/v1/asr"
    model = "paraformer-realtime-v2"
    format_type = "pcm"
    sample_rate = 16000
    
    # 构建WebSocket URL
    ws_url = f"{base_url}?model={model}&format={format_type}&sample_rate={sample_rate}"
    
    logger.info(f"🔌 尝试连接到Qwen ASR (带音频测试): {ws_url}")
    
    try:
        # 建立WebSocket连接
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        async with websockets.connect(ws_url, additional_headers=headers) as ws:
            logger.info("✅ Qwen ASR WebSocket连接成功")
            
            # 发送识别开始事件
            start_message = {
                "type": "start",
                "format": format_type,
                "sample_rate": sample_rate,
                "channels": 1
            }
            
            logger.info(f"📤 发送开始消息: {json.dumps(start_message, ensure_ascii=False)}")
            await ws.send(json.dumps(start_message))
            
            # 等待开始确认
            try:
                start_response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                logger.info(f"📨 收到开始确认: {start_response}")
                
                # 发送一些模拟的音频数据（静音）
                logger.info("📤 发送模拟音频数据...")
                for i in range(5):
                    # 创建1秒的静音PCM数据 (16000采样率)
                    silence_data = bytes([0] * 32000)  # 16位PCM，16000采样点
                    await ws.send(silence_data)
                    logger.info(f"📤 发送音频块 {i+1}/5")
                    await asyncio.sleep(0.2)
                
                # 发送结束信号
                end_message = {"type": "end"}
                logger.info(f"📤 发送结束消息: {json.dumps(end_message, ensure_ascii=False)}")
                await ws.send(json.dumps(end_message))
                
                # 等待最终响应
                try:
                    final_response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    logger.info(f"📨 收到最终响应: {final_response}")
                except asyncio.TimeoutError:
                    logger.warning("⏰ 等待最终响应超时")
                    
            except asyncio.TimeoutError:
                logger.warning("⏰ 等待开始确认超时")
                
    except Exception as e:
        logger.error(f"❌ Qwen ASR连接失败: {e}")
        return False
    
    return True

async def main():
    """主测试函数"""
    logger.info("🧪 开始Qwen ASR API连接测试")
    
    # 测试基本连接
    logger.info("\n" + "="*50)
    logger.info("🔍 测试1: 基本连接测试")
    logger.info("="*50)
    success1 = await test_qwen_asr_connection()
    
    if success1:
        logger.info("✅ 基本连接测试成功")
    else:
        logger.error("❌ 基本连接测试失败")
        return
    
    # 测试带音频数据
    logger.info("\n" + "="*50)
    logger.info("🔍 测试2: 带音频数据测试")
    logger.info("="*50)
    success2 = await test_qwen_asr_with_audio()
    
    if success2:
        logger.info("✅ 带音频数据测试成功")
    else:
        logger.error("❌ 带音频数据测试失败")
    
    logger.info("\n" + "="*50)
    logger.info("✅ Qwen ASR API测试完成")
    logger.info("="*50)

if __name__ == "__main__":
    asyncio.run(main()) 