#!/usr/bin/env python3
"""
简单的多用户API测试
用于验证基本功能
"""

import requests
import json

def test_basic_apis():
    """测试基础API"""
    base_url = "http://localhost:8000"
    
    print("🧪 开始测试多用户API...")
    
    # 测试用户统计API
    try:
        response = requests.get(f"{base_url}/api/users/stats")
        if response.status_code == 200:
            data = response.json()
            print("✅ 用户统计API正常")
            print(f"   活跃用户数: {data['stats']['active_users']}")
            print(f"   总连接数: {data['stats']['active_connections']}")
        else:
            print(f"❌ 用户统计API失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 用户统计API异常: {e}")
    
    # 测试活跃用户API
    try:
        response = requests.get(f"{base_url}/api/users/active")
        if response.status_code == 200:
            data = response.json()
            print("✅ 活跃用户API正常")
            print(f"   用户列表: {data['active_users']}")
            print(f"   用户数量: {data['count']}")
        else:
            print(f"❌ 活跃用户API失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 活跃用户API异常: {e}")
    
    # 测试导师API
    try:
        response = requests.get(f"{base_url}/api/mentors/")
        if response.status_code == 200:
            data = response.json()
            print("✅ 导师API正常")
            print(f"   导师数量: {len(data['mentors'])}")
        else:
            print(f"❌ 导师API失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 导师API异常: {e}")
    
    print("\n🎯 API测试完成")

if __name__ == "__main__":
    test_basic_apis()
