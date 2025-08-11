#!/usr/bin/env python3
"""
多用户系统状态测试脚本
实时监控用户连接、会话和智能体状态
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, Any

from app.core.multi_user_manager import multi_user_manager
from app.agents.agent_manager import agent_manager

class MultiUserStatusMonitor:
    """多用户状态监控器"""
    
    def __init__(self):
        self.running = False
        
    def get_current_status(self) -> Dict[str, Any]:
        """获取当前系统状态"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "multi_user_manager": {
                "active_users": list(multi_user_manager.active_users),
                "total_connections": len(multi_user_manager.connections),
                "user_sessions_count": len(multi_user_manager.user_sessions),
                "user_agent_pools_count": len(multi_user_manager.user_agent_pools),
                "connection_details": {}
            },
            "global_agent_manager": {
                "total_agents": len(agent_manager.agents),
                "agent_list": list(agent_manager.agents.keys()),
                "conversation_sessions": len(agent_manager.conversation_sessions),
                "dynamic_mentors": len(agent_manager.dynamic_mentors)
            },
            "detailed_user_info": {}
        }
        
        # 连接详情
        for conn_id, ws in multi_user_manager.connections.items():
            user_info = multi_user_manager.connection_users.get(conn_id, {})
            status["multi_user_manager"]["connection_details"][conn_id] = {
                "user_id": user_info.get("user_id", "unknown"),
                "session_id": user_info.get("session_id", "unknown"),
                "websocket_state": str(ws.client_state) if hasattr(ws, 'client_state') else "unknown"
            }
        
        # 详细用户信息
        for user_id in multi_user_manager.active_users:
            user_sessions = multi_user_manager.user_sessions.get(user_id, {})
            user_agent_pool = multi_user_manager.user_agent_pools.get(user_id)
            
            status["detailed_user_info"][user_id] = {
                "sessions_count": len(user_sessions),
                "sessions": {
                    session_id: {
                        "topic": session.topic,
                        "is_active": session.is_active,
                        "message_count": len(session.messages),
                        "created_at": session.created_at,
                        "selected_mentors": session.selected_mentors,
                        "dynamic_mentors": session.dynamic_mentors
                    }
                    for session_id, session in user_sessions.items()
                },
                "agent_pool": {
                    "agents_count": len(user_agent_pool.agents) if user_agent_pool else 0,
                    "agent_list": list(user_agent_pool.agents.keys()) if user_agent_pool else [],
                    "dynamic_mentors_sessions": list(user_agent_pool.dynamic_mentors.keys()) if user_agent_pool else []
                } if user_agent_pool else None
            }
            
        return status
    
    def print_status(self):
        """打印当前状态"""
        status = self.get_current_status()
        
        print("\n" + "="*80)
        print(f"🔍 多用户系统状态监控 - {status['timestamp']}")
        print("="*80)
        
        # 系统概览
        mum = status["multi_user_manager"]
        gam = status["global_agent_manager"]
        
        print(f"📊 系统概览:")
        print(f"   活跃用户数: {len(mum['active_users'])}")
        print(f"   WebSocket连接数: {mum['total_connections']}")
        print(f"   用户会话总数: {mum['user_sessions_count']}")
        print(f"   用户智能体池数: {mum['user_agent_pools_count']}")
        print(f"   全局智能体数: {gam['total_agents']}")
        print(f"   全局对话会话数: {gam['conversation_sessions']}")
        
        # 活跃用户列表
        if mum['active_users']:
            print(f"\n👥 活跃用户列表:")
            for i, user_id in enumerate(mum['active_users'], 1):
                print(f"   {i}. {user_id}")
        
        # 连接详情
        if mum['connection_details']:
            print(f"\n🔌 WebSocket连接详情:")
            for conn_id, details in mum['connection_details'].items():
                print(f"   连接ID: {conn_id}")
                print(f"   └─ 用户ID: {details['user_id']}")
                print(f"   └─ 会话ID: {details['session_id']}")
                print(f"   └─ 连接状态: {details['websocket_state']}")
        
        # 详细用户信息
        if status['detailed_user_info']:
            print(f"\n📋 详细用户信息:")
            for user_id, info in status['detailed_user_info'].items():
                print(f"\n   👤 用户: {user_id}")
                print(f"   ├─ 会话数: {info['sessions_count']}")
                
                if info['sessions']:
                    print(f"   ├─ 会话列表:")
                    for session_id, session in info['sessions'].items():
                        print(f"   │  ├─ {session_id}")
                        print(f"   │  │  ├─ 主题: {session['topic'] or '无'}")
                        print(f"   │  │  ├─ 活跃: {session['is_active']}")
                        print(f"   │  │  ├─ 消息数: {session['message_count']}")
                        print(f"   │  │  ├─ 选择导师: {session['selected_mentors']}")
                        print(f"   │  │  └─ 动态导师: {session['dynamic_mentors']}")
                
                if info['agent_pool']:
                    pool = info['agent_pool']
                    print(f"   └─ 智能体池:")
                    print(f"      ├─ 智能体数: {pool['agents_count']}")
                    print(f"      ├─ 智能体列表: {pool['agent_list']}")
                    print(f"      └─ 动态导师会话: {pool['dynamic_mentors_sessions']}")
        
        # 全局智能体信息
        if gam['agent_list']:
            print(f"\n🤖 全局智能体列表:")
            for i, agent_id in enumerate(gam['agent_list'], 1):
                print(f"   {i}. {agent_id}")
        
        print("\n" + "="*80)
    
    def start_monitoring(self, interval: int = 5):
        """开始实时监控"""
        self.running = True
        print(f"🚀 开始多用户状态监控，刷新间隔: {interval}秒")
        print("按 Ctrl+C 停止监控")
        
        try:
            while self.running:
                self.print_status()
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n⏹️ 停止监控")
            self.running = False
    
    def save_status_to_file(self, filename: str = None):
        """保存状态到文件"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"multi_user_status_{timestamp}.json"
        
        status = self.get_current_status()
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(status, f, ensure_ascii=False, indent=2)
        
        print(f"📁 状态已保存到: {filename}")
        return filename

def main():
    """主函数"""
    monitor = MultiUserStatusMonitor()
    
    import sys
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "monitor":
            # 实时监控模式
            interval = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            monitor.start_monitoring(interval)
        elif command == "snapshot":
            # 快照模式
            monitor.print_status()
        elif command == "save":
            # 保存到文件
            filename = sys.argv[2] if len(sys.argv) > 2 else None
            monitor.save_status_to_file(filename)
        else:
            print("❌ 未知命令")
            print("使用方法:")
            print("  python test_multi_user_status.py snapshot     # 打印当前状态")
            print("  python test_multi_user_status.py monitor [间隔] # 实时监控")
            print("  python test_multi_user_status.py save [文件名]  # 保存到文件")
    else:
        # 默认打印当前状态
        monitor.print_status()

if __name__ == "__main__":
    main()
