#!/usr/bin/env python3
"""
文本清理测试脚本
验证文本清理服务的效果
"""
import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.text_cleaner import text_cleaner

def test_text_cleaner():
    """测试文本清理功能"""
    print("🧪 文本清理测试")
    print("=" * 60)
    
    # 测试用例
    test_cases = [
        {
            "name": "表情符号测试",
            "input": "你好😊！今天天气真不错🌞，我们来看看股票📈吧！",
            "expected": "你好！今天天气真不错，我们来看看股票吧。"
        },
        {
            "name": "标题格式测试",
            "input": "# 股票交易指南\n## 1. 开户流程\n### 第一步：准备材料",
            "expected": "股票交易指南，开户流程，第一步：准备材料。"
        },
        {
            "name": "列表格式测试",
            "input": "交易步骤：\n1. 注册账户\n2. 实名认证\n3. 充值资金\n4. 开始交易",
            "expected": "交易步骤：第1个，注册账户，第2个，实名认证，第3个，充值资金，第4个，开始交易。"
        },
        {
            "name": "特殊符号测试",
            "input": "【重要提示】请仔细阅读《用户协议》（第3条）和《风险提示》",
            "expected": "重要提示，请仔细阅读，用户协议，第3条，和，风险提示。"
        },
        {
            "name": "重复标点测试",
            "input": "太棒了！！！这个功能真的很好？？？",
            "expected": "太棒了！这个功能真的很好？"
        },
        {
            "name": "复杂格式测试",
            "input": """# 股票投资指南 📈
            
## 投资步骤：
1. **开户** - 选择证券公司
2. **认证** - 完成实名认证  
3. **充值** - 存入资金
4. **交易** - 开始买卖股票

注意事项：
• 投资有风险 ⚠️
• 请谨慎操作 💡
• 建议学习相关知识 📚"""
        },
        {
            "name": "实际AI回复测试",
            "input": """您好！我是您的股票交易助手 😊

关于开户流程，我来为您详细介绍：

## 开户步骤：
1. **选择证券公司** - 推荐大型券商
2. **准备身份证** - 确保在有效期内
3. **下载APP** - 从官方渠道下载
4. **在线开户** - 按提示完成操作

## 注意事项：
⚠️ 请确保网络环境安全
💡 建议在营业时间操作
📞 如有问题可联系客服

希望这些信息对您有帮助！ 🎉"""
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n--- 测试 {i}: {test_case['name']} ---")
        print(f"📝 原始文本:")
        print(f"   {test_case['input']}")
        
        # 执行清理
        cleaned = text_cleaner.clean_for_tts(test_case['input'])
        
        print(f"🧹 清理后文本:")
        print(f"   {cleaned}")
        
        # 检查效果
        if cleaned.strip():
            print(f"✅ 清理成功，长度: {len(cleaned)} 字符")
        else:
            print(f"❌ 清理后文本为空")
        
        print("-" * 50)

def test_sentence_splitting():
    """测试句子分割功能"""
    print("\n🔍 句子分割测试")
    print("=" * 60)
    
    test_text = """您好！我是您的股票交易助手。关于开户流程，我来为您详细介绍。首先，您需要选择一家证券公司。然后，准备身份证等材料。最后，按照APP提示完成开户操作。整个过程大约需要10分钟。"""
    
    print(f"📝 原始文本:")
    print(f"   {test_text}")
    
    sentences = text_cleaner.split_into_sentences(test_text)
    
    print(f"\n📋 分割结果:")
    for i, sentence in enumerate(sentences, 1):
        print(f"   {i}. {sentence}")
    
    print(f"\n✅ 共分割出 {len(sentences)} 个句子")

def test_performance():
    """测试性能"""
    print("\n⚡ 性能测试")
    print("=" * 60)
    
    import time
    
    # 生成测试文本
    test_text = """# 股票投资指南 📈

## 投资步骤：
1. **开户** - 选择证券公司 😊
2. **认证** - 完成实名认证 ⚡
3. **充值** - 存入资金 💰
4. **交易** - 开始买卖股票 📊

注意事项：
• 投资有风险 ⚠️
• 请谨慎操作 💡
• 建议学习相关知识 📚

【重要提示】请仔细阅读《用户协议》（第3条）和《风险提示》！！！

希望这些信息对您有帮助！ 🎉"""
    
    print(f"📝 测试文本长度: {len(test_text)} 字符")
    
    # 测试清理性能
    start_time = time.time()
    for _ in range(100):
        cleaned = text_cleaner.clean_for_tts(test_text)
    end_time = time.time()
    
    avg_time = (end_time - start_time) / 100 * 1000  # 转换为毫秒
    print(f"⏱️  平均清理时间: {avg_time:.2f} 毫秒")
    
    print(f"🧹 清理后文本:")
    print(f"   {cleaned}")

def main():
    """主函数"""
    print("🚀 文本清理服务测试")
    print("=" * 60)
    
    try:
        # 基础功能测试
        test_text_cleaner()
        
        # 句子分割测试
        test_sentence_splitting()
        
        # 性能测试
        test_performance()
        
        print("\n🎉 所有测试完成!")
        
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 