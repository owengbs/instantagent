"""
简化的LLM客户端，用于投资大师智能体
替代原有的复杂客服系统
"""

import logging
from typing import AsyncGenerator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from ..core.config import settings

logger = logging.getLogger(__name__)


class SimpleLLMClient:
    """简化的LLM客户端，专门用于投资大师智能体"""
    
    def __init__(self):
        self.llm = None
        
    async def initialize(self):
        """初始化LLM客户端"""
        try:
            self.llm = ChatOpenAI(
                model=settings.qwen.model_name,
                api_key=settings.qwen.api_key,
                base_url=settings.qwen.base_url,
                temperature=settings.qwen.temperature,
                max_tokens=settings.qwen.max_tokens,
                streaming=True
            )
            logger.info("✅ LLM客户端初始化成功")
        except Exception as e:
            logger.error(f"❌ LLM客户端初始化失败: {e}")
            raise
    
    async def chat_stream(self, message: str) -> AsyncGenerator[str, None]:
        """
        流式聊天接口
        
        Args:
            message: 完整的提示词消息
            
        Yields:
            str: 流式响应的文本片段
        """
        try:
            if not self.llm:
                await self.initialize()
            
            # 创建消息
            messages = [HumanMessage(content=message)]
            
            # 流式调用
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    yield chunk.content
                    
        except Exception as e:
            logger.error(f"❌ LLM流式调用失败: {e}")
            yield f"抱歉，我现在无法回复。请稍后再试。"
    
    async def health_check(self) -> dict:
        """健康检查"""
        try:
            if not self.llm:
                return {"status": "uninitialized"}
                
            # 发送测试消息
            messages = [HumanMessage(content="Hello")]
            response = await self.llm.ainvoke(messages)
            
            return {
                "status": "healthy",
                "model": settings.qwen.model_name,
                "response_length": len(response.content) if response.content else 0
            }
        except Exception as e:
            logger.error(f"❌ LLM健康检查失败: {e}")
            return {
                "status": "unhealthy", 
                "error": str(e)
            }
    
    async def generate_response(self, system_prompt: str, user_message: str, temperature: float = 0.7, max_tokens: int = 500) -> str:
        """
        生成回复
        
        Args:
            system_prompt: 系统提示词
            user_message: 用户消息
            temperature: 温度参数
            max_tokens: 最大token数
            
        Returns:
            str: 生成的回复
        """
        try:
            if not self.llm:
                await self.initialize()
            
            # 构建完整消息
            full_message = f"{system_prompt}\n\n用户问题：{user_message}"
            messages = [HumanMessage(content=full_message)]
            
            # 调用LLM
            response = await self.llm.ainvoke(messages)
            
            return response.content if response.content else "抱歉，我现在无法回复。"
            
        except Exception as e:
            logger.error(f"❌ LLM生成回复失败: {e}")
            return "抱歉，我现在无法回复。请稍后再试。"


# 全局LLM客户端实例
llm_client = SimpleLLMClient()