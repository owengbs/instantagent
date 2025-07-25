#!/usr/bin/env python3
"""
实时对话系统测试脚本
测试流式AI回复 + 实时TTS合成
"""
import asyncio
import websockets
import json
import logging
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agents.customer_agent import customer_agent
from app.services.qwen_tts_realtime import qwen_tts_realtime

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class RealtimeSystemTester:
    """实时对话系统测试器"""
    
    def __init__(self):
        self.websocket_url = "ws://localhost:8000/api/realtime/ws/test_client"
        
    async def test_ai_streaming(self):
        """测试AI流式回复"""
        print("\n🧪 测试AI流式回复...")
        print("=" * 50)
        
        test_questions = [
            "你好，请简单介绍一下你的功能",
            "如何注册新账户？",
            "请详细说明一下股票交易的流程，包括开户、充值、买入、卖出等步骤"
        ]
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n--- 测试 {i}: {question} ---")
            
            try:
                full_response = ""
                chunk_count = 0
                
                async for chunk in customer_agent.chat_stream(question):
                    chunk_count += 1
                    full_response += chunk
                    print(f"  片段 {chunk_count}: '{chunk}'")
                
                print(f"✅ 流式回复完成: {chunk_count} 个片段, 总长度 {len(full_response)}")
                print(f"📝 完整回复: {full_response}")
                
            except Exception as e:
                print(f"❌ 测试失败: {e}")
            
            await asyncio.sleep(1)
    
    async def test_tts_streaming(self):
        """测试TTS流式合成"""
        print("\n🎤 测试TTS流式合成...")
        print("=" * 50)
        
        test_texts = [
            "你好，欢迎使用我们的服务。",
            "股票交易需要先开户。开户需要提供身份证、银行卡等材料。",
            "Thank you for using our service. 谢谢使用我们的服务，祝您投资愉快！"
        ]
        
        voices = ["Cherry", "Ethan", "Dylan"]
        
        for i, (text, voice) in enumerate(zip(test_texts, voices), 1):
            print(f"\n--- 测试 {i}: {voice} - {text} ---")
            
            try:
                chunk_count = 0
                total_size = 0
                
                async for chunk in qwen_tts_realtime.synthesize_stream(text, voice):
                    chunk_count += 1
                    total_size += len(chunk)
                    print(f"  音频片段 {chunk_count}: {len(chunk)} bytes")
                
                print(f"✅ TTS流式合成完成: {chunk_count} 个片段, 总计 {total_size} bytes")
                
            except Exception as e:
                print(f"❌ 测试失败: {e}")
            
            await asyncio.sleep(1)
    
    async def test_websocket_integration(self):
        """测试WebSocket集成"""
        print("\n🌐 测试WebSocket集成...")
        print("=" * 50)
        
        try:
            async with websockets.connect(self.websocket_url) as websocket:
                print("✅ WebSocket连接成功")
                
                # 接收欢迎消息
                welcome_msg = await websocket.recv()
                welcome_data = json.loads(welcome_msg)
                print(f"📩 欢迎消息: {welcome_data.get('message', 'N/A')}")
                
                # 设置语音
                await websocket.send(json.dumps({
                    "type": "set_voice",
                    "voice": "Cherry"
                }))
                
                # 发送聊天消息
                test_message = "你好，这是一个测试消息，请简单回复一下。"
                print(f"📤 发送消息: {test_message}")
                
                await websocket.send(json.dumps({
                    "type": "chat",
                    "message": test_message
                }))
                
                # 接收响应
                ai_text_chunks = []
                audio_sequences = {}
                
                timeout_count = 0
                max_timeout = 30  # 30秒超时
                
                while timeout_count < max_timeout:
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        data = json.loads(response)
                        msg_type = data.get("type")
                        
                        if msg_type == "processing_start":
                            print("🌊 开始处理流式对话")
                        
                        elif msg_type == "ai_text_chunk":
                            content = data.get("content", "")
                            ai_text_chunks.append(content)
                            print(f"📝 AI文本片段: '{content}'")
                        
                        elif msg_type == "tts_start":
                            sequence = data.get("sequence")
                            text = data.get("text")
                            print(f"🎤 开始TTS序列 {sequence}: {text}")
                            audio_sequences[sequence] = {"text": text, "chunks": 0}
                        
                        elif msg_type == "audio_chunk":
                            sequence = data.get("sequence")
                            chunk_index = data.get("chunk_index")
                            if sequence in audio_sequences:
                                audio_sequences[sequence]["chunks"] += 1
                            print(f"🎵 音频片段 {sequence}-{chunk_index}")
                        
                        elif msg_type == "tts_complete":
                            sequence = data.get("sequence")
                            total_chunks = data.get("total_chunks")
                            total_size = data.get("total_size")
                            print(f"✅ TTS完成序列 {sequence}: {total_chunks} 片段, {total_size} bytes")
                        
                        elif msg_type == "processing_complete":
                            total_sentences = data.get("total_sentences")
                            print(f"🎉 流式对话完成: {total_sentences} 个句子")
                            break
                        
                        elif msg_type == "error":
                            error_msg = data.get("message")
                            print(f"❌ 服务器错误: {error_msg}")
                            break
                        
                        timeout_count = 0  # 重置超时计数
                        
                    except asyncio.TimeoutError:
                        timeout_count += 1
                        print(f"⏰ 等待响应... ({timeout_count}/{max_timeout})")
                
                # 总结
                total_ai_text = "".join(ai_text_chunks)
                print(f"\n📊 测试总结:")
                print(f"  AI文本片段数: {len(ai_text_chunks)}")
                print(f"  AI完整回复: {total_ai_text}")
                print(f"  音频序列数: {len(audio_sequences)}")
                for seq, info in audio_sequences.items():
                    print(f"    序列 {seq}: {info['text']} ({info['chunks']} 音频片段)")
                
                print("✅ WebSocket集成测试完成")
                
        except Exception as e:
            print(f"❌ WebSocket集成测试失败: {e}")
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始实时对话系统测试")
        print("=" * 60)
        
        # 检查基础配置
        print(f"🔑 TTS API Key: {qwen_tts_realtime.api_key[:10]}...")
        print(f"📡 WebSocket URL: {self.websocket_url}")
        
        try:
            # 测试AI流式回复
            await self.test_ai_streaming()
            
            # 测试TTS流式合成
            await self.test_tts_streaming()
            
            # 测试WebSocket集成
            await self.test_websocket_integration()
            
            print("\n🎉 所有测试完成!")
            
        except KeyboardInterrupt:
            print("\n🛑 测试被用户中断")
        except Exception as e:
            print(f"\n❌ 测试过程中出现错误: {e}")
            import traceback
            traceback.print_exc()

async def main():
    """主函数"""
    tester = RealtimeSystemTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    print("🧪 实时对话系统测试工具")
    print("请确保后端服务已启动 (python3 main.py)")
    print("=" * 60)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 测试结束") 