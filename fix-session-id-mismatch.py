#!/usr/bin/env python3
"""
修复会话ID不匹配问题
"""

import re
from datetime import datetime

def analyze_session_id(session_id: str):
    """分析会话ID格式"""
    print(f"🔍 分析会话ID: {session_id}")
    
    # 检查是否为UUID格式
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    if re.match(uuid_pattern, session_id):
        print(f"   ✅ 格式: 纯UUID")
        return "uuid_only"
    
    # 检查是否为完整格式: UUID_msg_timestamp_suffix
    full_pattern = r'^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_msg_(\d+)_([a-zA-Z0-9]+)$'
    match = re.match(full_pattern, session_id)
    if match:
        uuid_part = match.group(1)
        timestamp = match.group(2)
        suffix = match.group(3)
        
        print(f"   ✅ 格式: 完整格式")
        print(f"      UUID: {uuid_part}")
        print(f"      时间戳: {timestamp}")
        print(f"      后缀: {suffix}")
        
        # 尝试解析时间戳
        try:
            dt = datetime.fromtimestamp(int(timestamp) / 1000)
            print(f"      时间: {dt.strftime('%Y-%m-%d %H:%M:%S')}")
        except:
            print(f"      时间: 无法解析")
        
        return "full_format"
    
    # 检查是否为其他格式
    if '_' in session_id:
        parts = session_id.split('_')
        print(f"   ⚠️  格式: 包含下划线，但格式不标准")
        print(f"      部分: {parts}")
        return "partial_format"
    
    print(f"   ❌ 格式: 未知格式")
    return "unknown"

def suggest_fix(session_id: str, format_type: str):
    """建议修复方法"""
    print(f"\n🔧 修复建议:")
    
    if format_type == "uuid_only":
        print(f"   • 当前是纯UUID格式，可能需要添加后缀")
        print(f"   • 建议格式: {session_id}_msg_{int(datetime.now().timestamp() * 1000)}_suffix")
    
    elif format_type == "full_format":
        print(f"   • 当前是完整格式，格式正确")
        print(f"   • 检查后端是否正确解析")
    
    elif format_type == "partial_format":
        print(f"   • 当前格式不完整，需要标准化")
        print(f"   • 建议使用完整格式")
    
    else:
        print(f"   • 格式完全未知，需要重新生成")
        print(f"   • 建议使用标准UUID格式")

def main():
    """主函数"""
    print("🔧 会话ID格式修复工具")
    print("=" * 50)
    
    # 测试用例
    test_session_ids = [
        "e0137179-d3ad-4648-89d0-a257b279837b_msg_1755051891758_etvwyfu58",  # 后端格式
        "1476caae-1ac7-44b4-86c4-5771e51d58c0_msg_1755052497428_hw4m9p8jn",  # 后端格式
        "e0137179-d3ad-4648-89d0-a257b279837b",  # 可能的纯UUID
        "test_session_123",  # 测试格式
        "invalid_format"     # 无效格式
    ]
    
    for session_id in test_session_ids:
        print(f"\n{'='*60}")
        format_type = analyze_session_id(session_id)
        suggest_fix(session_id, format_type)
    
    print(f"\n{'='*60}")
    print("💡 总结:")
    print("   1. 后端期望格式: UUID_msg_timestamp_suffix")
    print("   2. 前端需要传递完整的sessionId")
    print("   3. 检查localStorage中存储的dynamicSessionId格式")
    print("   4. 确保会话创建时使用正确的ID格式")

if __name__ == "__main__":
    main()
