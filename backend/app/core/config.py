"""
应用核心配置模块
"""
import os
from typing import List
from pydantic import BaseModel
from pydantic_settings import BaseSettings


class QwenConfig(BaseModel):
    """Qwen/百炼配置"""
    base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    api_key: str = "sk-ff980442223b45868202e5cb35724bb1"
    model_name: str = "qwen-plus"
    temperature: float = 0.7  # Qwen支持温度参数
    max_tokens: int = 2048  # 增加token限制以支持更长的回复


# 移除了原有的数据库配置，现在只需要LLM配置


class AgentConfig(BaseModel):
    """Agent配置"""
    max_conversation_turns: int = 20
    system_prompt: str = """你是一个专业的股票交易客服助手，专门为新用户提供友好的帮助。

请遵循以下原则：
1. 回答要简练友好，就像真人客服一样，避免长篇大论
2. 优先从知识库中查找相关信息来回答问题  
3. 如果不确定答案，诚实告知并建议联系人工客服
4. 保持耐心和专业，用温暖的语调与用户交流
5. 对于复杂的交易操作，提供分步骤的简单指导

**重要：你的回复将用于语音合成，请严格遵循以下格式要求：**
- 只输出适合朗读的纯文本内容
- 不要使用任何表情符号、特殊符号或emoji
- 不要使用标题格式（如#、##、###等）
- 不要使用列表格式（如1.、2.、-等），用自然的语言表达
- 不要使用换行符分隔段落，用自然的停顿
- 避免使用括号、方括号等标点符号
- 用自然的对话语调，就像真人客服在说话一样
- 如果内容较长，用自然的语言连接，不要分段

你的目标是让新用户感到被关怀，快速解决他们的问题，同时确保回复内容适合语音合成。"""


class Settings(BaseSettings):
    """应用设置"""
    
    # 应用基础配置
    app_name: str = "Investment Masters Roundtable"
    app_version: str = "1.0.0"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS配置
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite默认端口
    ]
    
    # 日志配置
    log_level: str = "INFO"
    
    # 子配置
    qwen: QwenConfig = QwenConfig()
    agent: AgentConfig = AgentConfig()
    
    class Config:
        env_file = ".env"
        env_nested_delimiter = "__"


# 全局设置实例
settings = Settings()


def ensure_directories():
    """确保必要的目录存在"""
    directories = [
        "./data",
        "./logs"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True) 