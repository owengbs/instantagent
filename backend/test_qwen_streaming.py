#!/usr/bin/env python3
"""
Qwen流式对话测试脚本
验证阿里云百炼API的流式功能
"""
import os
import sys
import asyncio
from openai import AsyncOpenAI

# 设置API配置
API_KEY = "sk-ff980442223b45868202e5cb35724bb1"
BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
MODEL = "qwen-plus"

async def test_qwen_streaming():
    """测试Qwen流式对话"""
    print("🧪 测试Qwen流式对话...")
    print("=" * 50)
    
    client = AsyncOpenAI(
        api_key=API_KEY,
        base_url=BASE_URL
    )
    
    test_questions = [
        "你好，请简单介绍一下你自己",
        "请详细解释一下什么是股票交易，包括基本概念和流程",
        "Hello, can you speak Chinese and English? 请用中英文回答这个问题。"
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n--- 测试 {i}: {question} ---")
        
        try:
            # 调用流式API
            stream = await client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": "你是一个专业的股票交易客服助手。"},
                    {"role": "user", "content": question}
                ],
                stream=True,
                temperature=0.7,
                max_tokens=1024
            )
            
            full_content = ""
            chunk_count = 0
            
            print("📝 流式输出内容:")
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_content += content
                    chunk_count += 1
                    print(content, end="", flush=True)
            
            print(f"\n\n✅ 流式回复完成:")
            print(f"   - 片段数量: {chunk_count}")
            print(f"   - 总长度: {len(full_content)}")
            print(f"   - 完整内容: {full_content[:100]}...")
            
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n" + "-" * 50)
        await asyncio.sleep(1)

async def test_simple_request():
    """测试简单的非流式请求"""
    print("\n🔍 测试简单请求...")
    
    client = AsyncOpenAI(
        api_key=API_KEY,
        base_url=BASE_URL
    )
    
    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "你是谁？请简单回答。"}
            ],
            temperature=0.7,
            max_tokens=256
        )
        
        content = response.choices[0].message.content
        print(f"✅ 简单请求成功: {content}")
        
    except Exception as e:
        print(f"❌ 简单请求失败: {e}")

async def main():
    """主函数"""
    print("🚀 Qwen流式对话测试工具")
    print(f"🔑 API Key: {API_KEY[:10]}...")
    print(f"📡 Base URL: {BASE_URL}")
    print(f"🤖 Model: {MODEL}")
    print("=" * 60)
    
    # 测试简单请求
    await test_simple_request()
    
    # 测试流式对话
    await test_qwen_streaming()
    
    print("\n🎉 所有测试完成!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 测试被中断")
    except Exception as e:
        print(f"\n❌ 测试出错: {e}")
        import traceback
        traceback.print_exc() 