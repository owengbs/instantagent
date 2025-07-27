#!/usr/bin/env python3
"""
日志查看工具
用于查看API调用日志
"""
import os
import sys
from pathlib import Path
from datetime import datetime
import argparse

def list_log_files():
    """列出所有日志文件"""
    log_dir = Path("./logs")
    if not log_dir.exists():
        print("❌ logs目录不存在")
        return []
    
    log_files = list(log_dir.glob("*.log"))
    return sorted(log_files, key=lambda x: x.stat().st_mtime, reverse=True)

def view_log_file(log_file: Path, lines: int = 50, follow: bool = False):
    """查看日志文件内容"""
    if not log_file.exists():
        print(f"❌ 日志文件不存在: {log_file}")
        return
    
    print(f"📄 查看日志文件: {log_file}")
    print(f"📊 文件大小: {log_file.stat().st_size / 1024:.1f} KB")
    print(f"📅 修改时间: {datetime.fromtimestamp(log_file.stat().st_mtime)}")
    print("=" * 80)
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            # 读取最后N行
            all_lines = f.readlines()
            if lines > 0:
                display_lines = all_lines[-lines:]
            else:
                display_lines = all_lines
            
            for line in display_lines:
                print(line.rstrip())
            
            if follow:
                print("\n🔄 实时跟踪日志 (按 Ctrl+C 停止)...")
                # 简单的文件跟踪
                while True:
                    new_lines = f.readlines()
                    if new_lines:
                        for line in new_lines:
                            print(line.rstrip())
                    import time
                    time.sleep(1)
                    
    except KeyboardInterrupt:
        print("\n⏹️  停止跟踪")
    except Exception as e:
        print(f"❌ 读取日志文件失败: {e}")

def search_logs(log_file: Path, keyword: str):
    """搜索日志中的关键词"""
    if not log_file.exists():
        print(f"❌ 日志文件不存在: {log_file}")
        return
    
    print(f"🔍 在 {log_file} 中搜索: '{keyword}'")
    print("=" * 80)
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                if keyword.lower() in line.lower():
                    print(f"{line_num:4d}: {line.rstrip()}")
    except Exception as e:
        print(f"❌ 搜索日志失败: {e}")

def show_api_stats(log_file: Path):
    """显示API调用统计"""
    if not log_file.exists():
        print(f"❌ 日志文件不存在: {log_file}")
        return
    
    print(f"📊 API调用统计 - {log_file}")
    print("=" * 80)
    
    stats = {
        "Qwen ASR": 0,
        "Qwen TTS": 0,
        "Qwen LLM": 0,
        "total_calls": 0,
        "total_errors": 0
    }
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                if "🚀 [QWEN] 调用" in line:
                    stats["total_calls"] += 1
                    if "ASR" in line:
                        stats["Qwen ASR"] += 1
                    elif "TTS" in line:
                        stats["Qwen TTS"] += 1
                    elif "LLM" in line:
                        stats["Qwen LLM"] += 1
                elif "❌ [QWEN]" in line:
                    stats["total_errors"] += 1
        
        print(f"📈 总调用次数: {stats['total_calls']}")
        print(f"🎤 ASR调用: {stats['Qwen ASR']}")
        print(f"🔊 TTS调用: {stats['Qwen TTS']}")
        print(f"🤖 LLM调用: {stats['Qwen LLM']}")
        print(f"❌ 错误次数: {stats['total_errors']}")
        
        if stats['total_calls'] > 0:
            success_rate = ((stats['total_calls'] - stats['total_errors']) / stats['total_calls']) * 100
            print(f"✅ 成功率: {success_rate:.1f}%")
            
    except Exception as e:
        print(f"❌ 统计日志失败: {e}")

def main():
    parser = argparse.ArgumentParser(description="日志查看工具")
    parser.add_argument("--list", action="store_true", help="列出所有日志文件")
    parser.add_argument("--file", type=str, help="指定日志文件")
    parser.add_argument("--lines", type=int, default=50, help="显示行数 (默认50, 0表示全部)")
    parser.add_argument("--follow", "-f", action="store_true", help="实时跟踪日志")
    parser.add_argument("--search", type=str, help="搜索关键词")
    parser.add_argument("--stats", action="store_true", help="显示API调用统计")
    
    args = parser.parse_args()
    
    if args.list:
        print("📁 可用的日志文件:")
        log_files = list_log_files()
        if log_files:
            for i, log_file in enumerate(log_files, 1):
                size = log_file.stat().st_size / 1024
                mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
                print(f"  {i}. {log_file.name} ({size:.1f} KB, {mtime})")
        else:
            print("  暂无日志文件")
        return
    
    # 确定要查看的日志文件
    if args.file:
        log_file = Path(args.file)
        if not log_file.is_absolute():
            log_file = Path("./logs") / log_file
    else:
        # 使用最新的日志文件
        log_files = list_log_files()
        if not log_files:
            print("❌ 没有找到日志文件")
            return
        log_file = log_files[0]
    
    if args.stats:
        show_api_stats(log_file)
    elif args.search:
        search_logs(log_file, args.search)
    else:
        view_log_file(log_file, args.lines, args.follow)

if __name__ == "__main__":
    main() 