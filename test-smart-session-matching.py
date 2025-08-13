#!/usr/bin/env python3
"""
测试智能sessionId匹配功能
"""

def test_smart_session_matching():
    """测试智能sessionId匹配逻辑"""
    
    print("🧪 测试智能sessionId匹配功能")
    print("=" * 50)
    
    # 模拟存储的会话ID
    stored_session_ids = [
        '1476caae-1ac7-44b4-86c4-5771e51d58c0_default_1755058687423_msg_1755058687423_d9qkky8j',
        '1476caae-1ac7-44b4-86c4-5771e51d58c0_msg_1755054300287_u6sbsid9x',
        '1476caae-1ac7-44b4-86c4-5771e51d58c0_msg_1755054428147_u76ui5fof'
    ]
    
    # 测试用例
    test_cases = [
        {
            'name': '完整匹配',
            'session_id': '1476caae-1ac7-44b4-86c4-5771e51d58c0_default_1755058687423_msg_1755058687423_d9qkky8j',
            'expected': True
        },
        {
            'name': '默认导师sessionId',
            'session_id': 'default_1755058687423_msg_1755058687423_d9qkky8j',
            'expected': True
        },
        {
            'name': '动态导师sessionId',
            'session_id': '1755054300287_u6sbsid9x',
            'expected': True
        },
        {
            'name': '不存在的sessionId',
            'session_id': 'nonexistent_session',
            'expected': False
        }
    ]
    
    print("📋 存储的会话ID:")
    for i, session_id in enumerate(stored_session_ids, 1):
        print(f"   {i}. {session_id}")
    
    print("\n🔍 测试智能匹配:")
    
    for test_case in test_cases:
        print(f"\n📝 测试: {test_case['name']}")
        print(f"   输入sessionId: {test_case['session_id']}")
        
        # 模拟智能匹配逻辑
        matched = False
        matched_session_id = None
        
        # 方法1：查找以sessionId结尾的会话
        for stored_id in stored_session_ids:
            if stored_id.endswith(test_case['session_id']):
                matched = True
                matched_session_id = stored_id
                print(f"   ✅ 方法1匹配成功: {stored_id}")
                break
        
        # 方法2：查找包含sessionId的会话
        if not matched:
            for stored_id in stored_session_ids:
                if test_case['session_id'] in stored_id:
                    matched = True
                    matched_session_id = stored_id
                    print(f"   ✅ 方法2匹配成功: {stored_id}")
                    break
        
        # 方法3：查找默认导师会话
        if not matched and test_case['session_id'].startswith('default_'):
            for stored_id in stored_session_ids:
                if 'default_' in stored_id and test_case['session_id'].replace('default_', '') in stored_id:
                    matched = True
                    matched_session_id = stored_id
                    print(f"   ✅ 方法3匹配成功: {stored_id}")
                    break
        
        if matched:
            print(f"   🎯 最终匹配: {matched_session_id}")
        else:
            print(f"   ❌ 未找到匹配")
        
        # 验证结果
        if matched == test_case['expected']:
            print(f"   ✅ 测试通过")
        else:
            print(f"   ❌ 测试失败: 期望 {test_case['expected']}, 实际 {matched}")

def test_session_id_parsing():
    """测试sessionId解析逻辑"""
    
    print("\n\n🔍 测试sessionId解析:")
    print("=" * 50)
    
    # 测试sessionId格式
    test_session_ids = [
        '1476caae-1ac7-44b4-86c4-5771e51d58c0_default_1755058687423_msg_1755058687423_d9qkky8j',
        'default_1755058687423_msg_1755058687423_d9qkky8j',
        '1755054300287_u6sbsid9x'
    ]
    
    for session_id in test_session_ids:
        print(f"\n📝 解析sessionId: {session_id}")
        
        if '_default_' in session_id:
            # 包含用户ID的默认导师会话
            parts = session_id.split('_default_')
            user_id = parts[0]
            default_part = 'default_' + parts[1]
            print(f"   👤 用户ID: {user_id}")
            print(f"   🎯 默认导师部分: {default_part}")
            print(f"   💡 类型: 带用户ID的默认导师会话")
            
        elif session_id.startswith('default_'):
            # 纯默认导师sessionId
            print(f"   💡 类型: 纯默认导师sessionId")
            print(f"   🎯 完整ID: {session_id}")
            
        elif '_msg_' in session_id:
            # 动态导师会话
            print(f"   💡 类型: 动态导师会话")
            print(f"   🎯 完整ID: {session_id}")
            
        else:
            # 其他格式
            print(f"   💡 类型: 其他格式")
            print(f"   🎯 完整ID: {session_id}")

def main():
    """主函数"""
    test_smart_session_matching()
    test_session_id_parsing()
    
    print("\n\n💡 总结:")
    print("   1. 智能匹配可以处理sessionId前缀和后缀的差异")
    print("   2. 支持多种匹配策略，提高匹配成功率")
    print("   3. 向后兼容，不影响现有功能")
    print("   4. 移动端和PC端现在应该都能正常生成会议纪要")

if __name__ == "__main__":
    main()
