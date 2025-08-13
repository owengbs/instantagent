#!/usr/bin/env python3
"""
会话ID调试脚本
帮助诊断前端和后端会话ID不匹配的问题
"""

import json
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s')
logger = logging.getLogger(__name__)

def debug_session_ids():
    """调试会话ID问题"""
    
    print("🔍 会话ID调试信息")
    print("=" * 50)
    
    # 模拟后端日志中的会话ID
    backend_session_ids = [
        'e0137179-d3ad-4648-89d0-a257b279837b_msg_1755051891758_etvwyfu58',
        '1476caae-1ac7-44b4-86c4-5771e51d58c0_msg_1755052497428_hw4m9p8jn'
    ]
    
    print(f"📋 后端会话ID列表:")
    for i, session_id in enumerate(backend_session_ids, 1):
        print(f"   {i}. {session_id}")
    
    print()
    
    # 分析会话ID格式
    print("🔍 会话ID格式分析:")
    for session_id in backend_session_ids:
        parts = session_id.split('_')
        if len(parts) >= 3:
            uuid_part = parts[0]
            timestamp_part = parts[1]
            suffix_part = parts[2]
            
            print(f"   📝 会话ID: {session_id}")
            print(f"      UUID部分: {uuid_part}")
            print(f"      时间戳: {timestamp_part}")
            print(f"      后缀: {suffix_part}")
            
            # 尝试解析时间戳
            try:
                timestamp = int(timestamp_part)
                dt = datetime.fromtimestamp(timestamp / 1000)
                print(f"      时间: {dt.strftime('%Y-%m-%d %H:%M:%S')}")
            except:
                print(f"      时间: 无法解析")
            print()
    
    print("💡 诊断建议:")
    print("   1. 检查前端传递的sessionId格式")
    print("   2. 确认sessionId是否包含完整的时间戳和后缀")
    print("   3. 验证localStorage中存储的dynamicSessionId")
    print("   4. 检查会话创建和消息存储的逻辑")
    
    print()
    print("🔧 修复建议:")
    print("   1. 在前端打印传递的sessionId")
    print("   2. 在后端打印接收到的sessionId")
    print("   3. 统一sessionId的生成和传递格式")
    print("   4. 添加sessionId验证和转换逻辑")

if __name__ == "__main__":
    debug_session_ids()
