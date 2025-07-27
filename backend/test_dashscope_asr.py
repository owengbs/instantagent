#!/usr/bin/env python3
"""
测试dashscope SDK的Qwen ASR功能
"""
import asyncio
import logging
import time

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_dashscope_asr():
    """测试dashscope ASR功能"""
    
    try:
        # 导入dashscope
        import dashscope
        from dashscope.audio.asr import Recognition, RecognitionCallback, RecognitionResult
        
        # 设置API Key
        api_key = "sk-ff980442223b45868202e5cb35724bb1"
        dashscope.api_key = api_key
        
        logger.info("✅ dashscope SDK导入成功")
        logger.info(f"🔑 API Key: {api_key[:10]}...")
        
        # 创建回调类
        class TestCallback(RecognitionCallback):
            def __init__(self):
                self.is_open = False
                self.results = []
                
            def on_open(self) -> None:
                logger.info("🎤 ASR连接已打开")
                self.is_open = True
                
            def on_close(self) -> None:
                logger.info("🎤 ASR连接已关闭")
                self.is_open = False
                
            def on_event(self, result: RecognitionResult) -> None:
                sentence = result.get_sentence()
                if sentence and sentence.strip():
                    logger.info(f"📝 ASR识别结果: '{sentence}'")
                    self.results.append(sentence)
        
        # 创建回调实例
        callback = TestCallback()
        
        # 创建识别实例
        recognition = Recognition(
            model='paraformer-realtime-v2',
            format='pcm',
            sample_rate=16000,
            callback=callback
        )
        
        logger.info("🚀 启动ASR识别...")
        recognition.start()
        
        # 等待连接建立
        await asyncio.sleep(1.0)
        
        if not callback.is_open:
            logger.error("❌ ASR连接建立失败")
            return False
        
        logger.info("✅ ASR连接已建立")
        
        # 发送一些测试音频数据（静音）
        logger.info("📤 发送测试音频数据...")
        for i in range(5):
            # 创建200ms的静音PCM数据 (16000采样率 * 0.2秒 * 2字节)
            silence_data = bytes([0] * 6400)  # 16位PCM，3200采样点
            recognition.send_audio_frame(silence_data)
            logger.info(f"📤 发送音频块 {i+1}/5")
            await asyncio.sleep(0.2)
        
        # 停止识别
        logger.info("🛑 停止ASR识别...")
        recognition.stop()
        
        # 等待处理完成
        await asyncio.sleep(1.0)
        
        logger.info(f"✅ 测试完成，识别结果数量: {len(callback.results)}")
        if callback.results:
            logger.info(f"📝 识别结果: {callback.results}")
        
        return True
        
    except ImportError as e:
        logger.error(f"❌ dashscope SDK导入失败: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ ASR测试失败: {e}")
        return False

async def test_qwen_asr_service():
    """测试我们的Qwen ASR服务"""
    
    try:
        from app.services.qwen_asr_realtime import qwen_asr_realtime
        
        logger.info("🧪 测试Qwen ASR服务...")
        
        # 创建模拟音频流
        async def audio_stream():
            for i in range(10):
                # 创建200ms的静音PCM数据
                silence_data = bytes([0] * 6400)
                yield silence_data
                await asyncio.sleep(0.1)
        
        # 收集结果
        results = []
        def on_result(text: str, is_final: bool):
            if is_final and text.strip():
                results.append(text)
                logger.info(f"🎤 服务识别结果: '{text}'")
        
        # 调用服务
        async for result in qwen_asr_realtime.recognize_stream(
            audio_stream(),
            model='paraformer-realtime-v2',
            on_result=on_result
        ):
            pass
        
        logger.info(f"✅ 服务测试完成，结果数量: {len(results)}")
        return True
        
    except Exception as e:
        logger.error(f"❌ 服务测试失败: {e}")
        return False

async def main():
    """主测试函数"""
    logger.info("🧪 开始dashscope ASR测试")
    
    # 测试1: 直接使用dashscope
    logger.info("\n" + "="*50)
    logger.info("🔍 测试1: 直接使用dashscope SDK")
    logger.info("="*50)
    success1 = await test_dashscope_asr()
    
    if success1:
        logger.info("✅ dashscope SDK测试成功")
    else:
        logger.error("❌ dashscope SDK测试失败")
        return
    
    # 测试2: 使用我们的服务
    logger.info("\n" + "="*50)
    logger.info("🔍 测试2: 使用我们的Qwen ASR服务")
    logger.info("="*50)
    success2 = await test_qwen_asr_service()
    
    if success2:
        logger.info("✅ 服务测试成功")
    else:
        logger.error("❌ 服务测试失败")
    
    logger.info("\n" + "="*50)
    logger.info("✅ 所有测试完成")
    logger.info("="*50)

if __name__ == "__main__":
    asyncio.run(main()) 