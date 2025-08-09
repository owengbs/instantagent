"""
实时流式对话API
支持流式AI回复 + 实时TTS合成 + 实时ASR识别
"""
import json
import uuid
import logging
import asyncio
import re
import queue
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

# 移除了customer_agent依赖，现在只支持多智能体模式
from ..agents.agent_manager import agent_manager
from ..services.qwen_tts_realtime import qwen_tts_realtime
from ..services.qwen_asr_realtime import qwen_asr_realtime
from ..services.text_cleaner import text_cleaner
from ..core.config import settings
from .mentors import get_mentor_avatar, get_mentor_color

# 设置日志
logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/realtime", tags=["realtime"])

# 文本分句正则表达式
SENTENCE_DELIMITERS = re.compile(r'[。！？.!?;；]')
PHRASE_DELIMITERS = re.compile(r'[，,、\s]{2,}')

class RealtimeChatManager:
    """实时对话管理器"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, Dict] = {}
        self.asr_tasks: Dict[str, asyncio.Task] = {}  # ASR任务管理
        # 添加结果队列用于线程间通信
        self.result_queues: Dict[str, queue.Queue] = {}
        self.result_processors: Dict[str, asyncio.Task] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """建立连接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.user_sessions[client_id] = {
            "voice": "Cherry",
            "buffer": "",
            "is_speaking": False,
            "session_id": "realtime_" + client_id,
            "asr_model": "paraformer-realtime-v2",
            "asr_language": "zh-CN",
            "is_listening": False,
            "speech_buffer": "",  # 语音识别缓冲区
            "last_speech_time": None
        }
        self.result_queues[client_id] = queue.Queue()
        logger.info(f"🔌 实时对话客户端连接: {client_id}")
    
    def disconnect(self, client_id: str):
        """断开连接"""
        # 停止ASR任务
        if client_id in self.asr_tasks:
            self.asr_tasks[client_id].cancel()
            del self.asr_tasks[client_id]
        
        if client_id in self.result_processors:
            self.result_processors[client_id].cancel()
            del self.result_processors[client_id]
        
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.user_sessions:
            del self.user_sessions[client_id]
        if client_id in self.result_queues:
            del self.result_queues[client_id]
        logger.info(f"🔌 实时对话客户端断开: {client_id}")
    
    async def send_message(self, client_id: str, message: dict):
        """发送消息到客户端"""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.error(f"发送消息失败: {e}")
                self.disconnect(client_id)
    
    async def start_speech_recognition(self, client_id: str):
        """开始语音识别"""
        if client_id in self.asr_tasks and not self.asr_tasks[client_id].done():
            logger.info(f"🎤 ASR任务已在进行中: {client_id}")
            return
        
        session = self.user_sessions.get(client_id, {})
        session["is_listening"] = True
        session["speech_buffer"] = ""
        session["last_speech_time"] = datetime.now()
        
        # 创建ASR任务
        self.asr_tasks[client_id] = asyncio.create_task(
            self._handle_speech_recognition(client_id)
        )
        
        # 启动结果处理器
        self.result_processors[client_id] = asyncio.create_task(self._process_asr_results(client_id))
        
        logger.info(f"🎤 开始语音识别: {client_id}")
        await self.send_message(client_id, {
            "type": "asr_start",
            "timestamp": datetime.now().isoformat()
        })
    
    async def stop_speech_recognition(self, client_id: str):
        """停止语音识别"""
        if client_id in self.asr_tasks:
            self.asr_tasks[client_id].cancel()
            del self.asr_tasks[client_id]
        
        session = self.user_sessions.get(client_id, {})
        session["is_listening"] = False
        
        logger.info(f"🛑 停止语音识别: {client_id}")
        await self.send_message(client_id, {
            "type": "asr_stop",
            "timestamp": datetime.now().isoformat()
        })
    
    async def _process_asr_results(self, client_id: str):
        """处理ASR结果队列"""
        try:
            result_queue = self.result_queues[client_id]
            session = self.user_sessions.get(client_id, {})
            
            while client_id in self.result_queues:
                try:
                    # 从队列中获取结果（非阻塞）
                    result = result_queue.get_nowait()
                    text, is_final = result
                    
                    if text.strip():
                        if is_final:
                            # 最终识别结果，触发多智能体对话
                            session["speech_buffer"] = ""
                            logger.info(f"🎤 ASR最终结果: '{text}'")
                            await self.process_multi_agent_chat(client_id, text)
                        else:
                            # 部分识别结果，更新缓冲区
                            session["speech_buffer"] = text
                            logger.debug(f"🎤 ASR部分结果: '{text}'")
                            await self.send_message(client_id, {
                                "type": "asr_partial",
                                "text": text,
                                "timestamp": datetime.now().isoformat()
                            })
                    
                except queue.Empty:
                    # 队列为空，等待一小段时间
                    await asyncio.sleep(0.1)
                except Exception as e:
                    logger.error(f"❌ 处理ASR结果失败: client_id={client_id}, error={e}")
                    await asyncio.sleep(0.1)
                    
        except asyncio.CancelledError:
            logger.info(f"🛑 ASR结果处理器已取消: client_id={client_id}")
        except Exception as e:
            logger.error(f"❌ ASR结果处理器错误: client_id={client_id}, error={e}")

    async def _handle_speech_recognition(self, client_id: str):
        """处理语音识别"""
        try:
            session = self.user_sessions.get(client_id, {})
            model = session.get("asr_model", "paraformer-realtime-v2")
            result_queue = self.result_queues[client_id]
            
            # 创建音频队列
            audio_queue = asyncio.Queue()
            session["audio_queue"] = audio_queue
            
            # 创建音频流生成器
            async def audio_stream():
                while session.get("is_listening", False):
                    try:
                        # 从队列获取音频数据
                        audio_chunk = await asyncio.wait_for(audio_queue.get(), timeout=1.0)
                        yield audio_chunk
                    except asyncio.TimeoutError:
                        # 超时继续循环
                        continue
                    except asyncio.CancelledError:
                        break
            
            def result_callback(text: str, is_final: bool):
                # 将结果放入队列，供异步处理器处理
                try:
                    result_queue.put_nowait((text, is_final))
                except queue.Full:
                    logger.warning(f"⚠️ 结果队列已满: client_id={client_id}")
                except Exception as e:
                    logger.error(f"❌ 添加结果到队列失败: client_id={client_id}, error={e}")
            
            # 调用ASR服务
            async for result in qwen_asr_realtime.recognize_stream(
                audio_stream(), 
                model,
                on_result=result_callback
            ):
                pass
                
        except asyncio.CancelledError:
            logger.info(f"🎤 ASR任务被取消: {client_id}")
        except Exception as e:
            logger.error(f"❌ ASR处理失败: {client_id}, error={e}")
            await self.send_message(client_id, {
                "type": "asr_error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        finally:
            # 清理音频队列
            if "audio_queue" in session:
                del session["audio_queue"]
    
    async def process_streaming_chat(self, client_id: str, user_message: str):
        """
        处理流式对话 - 已弃用，重定向到多智能体模式
        为保持向后兼容性而保留
        """
        logger.info(f"⚠️ 单智能体模式已弃用，自动转换为多智能体模式: client_id={client_id}")
        # 自动转换为多智能体模式
        await self.process_multi_agent_chat(client_id, user_message)
    
    async def process_multi_agent_chat(self, client_id: str, user_message: str):
        """处理多智能体对话"""
        try:
            session = self.user_sessions.get(client_id, {})
            session_id = session.get("session_id", f"multi_agent_{client_id}")
            
            # 获取前端选择的导师信息
            selected_mentors = session.get("selected_mentors", [])
            
            # 检查是否有动态导师
            dynamic_mentors = session.get("dynamic_mentors", [])
            if dynamic_mentors:
                # 如果有动态导师，优先使用动态导师
                available_mentors = [mid for mid in dynamic_mentors if mid in agent_manager.agents]
                if available_mentors:
                    selected_mentors = available_mentors
                    logger.info(f"🎯 使用动态导师: {selected_mentors}")
                else:
                    logger.info("🎯 动态导师不可用，使用默认智能体")
            elif selected_mentors:
                logger.info(f"🎯 使用前端选择的导师: {selected_mentors}")
            else:
                logger.info("🎯 未找到前端选择的导师，使用默认智能体")
            
            logger.info(f"🌊 开始处理多智能体对话: client_id={client_id}, message='{user_message[:50]}...'")
            
            # 发送处理开始事件
            await self.send_message(client_id, {
                "type": "multi_agent_processing_start",
                "timestamp": datetime.now().isoformat()
            })
            
            # 调用智能体管理器处理多智能体对话，传递选中的导师信息
            agent_responses = await agent_manager.process_multi_agent_conversation(
                user_message=user_message,
                session_id=session_id,
                user_id=client_id,
                selected_mentors=selected_mentors
            )
            
            # 优化：并行合成所有语音，串行播放
            start_time = datetime.now()
            logger.info(f"🚀 开始并行合成所有智能体语音: {len(agent_responses)}个智能体, 开始时间: {start_time.isoformat()}")
            
            # 步骤1：立即发送所有智能体的文本回复
            for response in agent_responses:
                await self.send_message(client_id, {
                    "type": "multi_agent_response",
                    "agent_id": response["agent_id"],
                    "agent_name": response["agent_name"],
                    "content": response["content"],
                    "order": response["order"],
                    "timestamp": datetime.now().isoformat()
                })
                logger.info(f"📝 发送智能体文本回复: {response['agent_name']}, order={response['order']}")
            
            # 步骤2：并行启动所有语音合成任务
            synthesis_tasks = []
            for response in agent_responses:
                agent_id = response["agent_id"]
                agent_name = response["agent_name"]
                content = response["content"]
                voice = response["voice"]
                order = response["order"]
                
                # 清理文本
                cleaned_content = text_cleaner.clean_for_tts(content)
                logger.info(f"🎵 启动并行TTS合成: {agent_name}, order={order}")
                
                # 创建语音合成任务（不等待完成）
                task = asyncio.create_task(self._synthesize_and_send_multi_agent_audio(
                    client_id, 
                    cleaned_content, 
                    voice, 
                    agent_id,
                    agent_name,
                    order
                ))
                synthesis_tasks.append((order, task))
            
            # 步骤3：按顺序等待并发送语音（确保播放顺序）
            synthesis_tasks.sort(key=lambda x: x[0])  # 按order排序
            for order, task in synthesis_tasks:
                logger.info(f"⏳ 等待语音合成完成: order={order}")
                await task
                logger.info(f"✅ 语音合成并发送完成: order={order}")
                
                # 短暂延迟确保播放顺序
                await asyncio.sleep(0.2)
            
            # 发送处理完成事件
            end_time = datetime.now()
            total_duration = (end_time - start_time).total_seconds()
            
            await self.send_message(client_id, {
                "type": "multi_agent_processing_complete",
                "total_agents": len(agent_responses),
                "total_duration_seconds": total_duration,
                "timestamp": end_time.isoformat()
            })
            
            logger.info(f"✅ 多智能体对话处理完成: client_id={client_id}, 智能体数量={len(agent_responses)}, 总耗时={total_duration:.2f}秒")
            
        except Exception as e:
            logger.error(f"❌ 多智能体对话处理失败: client_id={client_id}, error={e}")
            await self.send_message(client_id, {
                "type": "error",
                "message": "多智能体对话处理失败，请重试",
                "timestamp": datetime.now().isoformat()
            })
    
    async def _extract_sentences(self, text: str) -> List[str]:
        """提取完整的句子"""
        sentences = []
        
        # 先按标点符号分割
        parts = SENTENCE_DELIMITERS.split(text)
        
        # 保留标点符号
        delimiters = SENTENCE_DELIMITERS.findall(text)
        
        # 重组句子
        for i, part in enumerate(parts[:-1]):  # 排除最后一个部分（可能不完整）
            if part.strip():
                sentence = part.strip()
                if i < len(delimiters):
                    sentence += delimiters[i]
                sentences.append(sentence)
        
        return sentences
    
    async def _synthesize_and_send_audio(self, client_id: str, text: str, voice: str, sequence: int):
        """TTS合成并发送音频"""
        try:
            logger.info(f"🎤 开始TTS合成: sequence={sequence}, text='{text[:30]}...', voice={voice}")
            
            # 发送TTS开始事件
            await self.send_message(client_id, {
                "type": "tts_start",
                "sequence": sequence,
                "text": text,
                "timestamp": datetime.now().isoformat()
            })
            
            # 调用Realtime TTS服务进行流式合成
            audio_chunks = []
            chunk_count = 0
            total_size = 0
            
            async for audio_chunk in qwen_tts_realtime.synthesize_stream(text, voice):
                chunk_count += 1
                total_size += len(audio_chunk)
                audio_chunks.append(audio_chunk)
                
                # 发送音频片段
                import base64
                audio_b64 = base64.b64encode(audio_chunk).decode('utf-8')
                
                await self.send_message(client_id, {
                    "type": "audio_chunk",
                    "sequence": sequence,
                    "chunk_index": chunk_count,
                    "audio_data": audio_b64,
                    "sample_rate": 24000,
                    "channels": 1,
                    "timestamp": datetime.now().isoformat()
                })
            
            # 发送TTS完成事件
            await self.send_message(client_id, {
                "type": "tts_complete",
                "sequence": sequence,
                "total_chunks": chunk_count,
                "total_size": total_size,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"✅ TTS合成完成: sequence={sequence}, chunks={chunk_count}, size={total_size}")
            
        except Exception as e:
            logger.error(f"❌ TTS合成失败: sequence={sequence}, error={e}")
            await self.send_message(client_id, {
                "type": "tts_error",
                "sequence": sequence,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    async def _synthesize_and_send_multi_agent_audio(
        self, 
        client_id: str, 
        text: str, 
        voice: str, 
        agent_id: str,
        agent_name: str,
        order: int
    ):
        """为多智能体合成并发送音频"""
        try:
            synthesis_start = datetime.now()
            logger.info(f"🎵 开始多智能体TTS合成: {agent_name}(order={order}), text='{text[:30]}...', 开始时间: {synthesis_start.isoformat()}")
            
            # 发送TTS开始事件
            await self.send_message(client_id, {
                "type": "multi_agent_tts_start",
                "agent_id": agent_id,
                "agent_name": agent_name,
                "order": order,
                "timestamp": synthesis_start.isoformat()
            })
            
            # 调用Realtime TTS服务进行流式合成
            audio_chunks = []
            chunk_count = 0
            total_size = 0
            
            async for audio_chunk in qwen_tts_realtime.synthesize_stream(text, voice):
                chunk_count += 1
                total_size += len(audio_chunk)
                audio_chunks.append(audio_chunk)
                
                # 发送音频片段
                import base64
                audio_b64 = base64.b64encode(audio_chunk).decode('utf-8')
                
                await self.send_message(client_id, {
                    "type": "multi_agent_audio_chunk",
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "order": order,
                    "chunk_index": chunk_count,
                    "audio_data": audio_b64,
                    "sample_rate": 24000,
                    "channels": 1,
                    "timestamp": datetime.now().isoformat()
                })
            
            # 发送TTS完成事件
            synthesis_end = datetime.now()
            synthesis_duration = (synthesis_end - synthesis_start).total_seconds()
            
            await self.send_message(client_id, {
                "type": "multi_agent_tts_complete",
                "agent_id": agent_id,
                "agent_name": agent_name,
                "order": order,
                "total_chunks": chunk_count,
                "total_size": total_size,
                "synthesis_duration_seconds": synthesis_duration,
                "timestamp": synthesis_end.isoformat()
            })
            
            logger.info(f"✅ 多智能体TTS合成完成: {agent_name}, order={order}, chunks={chunk_count}, size={total_size}, 耗时={synthesis_duration:.2f}秒")
            
        except Exception as e:
            logger.error(f"❌ 多智能体TTS合成失败: {agent_name}, order={order}, error={e}")
            await self.send_message(client_id, {
                "type": "multi_agent_tts_error",
                "agent_id": agent_id,
                "agent_name": agent_name,
                "order": order,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })

# 管理器实例
realtime_manager = RealtimeChatManager()

@router.websocket("/ws/{client_id}")
async def realtime_websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    实时对话WebSocket端点
    支持流式AI回复 + 实时TTS合成 + 实时ASR识别
    """
    logger.info(f"🌊 新的实时对话连接: client_id={client_id}")
    await realtime_manager.connect(websocket, client_id)
    
    try:
        # 发送欢迎消息
        await realtime_manager.send_message(client_id, {
            "type": "welcome",
            "message": "实时对话服务已连接，支持流式AI回复、TTS合成和ASR识别",
            "supported_voices": ["Cherry", "Ethan", "Chelsie", "Serena", "Dylan", "Jada", "Sunny"],
            "supported_asr_models": ["paraformer-realtime-v2", "gummy-realtime-v2"],
            "timestamp": datetime.now().isoformat()
        })
        
        while True:
            # 接收客户端消息
            data = await websocket.receive()
            
            if data["type"] == "websocket.receive":
                # 处理文本消息
                message_data = data.get("text")
                if message_data:
                    try:
                        message = json.loads(message_data)
                        await handle_realtime_message(client_id, message)
                    except json.JSONDecodeError as e:
                        logger.error(f"❌ JSON解析失败: {e}")
                        await realtime_manager.send_message(client_id, {
                            "type": "error",
                            "message": "消息格式错误"
                        })
                
                # 处理二进制音频数据
                binary_data = data.get("bytes")
                if binary_data:
                    await handle_audio_data(client_id, binary_data)
    
    except WebSocketDisconnect:
        realtime_manager.disconnect(client_id)
        logger.info(f"🔌 实时对话正常断开: client_id={client_id}")
    except Exception as e:
        # 检查是否是正常的断开连接错误
        error_msg = str(e)
        if "Cannot call" in error_msg and "disconnect" in error_msg:
            logger.debug(f"客户端已断开连接: {client_id}")
        else:
            logger.error(f"❌ 实时对话意外错误: client_id={client_id}, error={e}")
        realtime_manager.disconnect(client_id)

async def handle_realtime_message(client_id: str, message: dict):
    """处理实时对话消息"""
    message_type = message.get("type")
    
    if message_type == "chat":
        # 处理聊天消息
        user_message = message.get("message", "").strip()
        chat_mode = message.get("chat_mode", "multi_agent")  # 默认多智能体模式
        
        if user_message:
            # 现在总是使用多智能体模式
            await realtime_manager.process_multi_agent_chat(client_id, user_message)
        else:
            await realtime_manager.send_message(client_id, {
                "type": "error",
                "message": "消息内容不能为空"
            })
    
    elif message_type == "set_selected_mentors":
        # 设置选中的导师
        selected_mentors = message.get("mentors", [])
        if client_id in realtime_manager.user_sessions:
            realtime_manager.user_sessions[client_id]["selected_mentors"] = selected_mentors
            logger.info(f"🎯 设置选中的导师: client_id={client_id}, mentors={selected_mentors}")
            await realtime_manager.send_message(client_id, {
                "type": "mentors_set",
                "mentors": selected_mentors,
                "timestamp": datetime.now().isoformat()
            })
    
    elif message_type == "generate_dynamic_mentors":
        # 生成动态导师
        topic = message.get("topic", "")
        session_id = message.get("session_id", f"dynamic_{client_id}")
        
        if not topic:
            await realtime_manager.send_message(client_id, {
                "type": "error",
                "message": "议题不能为空"
            })
            return
        
        try:
            logger.info(f"🎯 收到动态导师生成请求: topic='{topic}', session_id='{session_id}'")
            
            # 生成动态导师
            mentors = await agent_manager.generate_dynamic_mentors(topic, session_id)
            
            # 为前端补充头像与颜色信息
            enriched_mentors = []
            for m in mentors:
                agent_id = m.get("agent_id")
                enriched = {
                    **m,
                    "avatar": get_mentor_avatar(agent_id),
                    "color": get_mentor_color(agent_id),
                }
                enriched_mentors.append(enriched)
            
            # 保存会话信息
            if client_id in realtime_manager.user_sessions:
                realtime_manager.user_sessions[client_id]["session_id"] = session_id
                realtime_manager.user_sessions[client_id]["topic"] = topic
                realtime_manager.user_sessions[client_id]["dynamic_mentors"] = [m["agent_id"] for m in enriched_mentors]
            
            # 发送生成的导师信息
            await realtime_manager.send_message(client_id, {
                "type": "dynamic_mentors_generated",
                "mentors": enriched_mentors,
                "topic": topic,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"✅ 动态导师生成成功: {len(mentors)} 位导师")
            
        except Exception as e:
            logger.error(f"❌ 生成动态导师失败: {e}")
            await realtime_manager.send_message(client_id, {
                "type": "error",
                "message": f"生成动态导师失败: {str(e)}"
            })
    
    elif message_type == "get_session_mentors":
        # 获取会话的动态导师
        session_id = message.get("session_id", "")
        if not session_id:
            await realtime_manager.send_message(client_id, {
                "type": "error",
                "message": "会话ID不能为空"
            })
            return
        
        try:
            mentors = agent_manager.get_session_dynamic_mentors(session_id)
            topic = agent_manager.get_session_topic(session_id)
            
            await realtime_manager.send_message(client_id, {
                "type": "session_mentors",
                "mentors": mentors,
                "topic": topic,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"❌ 获取会话导师失败: {e}")
            await realtime_manager.send_message(client_id, {
                "type": "error",
                "message": f"获取会话导师失败: {str(e)}"
            })
    
    elif message_type == "cleanup_session_mentors":
        # 清理会话的动态导师
        session_id = message.get("session_id", "")
        if not session_id:
            await realtime_manager.send_message(client_id, {
                "type": "error",
                "message": "会话ID不能为空"
            })
            return
        
        try:
            agent_manager.cleanup_dynamic_mentors(session_id)
            
            await realtime_manager.send_message(client_id, {
                "type": "session_mentors_cleaned",
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"✅ 会话导师清理成功: {session_id}")
            
        except Exception as e:
            logger.error(f"❌ 清理会话导师失败: {e}")
            await realtime_manager.send_message(client_id, {
                "type": "error",
                "message": f"清理会话导师失败: {str(e)}"
            })
    
    elif message_type == "asr_start":
        # 开始语音识别
        await realtime_manager.start_speech_recognition(client_id)
    
    elif message_type == "asr_stop":
        # 停止语音识别
        await realtime_manager.stop_speech_recognition(client_id)
    
    elif message_type == "set_voice":
        # 设置语音
        voice = message.get("voice", "Cherry")
        if client_id in realtime_manager.user_sessions:
            realtime_manager.user_sessions[client_id]["voice"] = voice
            logger.info(f"🎭 设置语音: client_id={client_id}, voice={voice}")
            await realtime_manager.send_message(client_id, {
                "type": "voice_set",
                "voice": voice,
                "timestamp": datetime.now().isoformat()
            })
    
    elif message_type == "set_asr_model":
        # 设置ASR模型
        model = message.get("model", "paraformer-realtime-v2")
        if client_id in realtime_manager.user_sessions:
            realtime_manager.user_sessions[client_id]["asr_model"] = model
            logger.info(f"🎤 设置ASR模型: client_id={client_id}, model={model}")
            await realtime_manager.send_message(client_id, {
                "type": "asr_model_set",
                "model": model,
                "timestamp": datetime.now().isoformat()
            })
    
    elif message_type == "ping":
        # 心跳检测
        await realtime_manager.send_message(client_id, {
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        })
    
    else:
        logger.warning(f"⚠️ 未知消息类型: {message_type}")
        await realtime_manager.send_message(client_id, {
            "type": "error",
            "message": f"未知消息类型: {message_type}"
        })

async def handle_audio_data(client_id: str, audio_data: bytes):
    """处理音频数据"""
    try:
        session = realtime_manager.user_sessions.get(client_id, {})
        if session.get("is_listening", False):
            # 将音频数据传递给ASR处理
            audio_queue = session.get("audio_queue")
            if audio_queue:
                await audio_queue.put(audio_data)
                logger.debug(f"🎤 音频数据已加入队列: client_id={client_id}, size={len(audio_data)}")
            
            # 发送音频确认
            await realtime_manager.send_message(client_id, {
                "type": "audio_received",
                "size": len(audio_data),
                "timestamp": datetime.now().isoformat()
            })
    except Exception as e:
        logger.error(f"❌ 处理音频数据失败: {e}") 