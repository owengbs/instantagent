#!/usr/bin/env python3
"""
Qwen ASR API连接测试脚本 - 尝试不同端点
"""
import asyncio
import websockets
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_different_endpoints():
    """测试不同的API端点"""
    
    api_key = "sk-ff980442223b45868202e5cb35724bb1"
    
    # 测试不同的端点
    endpoints = [
        {
            "name": "原始端点",
            "url": "wss://dashscope.aliyuncs.com/api-ws/v1/asr?model=paraformer-realtime-v2&format=pcm&sample_rate=16000"
        },
        {
            "name": "简化端点",
            "url": "wss://dashscope.aliyuncs.com/api-ws/v1/asr"
        },
        {
            "name": "不同模型",
            "url": "wss://dashscope.aliyuncs.com/api-ws/v1/asr?model=paraformer-realtime&format=pcm&sample_rate=16000"
        },
        {
            "name": "无参数端点",
            "url": "wss://dashscope.aliyuncs.com/api-ws/v1/asr"
        }
    ]
    
    for endpoint in endpoints:
        logger.info(f"\n🔍 测试端点: {endpoint['name']}")
        logger.info(f"URL: {endpoint['url']}")
        
        try:
            headers = {
                "Authorization": f"Bearer {api_key}"
            }
            
            async with websockets.connect(endpoint['url'], additional_headers=headers) as ws:
                logger.info("✅ 连接成功")
                
                # 发送开始消息
                start_msg = {
                    "type": "start",
                    "format": "pcm",
                    "sample_rate": 16000,
                    "channels": 1
                }
                
                await ws.send(json.dumps(start_msg))
                logger.info("📤 发送开始消息")
                
                # 等待响应
                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    logger.info(f"📨 收到响应: {response}")
                except asyncio.TimeoutError:
                    logger.warning("⏰ 等待响应超时")
                
        except Exception as e:
            logger.error(f"❌ 连接失败: {e}")

async def test_http_endpoint():
    """测试HTTP端点（如果有的话）"""
    logger.info("\n🔍 测试HTTP端点")
    
    import httpx
    
    api_key = "sk-ff980442223b45868202e5cb35724bb1"
    
    # 测试不同的HTTP端点
    http_endpoints = [
        "https://dashscope.aliyuncs.com/api/v1/asr",
        "https://dashscope.aliyuncs.com/api/v1/services/asr",
        "https://dashscope.aliyuncs.com/api/v1/audio/transcriptions"
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    for endpoint in http_endpoints:
        logger.info(f"🔍 测试HTTP端点: {endpoint}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(endpoint, headers=headers)
                logger.info(f"📨 HTTP响应: {response.status_code}")
                if response.status_code != 404:
                    logger.info(f"📄 响应内容: {response.text[:200]}")
        except Exception as e:
            logger.error(f"❌ HTTP请求失败: {e}")

async def test_api_key():
    """测试API Key是否有效"""
    logger.info("\n🔍 测试API Key有效性")
    
    import httpx
    
    api_key = "sk-ff980442223b45868202e5cb35724bb1"
    
    # 测试一些可能的验证端点
    test_endpoints = [
        "https://dashscope.aliyuncs.com/api/v1/models",
        "https://dashscope.aliyuncs.com/api/v1/chat/completions",
        "https://dashscope.aliyuncs.com/api/v1/audio/speech"
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    for endpoint in test_endpoints:
        logger.info(f"🔍 测试端点: {endpoint}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(endpoint, headers=headers)
                logger.info(f"📨 状态码: {response.status_code}")
                
                if response.status_code == 200:
                    logger.info("✅ API Key有效")
                    logger.info(f"📄 响应: {response.text[:200]}")
                elif response.status_code == 401:
                    logger.error("❌ API Key无效")
                elif response.status_code == 404:
                    logger.warning("⚠️ 端点不存在")
                else:
                    logger.info(f"📄 其他状态: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"❌ 请求失败: {e}")

async def main():
    """主测试函数"""
    logger.info("🧪 开始Qwen ASR API端点测试")
    
    # 测试不同端点
    await test_different_endpoints()
    
    # 测试HTTP端点
    await test_http_endpoint()
    
    # 测试API Key
    await test_api_key()
    
    logger.info("\n✅ 测试完成")

if __name__ == "__main__":
    asyncio.run(main()) 