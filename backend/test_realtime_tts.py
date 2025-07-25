#!/usr/bin/env python3
"""
Qwen-TTS Realtime API 测试脚本
"""
import asyncio
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.qwen_tts_realtime import qwen_tts_realtime

async def test_realtime_tts():
    """测试Realtime TTS服务"""
    print("🧪 开始测试 Qwen-TTS Realtime API...")
    
    # 测试文本
    test_texts = [
        "你好，这是一个简短的测试。",
        "欢迎使用Qwen-TTS Realtime API，这是一个更长的测试文本，用于验证流式语音合成的效果。我们希望能够实现边生成边播放的功能。",
        "Hello, this is a bilingual test. 这是一个中英文混合的测试。"
    ]
    
    voices = ["Cherry", "Ethan", "Dylan"]
    
    for i, text in enumerate(test_texts):
        voice = voices[i % len(voices)]
        print(f"\n--- 测试 {i+1}: {voice} ---")
        print(f"文本: {text}")
        
        try:
            # 测试完整合成
            print("📝 测试完整合成...")
            audio_data = await qwen_tts_realtime.synthesize_complete(text, voice)
            print(f"✅ 完整合成成功: {len(audio_data)} bytes")
            
            # 测试流式合成
            print("🌊 测试流式合成...")
            chunk_count = 0
            total_size = 0
            async for chunk in qwen_tts_realtime.synthesize_stream(text, voice):
                chunk_count += 1
                total_size += len(chunk)
                print(f"  收到音频片段 {chunk_count}: {len(chunk)} bytes")
            
            print(f"✅ 流式合成成功: {chunk_count} 个片段, 总计 {total_size} bytes")
            
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
        
        # 短暂延迟
        await asyncio.sleep(1)
    
    print("\n🎉 测试完成!")

async def test_api_connection():
    """测试API连接"""
    print("🔗 测试API连接...")
    
    try:
        # 测试最短文本
        result = await qwen_tts_realtime.synthesize_complete("测试", "Cherry")
        print(f"✅ API连接成功: {len(result)} bytes")
        return True
    except Exception as e:
        print(f"❌ API连接失败: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Qwen-TTS Realtime API 测试")
    print("=" * 50)
    
    # 检查API Key
    api_key = qwen_tts_realtime.api_key
    if not api_key or not api_key.startswith("sk-"):
        print("❌ API Key未正确配置")
        sys.exit(1)
    
    print(f"🔑 API Key: {api_key[:10]}...")
    print(f"🎤 默认语音: {qwen_tts_realtime.default_voice}")
    print(f"📡 服务地址: {qwen_tts_realtime.base_url}")
    
    # 运行测试
    asyncio.run(test_realtime_tts()) 