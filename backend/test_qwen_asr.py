#!/usr/bin/env python3
"""
Qwen ASR测试脚本
验证阿里云百炼实时语音识别功能
"""
import asyncio
import websockets
import json
import logging
import sys
import os

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class QwenASRTester:
    """Qwen ASR测试器"""
    
    def __init__(self):
        self.api_key = "sk-ff980442223b45868202e5cb35724bb1"
        self.asr_url = "wss://dashscope.aliyuncs.com/api-ws/v1/asr"
        
    async def test_asr_connection(self):
        """测试ASR连接"""
        print("🔍 测试ASR连接...")
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            ws_url = f"{self.asr_url}?model=paraformer-realtime-v2&format=pcm&sample_rate=16000"
            
            async with websockets.connect(ws_url, additional_headers=headers) as ws:
                print("✅ ASR WebSocket连接成功")
                
                # 发送开始事件
                await ws.send(json.dumps({
                    "type": "start",
                    "format": "pcm",
                    "sample_rate": 16000,
                    "channels": 1
                }))
                
                # 发送测试音频数据（静音）
                test_audio = b'\x00' * 3200  # 200ms静音
                await ws.send(test_audio)
                
                # 发送结束事件
                await ws.send(json.dumps({"type": "end"}))
                
                # 接收响应
                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    data = json.loads(response)
                    print(f"📝 ASR响应: {data}")
                except asyncio.TimeoutError:
                    print("⏰ ASR响应超时")
                
                print("✅ ASR连接测试完成")
                
        except Exception as e:
            print(f"❌ ASR连接测试失败: {e}")
    
    async def test_file_recognition(self):
        """测试文件识别"""
        print("\n📁 测试文件识别...")
        
        # 这里需要一个测试音频文件
        # 实际测试中需要准备一个WAV或PCM格式的音频文件
        test_file_path = "test_audio.wav"
        
        if not os.path.exists(test_file_path):
            print(f"⚠️ 测试文件不存在: {test_file_path}")
            print("请准备一个测试音频文件进行测试")
            return
        
        try:
            from app.services.qwen_asr_realtime import qwen_asr_realtime
            
            result = await qwen_asr_realtime.recognize_file(test_file_path)
            print(f"✅ 文件识别成功: {result}")
            
        except Exception as e:
            print(f"❌ 文件识别失败: {e}")
    
    async def test_websocket_integration(self):
        """测试WebSocket集成"""
        print("\n🌐 测试WebSocket集成...")
        
        try:
            async with websockets.connect("ws://localhost:8000/api/asr/ws/test_client") as ws:
                print("✅ 本地ASR WebSocket连接成功")
                
                # 接收欢迎消息
                welcome_msg = await ws.recv()
                welcome_data = json.loads(welcome_msg)
                print(f"📩 欢迎消息: {welcome_data.get('message', 'N/A')}")
                
                # 发送开始识别消息
                await ws.send(json.dumps({
                    "type": "start",
                    "model": "paraformer-realtime-v2",
                    "language": "zh-CN"
                }))
                
                # 发送测试音频数据
                test_audio = b'\x00' * 3200  # 200ms静音
                await ws.send(test_audio)
                
                # 发送结束消息
                await ws.send(json.dumps({"type": "end"}))
                
                # 接收响应
                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    data = json.loads(response)
                    print(f"📝 本地ASR响应: {data}")
                except asyncio.TimeoutError:
                    print("⏰ 本地ASR响应超时")
                
                print("✅ WebSocket集成测试完成")
                
        except Exception as e:
            print(f"❌ WebSocket集成测试失败: {e}")
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始Qwen ASR测试")
        print("=" * 60)
        
        # 检查基础配置
        print(f"🔑 API Key: {self.api_key[:10]}...")
        print(f"📡 ASR URL: {self.asr_url}")
        
        try:
            # 测试ASR连接
            await self.test_asr_connection()
            
            # 测试文件识别
            await self.test_file_recognition()
            
            # 测试WebSocket集成
            await self.test_websocket_integration()
            
            print("\n🎉 所有ASR测试完成!")
            
        except KeyboardInterrupt:
            print("\n🛑 测试被用户中断")
        except Exception as e:
            print(f"\n❌ 测试过程中出现错误: {e}")
            import traceback
            traceback.print_exc()

async def main():
    """主函数"""
    tester = QwenASRTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    print("🧪 Qwen ASR测试工具")
    print("请确保后端服务已启动 (python3 main.py)")
    print("=" * 60)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 测试结束") 