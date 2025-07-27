"""
日志配置模块
配置详细的API调用日志输出
"""
import logging
import logging.handlers
import os
from datetime import datetime
from pathlib import Path

def setup_logging():
    """设置日志配置"""
    
    # 创建logs目录
    log_dir = Path("./logs")
    log_dir.mkdir(exist_ok=True)
    
    # 创建根日志记录器
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # 清除现有的处理器
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # 创建格式化器
    console_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s',
        datefmt='%H:%M:%S'
    )
    
    file_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)-25s | %(funcName)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # 控制台处理器 - 显示INFO及以上级别
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # 文件处理器 - 记录所有级别
    log_file = log_dir / f"api_calls_{datetime.now().strftime('%Y%m%d')}.log"
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # 设置特定模块的日志级别
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)
    logging.getLogger("websockets").setLevel(logging.WARNING)
    
    # 确保我们的API日志显示
    logging.getLogger("app.utils.logging_decorator").setLevel(logging.INFO)
    logging.getLogger("app.services.qwen_asr_realtime").setLevel(logging.INFO)
    logging.getLogger("app.services.qwen_tts_realtime").setLevel(logging.INFO)
    logging.getLogger("app.agents.customer_agent").setLevel(logging.INFO)
    
    print(f"📝 日志配置完成")
    print(f"   📄 控制台输出: INFO级别及以上")
    print(f"   📁 文件输出: {log_file}")
    print(f"   🔄 日志轮转: 10MB/文件，保留5个备份")
    print(f"   🎯 API调用日志: 详细记录所有Qwen接口调用")
    print()

def get_logger(name: str) -> logging.Logger:
    """获取指定名称的日志记录器"""
    return logging.getLogger(name) 