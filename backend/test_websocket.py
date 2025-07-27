#!/usr/bin/env python3
"""
WebSocket连接测试脚本
用于验证后端WebSocket端点是否正常工作
"""
import asyncio
import websockets
import json
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_chat_websocket():
    """测试聊天WebSocket端点"""
    uri = "ws://localhost:8000/api/chat/ws/test_client_123"
    
    try:
        logger.info(f"🔌 尝试连接到: {uri}")
        
        async with websockets.connect(uri) as websocket:
            logger.info("✅ WebSocket连接成功")
            
            # 等待欢迎消息
            try:
                welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"📨 收到欢迎消息: {welcome_msg}")
                
                # 发送测试消息
                test_message = {
                    "message": "你好",
                    "user_id": "test_user",
                    "session_id": "test_session"
                }
                
                logger.info(f"📤 发送测试消息: {json.dumps(test_message, ensure_ascii=False)}")
                await websocket.send(json.dumps(test_message, ensure_ascii=False))
                
                # 等待回复
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    logger.info(f"📨 收到回复: {response}")
                except asyncio.TimeoutError:
                    logger.warning("⏰ 等待回复超时")
                    
            except asyncio.TimeoutError:
                logger.warning("⏰ 等待欢迎消息超时")
                
    except Exception as e:
        logger.error(f"❌ WebSocket连接失败: {e}")

async def test_asr_websocket():
    """测试ASR WebSocket端点"""
    uri = "ws://localhost:8000/api/asr/ws/test_asr_client_456"
    
    try:
        logger.info(f"🔌 尝试连接到ASR: {uri}")
        
        async with websockets.connect(uri) as websocket:
            logger.info("✅ ASR WebSocket连接成功")
            
            # 发送开始消息
            start_message = {
                "type": "start",
                "model": "paraformer-realtime-v2",
                "language": "zh-CN"
            }
            
            logger.info(f"📤 发送ASR开始消息: {json.dumps(start_message, ensure_ascii=False)}")
            await websocket.send(json.dumps(start_message, ensure_ascii=False))
            
            # 等待确认
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"📨 收到ASR确认: {response}")
            except asyncio.TimeoutError:
                logger.warning("⏰ 等待ASR确认超时")
                
    except Exception as e:
        logger.error(f"❌ ASR WebSocket连接失败: {e}")

async def main():
    """主测试函数"""
    logger.info("🧪 开始WebSocket连接测试")
    
    # 测试聊天WebSocket
    await test_chat_websocket()
    
    print("\n" + "="*50 + "\n")
    
    # 测试ASR WebSocket
    await test_asr_websocket()
    
    logger.info("✅ 测试完成")

if __name__ == "__main__":
    asyncio.run(main()) 