#!/usr/bin/env python3
"""
文本优化演示脚本
展示大模型输出文本的TTS优化效果
"""
import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.text_cleaner import text_cleaner

def demo_text_optimization():
    """演示文本优化效果"""
    print("🎤 TTS文本优化演示")
    print("=" * 60)
    
    # 模拟大模型的实际输出
    original_text = """您好！我是您的股票交易助手 😊

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

希望这些信息对您有帮助！如果还有其他问题，随时可以问我 🎉"""
    
    print("📝 原始大模型输出:")
    print("-" * 40)
    print(original_text)
    print("-" * 40)
    print(f"📊 原始长度: {len(original_text)} 字符")
    
    print("\n🧹 文本清理过程:")
    print("-" * 40)
    
    # 逐步展示清理过程
    steps = [
        ("移除表情符号", r'[😀-🙏🌀-🗿😀-😿🚀-🛿⚡-⚿💡-💿📱-📿🎵-🎿🏀-🏿🌍-🌿🍀-🍿]'),
        ("移除标题格式", r'^#{1,6}\s+'),
        ("移除列表格式", r'^\d+\.\s+'),
        ("移除项目符号", r'^[•·]\s+'),
        ("移除特殊符号", r'[【】「」『』〈〉《》（）［］｛｝]'),
        ("处理重复标点", r'[！？。，；：]{2,}'),
        ("清理多余空格", r'\s+'),
    ]
    
    current_text = original_text
    for step_name, pattern in steps:
        import re
        if pattern.startswith('^'):
            # 多行模式
            current_text = re.sub(pattern, '', current_text, flags=re.MULTILINE)
        else:
            current_text = re.sub(pattern, '', current_text)
        
        print(f"✅ {step_name}: {len(current_text)} 字符")
    
    print("-" * 40)
    
    # 最终TTS优化
    final_text = text_cleaner.clean_for_tts(original_text)
    
    print("\n🎤 TTS优化后文本:")
    print("-" * 40)
    print(final_text)
    print("-" * 40)
    print(f"📊 优化后长度: {len(final_text)} 字符")
    
    # 统计优化效果
    reduction = len(original_text) - len(final_text)
    reduction_rate = (reduction / len(original_text)) * 100
    
    print(f"\n📈 优化效果:")
    print(f"   - 字符减少: {reduction} 个 ({reduction_rate:.1f}%)")
    print(f"   - 清理效果: {'✅ 优秀' if reduction_rate > 20 else '✅ 良好' if reduction_rate > 10 else '⚠️ 一般'}")
    
    # 检查是否还有问题字符
    problematic_chars = []
    for char in final_text:
        if ord(char) > 127 and char not in '，。！？；：':
            problematic_chars.append(char)
    
    if problematic_chars:
        print(f"   - ⚠️ 剩余问题字符: {set(problematic_chars)}")
    else:
        print(f"   - ✅ 无问题字符，完全适合TTS")
    
    # 句子分割演示
    print(f"\n📋 句子分割结果:")
    sentences = text_cleaner.split_into_sentences(final_text)
    for i, sentence in enumerate(sentences, 1):
        print(f"   {i}. {sentence}")
    
    print(f"\n✅ 共分割出 {len(sentences)} 个句子，平均长度: {sum(len(s) for s in sentences) / len(sentences):.1f} 字符")

def demo_comparison():
    """对比演示"""
    print("\n🔄 对比演示")
    print("=" * 60)
    
    test_cases = [
        {
            "name": "简单对话",
            "original": "您好！我是您的股票交易助手 😊，很高兴为您服务！",
            "description": "包含表情符号的简单对话"
        },
        {
            "name": "列表说明",
            "original": """开户流程：
1. 选择证券公司
2. 准备身份证
3. 下载APP
4. 在线开户""",
            "description": "包含列表格式的说明"
        },
        {
            "name": "复杂格式",
            "original": """# 重要提示 ⚠️

## 投资风险：
• 股票价格可能下跌 📉
• 可能损失本金 💸
• 需要承担风险 ⚡

【建议】请谨慎投资！""",
            "description": "包含复杂格式、表情符号、特殊符号的内容"
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\n--- 案例 {i}: {case['name']} ---")
        print(f"📝 {case['description']}")
        
        original = case['original']
        cleaned = text_cleaner.clean_for_tts(original)
        
        print(f"📝 原始: {original}")
        print(f"🎤 优化: {cleaned}")
        
        reduction = len(original) - len(cleaned)
        reduction_rate = (reduction / len(original)) * 100 if len(original) > 0 else 0
        
        print(f"📊 减少 {reduction} 字符 ({reduction_rate:.1f}%)")

def main():
    """主函数"""
    print("🎤 TTS文本优化演示")
    print("=" * 60)
    
    try:
        # 主要演示
        demo_text_optimization()
        
        # 对比演示
        demo_comparison()
        
        print("\n🎉 演示完成!")
        print("\n💡 总结:")
        print("✅ 文本清理功能能够有效处理大模型输出")
        print("✅ 移除表情符号、特殊符号、格式标记")
        print("✅ 将列表格式转换为自然语言")
        print("✅ 生成适合TTS语音合成的文本")
        print("✅ 保持语义完整性的同时优化朗读效果")
        
    except Exception as e:
        print(f"\n❌ 演示过程中出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 