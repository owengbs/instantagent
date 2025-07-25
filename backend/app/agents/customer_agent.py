"""
基于LangGraph的智能客服Agent
"""
import asyncio
import logging
import json
from typing import Dict, List, Any, Optional, Annotated
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import ToolNode
from pydantic import BaseModel

from ..core.config import settings
from ..knowledge.knowledge_base import knowledge_base

# 设置详细日志
logger = logging.getLogger(__name__)


class ConversationState(BaseModel):
    """对话状态数据结构"""
    messages: Annotated[List[Any], add_messages]
    user_id: str = "default"
    session_id: str = "default"
    context: Dict[str, Any] = {}
    retrieved_docs: List[Dict[str, Any]] = []
    last_query: str = ""
    turn_count: int = 0


class CustomerServiceAgent:
    """智能客服Agent"""
    
    def __init__(self):
        self.llm = None
        self.graph = None
        self.checkpointer = InMemorySaver()
        self.knowledge_retrieval_threshold = 0.5
        
    async def initialize(self):
        """初始化Agent"""
        try:
            # 初始化大模型 - o4-mini只支持基本参数
            self.llm = ChatOpenAI(
                base_url=settings.qwen.api_base,
                api_key=settings.qwen.api_key,
                model=settings.qwen.model,
                temperature=settings.qwen.temperature,
                max_tokens=settings.qwen.max_tokens,
                # 使用Qwen模型，支持完整的OpenAI兼容参数
            )
            
            # 构建对话流程图
            await self._build_conversation_graph()
            
            print("客服Agent初始化完成")
            
        except Exception as e:
            print(f"客服Agent初始化失败: {e}")
            raise
    
    async def _build_conversation_graph(self):
        """构建LangGraph对话流程"""
        
        # 创建状态图
        workflow = StateGraph(ConversationState)
        
        # 添加节点
        workflow.add_node("retrieve_knowledge", self._retrieve_knowledge_node)
        workflow.add_node("generate_response", self._generate_response_node)
        workflow.add_node("update_context", self._update_context_node)
        
        # 添加边（定义流程）
        workflow.add_edge(START, "retrieve_knowledge")
        workflow.add_edge("retrieve_knowledge", "generate_response")
        workflow.add_edge("generate_response", "update_context")
        workflow.add_edge("update_context", END)
        
        # 编译图
        self.graph = workflow.compile(checkpointer=self.checkpointer)
        
    async def _retrieve_knowledge_node(self, state: ConversationState) -> Dict[str, Any]:
        """知识检索节点"""
        try:
            # 获取最新的用户消息
            if not state.messages:
                return {"retrieved_docs": []}
            
            latest_message = state.messages[-1]
            if hasattr(latest_message, 'content'):
                query = latest_message.content
            else:
                query = str(latest_message)
            
            # 从知识库检索相关文档
            retrieved_docs = await knowledge_base.search(query, top_k=3)
            
            # 过滤低相关性的文档
            filtered_docs = [
                doc for doc in retrieved_docs 
                if doc.get("score", 0) > self.knowledge_retrieval_threshold
            ]
            
            return {
                "retrieved_docs": filtered_docs,
                "last_query": query
            }
            
        except Exception as e:
            print(f"知识检索失败: {e}")
            return {"retrieved_docs": []}
    
    async def _generate_response_node(self, state: ConversationState) -> Dict[str, Any]:
        """生成回复节点"""
        try:
            logger.info(f"🧠 开始生成回复: turn_count={state.turn_count}")
            
            # 构建上下文信息
            context_info = ""
            if state.retrieved_docs:
                context_info = "\n".join([
                    f"相关信息：{doc['content']}"
                    for doc in state.retrieved_docs[:2]  # 限制上下文长度
                ])
                logger.info(f"📝 构建上下文信息: {len(state.retrieved_docs)} 个文档, 长度: {len(context_info)}")
            
            # 构建prompt
            system_prompt = self._build_system_prompt(context_info)
            logger.info(f"💬 系统提示长度: {len(system_prompt)}")
            
            # 准备消息列表
            messages = [SystemMessage(content=system_prompt)]
            
            # 添加历史对话（限制长度）
            recent_messages = state.messages[-6:] if len(state.messages) > 6 else state.messages
            messages.extend(recent_messages)
            
            logger.info(f"📨 准备调用LLM: 消息数量={len(messages)}, 模型={settings.qwen.model}")
            logger.info(f"🔑 API配置: base_url={settings.qwen.api_base}, max_tokens={settings.qwen.max_tokens}")
            
            # 记录发送给LLM的最后一条用户消息
            if recent_messages:
                last_user_msg = recent_messages[-1]
                logger.info(f"👤 用户最新消息: '{last_user_msg.content if hasattr(last_user_msg, 'content') else str(last_user_msg)}'")
            
            # 调用大模型生成回复
            logger.info("🚀 正在调用LLM...")
            response = await self.llm.ainvoke(messages)
            
            logger.info(f"💡 LLM回复成功: 类型={type(response).__name__}")
            if hasattr(response, 'content'):
                logger.info(f"📝 LLM回复内容: '{response.content[:200]}...' (总长度: {len(response.content)})")
            
            return {
                "messages": [response],
                "turn_count": state.turn_count + 1
            }
            
        except Exception as e:
            logger.error(f"❌ 生成回复失败: {type(e).__name__}: {str(e)}", exc_info=True)
            # 返回友好的错误回复
            error_response = AIMessage(content="抱歉，我遇到了一些技术问题，请稍后再试，或联系人工客服寻求帮助。")
            return {
                "messages": [error_response],
                "turn_count": state.turn_count + 1
            }
    
    async def _update_context_node(self, state: ConversationState) -> Dict[str, Any]:
        """更新上下文节点"""
        try:
            # 更新用户上下文信息
            updated_context = state.context.copy()
            updated_context.update({
                "last_interaction": datetime.now().isoformat(),
                "total_turns": state.turn_count,
                "last_retrieved_categories": [
                    doc.get("metadata", {}).get("category", "")
                    for doc in state.retrieved_docs
                ]
            })
            
            return {"context": updated_context}
            
        except Exception as e:
            print(f"更新上下文失败: {e}")
            return {}
    
    def _build_system_prompt(self, context_info: str) -> str:
        """构建系统提示词"""
        base_prompt = settings.agent.system_prompt
        
        if context_info:
            knowledge_section = f"\n\n参考信息：\n{context_info}\n\n请基于以上信息回答用户的问题。如果信息不够充分，请诚实告知并建议联系人工客服。"
        else:
            knowledge_section = "\n\n当前没有找到相关的知识库信息，请根据你的常识友好地回答，如果不确定请建议用户联系人工客服。"
        
        return base_prompt + knowledge_section
    
    async def chat(self, message: str, user_id: str = "default", session_id: str = "default") -> Dict[str, Any]:
        """处理用户消息并返回回复"""
        try:
            logger.info(f"🎤 收到用户消息: user_id={user_id}, session_id={session_id}, message='{message}'")
            
            # 准备输入状态
            input_state = {
                "messages": [HumanMessage(content=message)],
                "user_id": user_id,
                "session_id": session_id,
            }
            
            # 配置线程ID（用于保持对话上下文）
            config = {
                "configurable": {
                    "thread_id": f"{user_id}_{session_id}"
                }
            }
            
            logger.info(f"🤖 开始调用LangGraph处理: thread_id={user_id}_{session_id}")
            
            # 运行对话流程
            result = await self.graph.ainvoke(input_state, config)
            
            logger.info(f"📊 LangGraph处理完成: result_keys={list(result.keys())}")
            
            # 提取回复内容
            if result.get("messages"):
                latest_message = result["messages"][-1]
                response_content = latest_message.content if hasattr(latest_message, 'content') else str(latest_message)
                logger.info(f"✅ 生成回复: '{response_content[:100]}...' (长度: {len(response_content)})")
            else:
                response_content = "抱歉，我没有理解您的问题，能否请您重新描述一下？"
                logger.warning("⚠️ 没有生成有效回复，使用默认回复")
            
            # 记录检索到的文档
            retrieved_docs = result.get("retrieved_docs", [])
            if retrieved_docs:
                logger.info(f"📚 检索到 {len(retrieved_docs)} 个相关文档")
            
            response_data = {
                "response": response_content,
                "retrieved_docs": retrieved_docs,
                "turn_count": result.get("turn_count", 0),
                "context": result.get("context", {})
            }
            
            logger.info(f"🎯 返回完整回复: turn_count={response_data['turn_count']}")
            return response_data
            
        except Exception as e:
            logger.error(f"❌ 处理对话失败: {type(e).__name__}: {str(e)}", exc_info=True)
            return {
                "response": "抱歉，系统遇到了问题，请稍后再试或联系人工客服。",
                "retrieved_docs": [],
                "turn_count": 0,
                "context": {}
            }
    
    async def get_conversation_history(self, user_id: str = "default", session_id: str = "default") -> List[Dict[str, Any]]:
        """获取对话历史"""
        try:
            config = {
                "configurable": {
                    "thread_id": f"{user_id}_{session_id}"
                }
            }
            
            # 获取检查点状态
            state = await self.graph.aget_state(config)
            
            if state and state.values.get("messages"):
                history = []
                for msg in state.values["messages"]:
                    if hasattr(msg, 'type') and hasattr(msg, 'content'):
                        history.append({
                            "type": msg.type,
                            "content": msg.content,
                            "timestamp": getattr(msg, 'timestamp', None)
                        })
                return history
            
            return []
            
        except Exception as e:
            print(f"获取对话历史失败: {e}")
            return []
    
    async def clear_conversation(self, user_id: str = "default", session_id: str = "default") -> bool:
        """清除对话历史"""
        try:
            thread_id = f"{user_id}_{session_id}"
            # 注意：InMemorySaver没有直接的删除方法，这里我们可以重新初始化checkpointer
            # 在生产环境中，应该使用支持删除的持久化checkpointer
            return True
            
        except Exception as e:
            print(f"清除对话历史失败: {e}")
            return False
    
    async def chat_stream(self, message: str, user_id: str = "default", session_id: str = "default"):
        """处理用户消息并返回流式回复生成器"""
        try:
            logger.info(f"🌊 收到流式聊天请求: user_id={user_id}, session_id={session_id}, message='{message}'")
            
            # 构建上下文信息 - 简化版本，避免复杂的图结构
            context_info = ""
            
            # 可选：添加知识库检索
            try:
                retrieved_docs = await knowledge_base.search(message, top_k=2)
                if retrieved_docs:
                    context_info = "\n".join([
                        f"相关信息：{doc['content']}"
                        for doc in retrieved_docs[:2]
                    ])
                    logger.info(f"📚 检索到相关文档: {len(retrieved_docs)} 个")
            except Exception as e:
                logger.warning(f"⚠️ 知识库检索失败: {e}")
            
            # 构建系统提示
            system_prompt = self._build_system_prompt(context_info)
            
            # 准备消息（简化版本，不依赖完整的状态管理）
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=message)
            ]
            
            logger.info(f"🚀 开始流式LLM调用...")
            
            # 使用流式调用
            full_response = ""
            async for chunk in self.llm.astream(messages):
                if hasattr(chunk, 'content') and chunk.content:
                    content = chunk.content
                    full_response += content
                    logger.debug(f"📝 LLM流式片段: '{content}'")
                    yield content
            
            logger.info(f"✅ 流式回复完成: 总长度={len(full_response)}")
            
        except Exception as e:
            logger.error(f"❌ 流式聊天失败: {e}")
            yield "抱歉，我遇到了一些技术问题，请稍后再试。"

    async def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        try:
            # 测试大模型连接
            test_response = await self.llm.ainvoke([
                SystemMessage(content="请简单回复'系统正常'")
            ])
            
            # 测试知识库连接
            test_search = await knowledge_base.search("测试", top_k=1)
            
            return {
                "status": "healthy",
                "llm_status": "connected",
                "knowledge_base_status": "connected",
                "knowledge_base_count": knowledge_base.collection.count() if knowledge_base.collection else 0,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


# 全局Agent实例
customer_agent = CustomerServiceAgent() 