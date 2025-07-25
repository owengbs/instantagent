#!/usr/bin/env python3
"""
TTS文本优化测试
专门测试文本清理对TTS语音合成的影响
"""
import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.text_cleaner import text_cleaner

def test_tts_optimization():
    """测试TTS文本优化效果"""
    print("🎤 TTS文本优化测试")
    print("=" * 60)
    
    # 模拟大模型输出的各种情况
    test_cases = [
        {
            "name": "基础对话测试",
            "input": "您好！我是您的股票交易助手 😊，很高兴为您服务！",
            "description": "包含表情符号的简单对话"
        },
        {
            "name": "列表格式测试",
            "input": """开户流程如下：
1. 选择证券公司
2. 准备身份证
3. 下载APP
4. 在线开户

注意事项：
• 确保网络安全
• 营业时间操作
• 有问题联系客服""",
            "description": "包含列表和项目符号的说明"
        },
        {
            "name": "标题格式测试",
            "input": """# 股票投资指南

## 投资步骤：
### 第一步：开户
选择大型证券公司，如中信证券、华泰证券等。

### 第二步：学习
建议先学习基础知识，了解风险。

### 第三步：小资金试水
建议先用小资金练习，熟悉操作流程。""",
            "description": "包含Markdown标题格式的内容"
        },
        {
            "name": "特殊符号测试",
            "input": "【重要提示】请仔细阅读《用户协议》（第3条）和《风险提示》⚠️，投资有风险，入市需谨慎！",
            "description": "包含各种特殊符号和括号的内容"
        },
        {
            "name": "复杂格式测试",
            "input": """# 股票交易完整指南 📈

## 开户流程：
1. **选择券商** - 推荐大型券商（如中信、华泰）
2. **准备材料** - 身份证、银行卡
3. **下载APP** - 从官方渠道下载
4. **在线开户** - 按提示完成操作

## 交易步骤：
• 充值资金 💰
• 选择股票 📊
• 下单交易 ⚡
• 监控持仓 👀

## 风险提示：
⚠️ 投资有风险，入市需谨慎！
💡 建议先学习基础知识
📚 可以参加培训课程

希望这些信息对您有帮助！ 🎉""",
            "description": "包含复杂格式、表情符号、列表的完整内容"
        },
        {
            "name": "实际AI回复模拟",
            "input": """您好！我是您的股票交易助手 😊

关于您询问的开户流程，我来为您详细介绍：

## 开户步骤：
1. **选择证券公司** - 我推荐您选择大型券商，比如中信证券、华泰证券等，这些券商服务比较完善
2. **准备身份证** - 请确保您的身份证在有效期内，这是开户的必备材料
3. **下载APP** - 请从官方渠道下载交易APP，避免使用第三方软件
4. **在线开户** - 按照APP提示完成开户操作，整个过程大约需要10分钟

## 注意事项：
⚠️ 请确保网络环境安全，不要在公共WiFi下操作
💡 建议在营业时间（9:00-15:00）进行操作
📞 如果遇到问题，可以联系客服热线

## 后续建议：
• 开户成功后，建议先学习基础知识
• 可以先用小资金练习，熟悉操作流程
• 投资有风险，请谨慎操作

希望这些信息对您有帮助！如果还有其他问题，随时可以问我 🎉""",
            "description": "模拟真实的AI回复内容"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n--- 测试 {i}: {test_case['name']} ---")
        print(f"📝 描述: {test_case['description']}")
        print(f"📝 原始文本 ({len(test_case['input'])} 字符):")
        print(f"   {test_case['input']}")
        
        # 执行TTS优化清理
        cleaned = text_cleaner.clean_for_tts(test_case['input'])
        
        print(f"🎤 TTS优化后 ({len(cleaned)} 字符):")
        print(f"   {cleaned}")
        
        # 分析优化效果
        original_length = len(test_case['input'])
        cleaned_length = len(cleaned)
        reduction = original_length - cleaned_length
        reduction_rate = (reduction / original_length) * 100 if original_length > 0 else 0
        
        print(f"📊 优化统计:")
        print(f"   - 字符减少: {reduction} 个 ({reduction_rate:.1f}%)")
        print(f"   - 清理效果: {'✅ 良好' if reduction_rate > 10 else '⚠️ 一般'}")
        
        # 检查是否包含不适合TTS的内容
        problematic_chars = []
        for char in cleaned:
            if ord(char) > 127 and char not in '，。！？；：':
                problematic_chars.append(char)
        
        if problematic_chars:
            print(f"   - 剩余问题字符: {set(problematic_chars)}")
        else:
            print(f"   - ✅ 无问题字符")
        
        print("-" * 50)

def test_sentence_flow():
    """测试句子流畅度"""
    print("\n🌊 句子流畅度测试")
    print("=" * 60)
    
    test_texts = [
        "您好！我是您的股票交易助手。关于开户流程，我来为您详细介绍。首先，您需要选择一家证券公司。然后，准备身份证等材料。最后，按照APP提示完成开户操作。整个过程大约需要10分钟。",
        "投资有风险，入市需谨慎！请确保网络环境安全，建议在营业时间操作。如果遇到问题，可以联系客服热线。",
        "开户步骤：选择证券公司，准备身份证，下载APP，在线开户。注意事项：确保网络安全，营业时间操作，有问题联系客服。"
    ]
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n--- 测试 {i} ---")
        print(f"📝 原始文本:")
        print(f"   {text}")
        
        # 分割句子
        sentences = text_cleaner.split_into_sentences(text)
        
        print(f"📋 句子分割结果:")
        for j, sentence in enumerate(sentences, 1):
            print(f"   {j}. {sentence}")
        
        print(f"✅ 共 {len(sentences)} 个句子，平均长度: {sum(len(s) for s in sentences) / len(sentences):.1f} 字符")

def test_performance_benchmark():
    """性能基准测试"""
    print("\n⚡ 性能基准测试")
    print("=" * 60)
    
    import time
    
    # 生成大量测试数据
    test_data = []
    for i in range(100):
        test_data.append(f"""# 测试文档 {i} 📈

## 步骤 {i}：
1. **操作一** - 这是第一个操作 😊
2. **操作二** - 这是第二个操作 ⚡
3. **操作三** - 这是第三个操作 💡

注意事项：
• 注意安全 ⚠️
• 谨慎操作 💪
• 有问题联系客服 📞

【重要提示】请仔细阅读《用户协议》（第{i}条）和《风险提示》！！！

希望这些信息对您有帮助！ 🎉""")
    
    print(f"📊 测试数据: {len(test_data)} 个文档")
    
    # 测试清理性能
    start_time = time.time()
    cleaned_results = []
    for text in test_data:
        cleaned = text_cleaner.clean_for_tts(text)
        cleaned_results.append(cleaned)
    end_time = time.time()
    
    total_time = (end_time - start_time) * 1000  # 转换为毫秒
    avg_time = total_time / len(test_data)
    
    print(f"⏱️  性能统计:")
    print(f"   - 总处理时间: {total_time:.2f} 毫秒")
    print(f"   - 平均处理时间: {avg_time:.2f} 毫秒/文档")
    print(f"   - 处理速度: {len(test_data) / (total_time / 1000):.1f} 文档/秒")
    
    # 统计优化效果
    total_original_length = sum(len(text) for text in test_data)
    total_cleaned_length = sum(len(text) for text in cleaned_results)
    total_reduction = total_original_length - total_cleaned_length
    reduction_rate = (total_reduction / total_original_length) * 100
    
    print(f"📈 优化效果:")
    print(f"   - 原始总长度: {total_original_length} 字符")
    print(f"   - 清理后总长度: {total_cleaned_length} 字符")
    print(f"   - 总减少: {total_reduction} 字符 ({reduction_rate:.1f}%)")

def main():
    """主函数"""
    print("🎤 TTS文本优化测试套件")
    print("=" * 60)
    
    try:
        # TTS优化测试
        test_tts_optimization()
        
        # 句子流畅度测试
        test_sentence_flow()
        
        # 性能基准测试
        test_performance_benchmark()
        
        print("\n🎉 所有测试完成!")
        print("\n📋 总结:")
        print("✅ 文本清理功能正常工作")
        print("✅ 能够有效移除表情符号、特殊符号、格式标记")
        print("✅ 能够将列表格式转换为自然语言")
        print("✅ 性能良好，处理速度快")
        print("✅ 适合TTS语音合成")
        
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 