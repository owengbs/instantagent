import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import { ChatContextType, ChatState, Message, UserPreferences } from '../types'
import { generateId, storage } from '../utils'
import { API_CONFIG } from '../config/api'
import { userManager } from '../utils/userManager'

// 获取或创建用户信息
const currentUser = userManager.getCurrentUser()

// 初始状态
const initialState: ChatState = {
  messages: [],
  isConnected: false,
  isTyping: false,
  connectionError: null,
  sessionId: generateId(),
  userId: currentUser.id
}

// 初始偏好设置
const initialPreferences: UserPreferences = {
  theme: 'light',
  fontSize: 'medium',
  soundEnabled: true,
  autoScroll: true,
  showTimestamps: false
}

// Action 类型
type ChatAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<Message> } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_MESSAGES'; payload: Message[] }

// Reducer
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload }
    
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload }
    
    case 'SET_ERROR':
      return { ...state, connectionError: action.payload }
    
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        messages: [...state.messages, action.payload] 
      }
    
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload.updates }
            : msg
        )
      }
    
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] }
    
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload }
    
    default:
      return state
  }
}

// Context
const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Provider
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const [preferences, setPreferences] = React.useState<UserPreferences>(() => {
    return storage.get('chat_preferences') || initialPreferences
  })

  // WebSocket 引用
  const wsRef = React.useRef<WebSocket | null>(null)
  
  // 语音回调引用
  const onNewAIResponseRef = useRef<((response: string) => void) | null>(null)
  
  // 语音队列管理 - 重构版本
  const speechQueueRef = useRef<Map<number, {content: string, agent?: string, audioData?: string, order: number, status: 'waiting' | 'ready' | 'playing' | 'completed' | 'error'}>>(new Map())
  const isSpeakingRef = useRef<boolean>(false)
  const currentPlayingOrderRef = useRef<number>(1)
  const audioBufferRef = useRef<Map<string, {chunks: Array<string>, order: number, agent_name: string}>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const retryCountRef = useRef<Map<number, number>>(new Map())
  const MAX_RETRY_COUNT = 3

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      // 使用用户管理器生成连接ID
      const user = userManager.getCurrentUser()
      const dynamicSessionId = localStorage.getItem('dynamicSessionId')
      const sessionId = dynamicSessionId || state.sessionId
      
      // 生成用户特定的连接ID
      const connectionId = userManager.generateConnectionId(sessionId)
      const wsUrl = API_CONFIG.endpoints.chatWs(connectionId)

      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        dispatch({ type: 'SET_CONNECTED', payload: true })
        dispatch({ type: 'SET_ERROR', payload: null })
        console.log('WebSocket 连接已建立')
        
        // 发送选中的导师信息到后端
        const selectedMentors = localStorage.getItem('selectedMentors')
        const dynamicSessionId = localStorage.getItem('dynamicSessionId')
        
        if (selectedMentors) {
          try {
            const mentors = JSON.parse(selectedMentors)
            const mentorIds = mentors.map((mentor: any) => mentor.id)
            console.log('🎯 发送选中的导师信息到后端:', mentorIds)
            console.log('📋 导师详细信息:', mentors.map((m: any) => ({ id: m.id, name: m.name })))
            
            // 检查是否为动态导师
            const isDynamic = mentors.some((m: any) => m.isDynamic)
            if (isDynamic && dynamicSessionId) {
              console.log('🎯 使用动态导师会话:', dynamicSessionId)
              // 对于动态导师，也需要发送导师ID
              wsRef.current?.send(JSON.stringify({
                type: 'set_selected_mentors',
                mentors: mentorIds
              }))
            } else {
              wsRef.current?.send(JSON.stringify({
                type: 'set_selected_mentors',
                mentors: mentorIds
              }))
            }
          } catch (error) {
            console.error('❌ 解析选中的导师信息失败:', error)
          }
        } else {
          console.log('⚠️ 未找到选中的导师信息')
        }
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log(`📨 WebSocket收到原始消息: type=${data.type}, agent_id=${data.agent_id || 'N/A'}, order=${data.order || 'N/A'}`)
          
          // 处理错误消息
          if (data.type === 'error') {
            console.error('❌ 后端错误:', data.message);
            
            // 如果是导师相关的错误，提示用户
            if (data.message && (data.message.includes('导师') || data.message.includes('智能体') || data.message.includes('不可用'))) {
              dispatch({ 
                type: 'ADD_MESSAGE', 
                payload: {
                  id: generateId(),
                  type: 'system',
                  content: '抱歉，所选导师暂时不可用。这可能是因为系统重启导致。请返回首页重新选择导师。',
                  timestamp: new Date().toISOString(),
                  isError: true
                }
              });
            }
            return;
          }
          
          switch (data.type) {
            case 'welcome':
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: generateId(),
                  type: 'assistant',
                  content: data.message,
                  timestamp: data.timestamp || new Date().toISOString()
                }
              })
              break
            
            case 'multi_agent_processing_start':
              dispatch({ type: 'SET_TYPING', payload: true })
              break
            
            case 'processing':
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: 'typing',
                  type: 'assistant',
                  content: data.message,
                  timestamp: data.timestamp || new Date().toISOString(),
                  isTyping: true
                }
              })
              break
            
            case 'response':
              console.log('🤖 收到AI回复:', data.message)
              
              // 移除打字指示器
              dispatch({
                type: 'SET_MESSAGES',
                payload: state.messages.filter(msg => msg.id !== 'typing')
              })
              
              // 添加回复
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: generateId(),
                  type: 'assistant',
                  content: data.message,
                  timestamp: data.timestamp || new Date().toISOString(),
                  retrievedDocs: data.retrieved_docs,
                  context: data.context
                }
              })
              
              // 触发语音回调
              if (onNewAIResponseRef.current && data.message) {
                console.log('🔊 触发语音合成回调:', {
                  hasCallback: !!onNewAIResponseRef.current,
                  messageLength: data.message.length,
                  messagePreview: data.message.slice(0, 50) + '...'
                })
                onNewAIResponseRef.current(data.message)
              } else {
                console.log('⚠️ 语音合成回调未设置或消息为空:', {
                  hasCallback: !!onNewAIResponseRef.current,
                  hasMessage: !!data.message
                })
              }
              break
            
            case 'multi_agent_response':
              console.log('🤖 收到多智能体回复:', data)
              console.log(`📊 智能体信息: ID=${data.agent_id}, Name=${data.agent_name}, Order=${data.order}`)
              console.log(`🔢 当前消息总数: ${state.messages.length}`)
              
              // 只有收到第一个回复时停止打字指示器
              if (data.order === 1) {
                dispatch({ type: 'SET_TYPING', payload: false })
                console.log('⏹️ 停止打字指示器 (第一个回复)')
              }
              
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: generateId(),
                  type: 'multi_agent_response', // 保持消息类型为multi_agent_response
                  content: data.content,
                  timestamp: data.timestamp || new Date().toISOString(),
                  agent_id: data.agent_id,
                  agent_name: data.agent_name,
                  order: data.order,
                  isMultiAgent: true,
                  agent: {
                    id: data.agent_id,
                    name: data.agent_name || '未知智能体',
                    description: data.agent_id === 'buffett' ? '价值投资大师' : 
                                data.agent_id === 'soros' ? '宏观投资大师' : 
                                data.agent_id === 'munger' ? '多元思维专家' :
                                data.agent_id === 'krugman' ? '宏观经济专家' : '投资导师',
                    color: data.agent_id === 'buffett' ? '#3B82F6' : 
                           data.agent_id === 'soros' ? '#10B981' : 
                           data.agent_id === 'munger' ? '#8B5CF6' :
                           data.agent_id === 'krugman' ? '#F59E0B' : '#6B7280'
                  }
                }
              })
              
              // 初始化语音队列条目为等待状态
              speechQueueRef.current.set(data.order, {
                content: data.content,
                agent: data.agent_name,
                order: data.order,
                status: 'waiting'
              })
              
              console.log('📝 收到多智能体文本，已加入语音队列等待音频数据...')
              break
            
            case 'multi_agent_audio_chunk':
              // 收集音频块
              const audioKey = `${data.agent_id}_${data.order}`
              const audioBuffer = audioBufferRef.current.get(audioKey) || {
                chunks: [] as string[],
                order: data.order,
                agent_name: data.agent_name
              }
              audioBuffer.chunks.push(data.audio_data as string)
              audioBufferRef.current.set(audioKey, audioBuffer)
              console.log(`🎵 收到音频块: ${data.agent_name}, chunk ${data.chunk_index}`)
              break
            
            case 'multi_agent_tts_complete':
              // TTS完成，将完整音频标记为就绪状态
              const completeAudioKey = `${data.agent_id}_${data.order}`
              const completeAudioBuffer = audioBufferRef.current.get(completeAudioKey)
              
              if (completeAudioBuffer) {
                // 合并所有音频块
                const fullAudioData = completeAudioBuffer.chunks.join('')
                console.log(`✅ TTS完成: ${data.agent_name}, order=${data.order}`)
                
                // 更新队列中对应条目的状态为ready
                const queueItem = speechQueueRef.current.get(data.order)
                if (queueItem) {
                  queueItem.audioData = fullAudioData
                  queueItem.status = 'ready'
                  speechQueueRef.current.set(data.order, queueItem)
                  
                  console.log(`🎵 音频就绪: ${data.agent_name}, order=${data.order}`)
                } else {
                  console.warn(`⚠️ 找不到order=${data.order}的队列条目`)
                }
                
                // 清理缓存
                audioBufferRef.current.delete(completeAudioKey)
                
                // 显示当前队列状态
                const queueStatus = Array.from(speechQueueRef.current.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([order, item]) => ({
                    order,
                    agent: item.agent,
                    status: item.status,
                    hasAudio: !!item.audioData
                  }))
                
                console.log(`📋 语音队列状态:`, queueStatus)
                
                // 触发顺序播放处理
                processSequentialSpeechQueue()
              }
              break
            
            case 'error':
              dispatch({ type: 'SET_ERROR', payload: data.message })
              break
          }
        } catch (error) {
          console.error('处理 WebSocket 消息失败:', error)
        }
      }

      wsRef.current.onclose = () => {
        dispatch({ type: 'SET_CONNECTED', payload: false })
        console.log('WebSocket 连接已关闭')
        
        // 自动重连（延迟 3 秒）
        setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            connect()
          }
        }, 3000)
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        dispatch({ type: 'SET_ERROR', payload: 'WebSocket 连接错误' })
      }

    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error)
      dispatch({ type: 'SET_ERROR', payload: '连接失败' })
    }
  }, [state.sessionId])

  // 断开连接
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    dispatch({ type: 'SET_CONNECTED', payload: false })
  }, [])

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    console.log('📨 ChatContext sendMessage 被调用:', content)
    
    if (!content.trim()) {
      console.log('⚠️ 空消息被忽略')
      return
    }

    // 重置语音队列状态（新对话开始）
    console.log('🔄 重置语音队列状态')
    speechQueueRef.current.clear()
    isSpeakingRef.current = false
    currentPlayingOrderRef.current = 1
    retryCountRef.current.clear()
    audioBufferRef.current.clear()

    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    }

    console.log('➕ 添加用户消息到聊天:', userMessage)
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage })

    // 通过 WebSocket 发送
    const wsState = wsRef.current?.readyState
    console.log('🔌 WebSocket 状态:', {
      state: wsState,
      isOpen: wsState === WebSocket.OPEN,
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED
    })

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageData = {
          type: "chat",
          message: content.trim(),
          user_id: state.userId,
          session_id: state.sessionId,
          chat_mode: "multi_agent"
        }
        console.log('📤 发送 WebSocket 消息:', messageData)
        console.log(`🆔 使用的 SessionID: ${state.sessionId}`)
        console.log(`🔗 WebSocket URL: ${wsRef.current?.url}`)
        wsRef.current.send(JSON.stringify(messageData))
        console.log('✅ WebSocket 消息发送成功')
      } catch (error) {
        console.error('❌ 发送消息失败:', error)
        dispatch({ type: 'SET_ERROR', payload: '发送消息失败' })
      }
    } else {
      console.log('🔄 WebSocket 未连接，尝试重连...')
      dispatch({ type: 'SET_ERROR', payload: '连接已断开，正在重新连接...' })
      connect() // 尝试重连
    }
  }, [state.userId, state.sessionId, connect])

  // 清空聊天
  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' })
    
    // 重置语音队列状态
    speechQueueRef.current.clear()
    isSpeakingRef.current = false
    currentPlayingOrderRef.current = 1
    retryCountRef.current.clear()
    audioBufferRef.current.clear()
    
    // 可以在这里调用 API 清空服务端的对话历史
  }, [])

  // 更新偏好设置
  const updatePreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)
    storage.set('chat_preferences', updated)
  }, [preferences])

  // 顺序播放语音队列 - 确保严格按order播放
  const processSequentialSpeechQueue = useCallback(() => {
    if (isSpeakingRef.current) {
      console.log('🎵 当前正在播放，等待播放完成...')
      return
    }
    
    // 检查当前应该播放的order
    const currentOrder = currentPlayingOrderRef.current
    const currentItem = speechQueueRef.current.get(currentOrder)
    
    if (!currentItem) {
      console.log(`🎵 没有找到order=${currentOrder}的语音`)
      return
    }
    
    if (currentItem.status === 'ready' && currentItem.audioData) {
      // 当前order的音频已就绪，可以播放
      console.log(`🎵 开始播放: ${currentItem.agent}, order=${currentOrder}`)
      
      currentItem.status = 'playing'
      speechQueueRef.current.set(currentOrder, currentItem)
      isSpeakingRef.current = true
      
      playAudioDataWithRetry(currentItem.audioData, currentOrder)
      
    } else if (currentItem.status === 'waiting') {
      console.log(`⏳ 等待order=${currentOrder}的音频准备就绪: ${currentItem.agent}`)
      
    } else if (currentItem.status === 'error') {
      console.log(`❌ order=${currentOrder}播放失败，跳到下一个`)
      markCurrentItemCompleted()
      
    } else {
      console.log(`🎵 order=${currentOrder}状态: ${currentItem.status}`)
    }
  }, [])
  
  // 标记当前项目为完成并移动到下一个
  const markCurrentItemCompleted = useCallback(() => {
    const currentOrder = currentPlayingOrderRef.current
    const currentItem = speechQueueRef.current.get(currentOrder)
    
    if (currentItem) {
      currentItem.status = 'completed'
      speechQueueRef.current.set(currentOrder, currentItem)
      console.log(`✅ 完成播放: ${currentItem.agent}, order=${currentOrder}`)
    }
    
    // 移动到下一个order
    currentPlayingOrderRef.current++
    isSpeakingRef.current = false
    
    // 继续处理下一个
    setTimeout(() => processSequentialSpeechQueue(), 100)
  }, [processSequentialSpeechQueue])
  
  // 注释：addToSpeechQueue 已移除，改为直接在multi_agent_tts_complete中处理
  
  // 带重试功能的音频播放
  const playAudioDataWithRetry = useCallback(async (base64AudioData: string, order: number) => {
    const maxRetries = retryCountRef.current.get(order) || 0
    
    try {
      await playAudioData(base64AudioData)
      // 播放成功，标记完成
      markCurrentItemCompleted()
      
    } catch (error) {
      console.error(`❌ order=${order}播放失败:`, error)
      
      if (maxRetries < MAX_RETRY_COUNT) {
        // 重试播放
        const newRetryCount = maxRetries + 1
        retryCountRef.current.set(order, newRetryCount)
        console.log(`🔄 重试播放order=${order}, 第${newRetryCount}次重试`)
        
        setTimeout(() => {
          isSpeakingRef.current = false
          playAudioDataWithRetry(base64AudioData, order)
        }, 1000 * newRetryCount) // 递增延迟
        
      } else {
        // 重试次数用完，标记为错误并跳过
        console.error(`❌ order=${order}播放失败，已达最大重试次数`)
        const currentItem = speechQueueRef.current.get(order)
        if (currentItem) {
          currentItem.status = 'error'
          speechQueueRef.current.set(order, currentItem)
        }
        
        isSpeakingRef.current = false
        markCurrentItemCompleted()
      }
    }
  }, [markCurrentItemCompleted])
  
  // 语音播放完成回调（保留兼容性）
  const onSpeechEnd = useCallback(() => {
    console.log('✅ 传统语音播放完成')
    markCurrentItemCompleted()
  }, [markCurrentItemCompleted])
  
  // 直接播放音频数据
  const playAudioData = useCallback(async (base64AudioData: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎵 开始播放预合成音频数据（PCM格式）')
        
        // 初始化AudioContext
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        
        const audioContext = audioContextRef.current
        
        // 确保AudioContext已恢复
        if (audioContext.state === 'suspended') {
          audioContext.resume()
        }
        
        // Base64 解码为 ArrayBuffer
        const binaryString = atob(base64AudioData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        // Qwen TTS 返回的是PCM数据，需要转换为AudioBuffer
        // 音频参数：24kHz, 16-bit, mono
        const sampleRate = 24000
        const numChannels = 1
        const bytesPerSample = 2 // 16-bit = 2 bytes
        
        // 计算采样点数量
        const numSamples = bytes.length / bytesPerSample
        
        if (numSamples === 0) {
          throw new Error('音频数据为空')
        }
        
        // 创建AudioBuffer
        const audioBuffer = audioContext.createBuffer(numChannels, numSamples, sampleRate)
        const channelData = audioBuffer.getChannelData(0)
        
        // 将16-bit PCM数据转换为浮点数 (-1.0 到 1.0)
        for (let i = 0; i < numSamples; i++) {
          const byteIndex = i * bytesPerSample
          // 读取16-bit little-endian
          const sample = (bytes[byteIndex + 1] << 8) | bytes[byteIndex]
          // 转换为有符号16-bit
          const signedSample = sample > 32767 ? sample - 65536 : sample
          // 归一化到 -1.0 到 1.0
          channelData[i] = signedSample / 32768.0
        }
        
        // 创建音频源
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        
        // 播放结束后的处理
        source.onended = () => {
          console.log('✅ 预合成音频播放完成')
          resolve()
        }
        
        // 开始播放
        source.start(0)
        console.log('🎵 预合成音频开始播放，采样数:', numSamples)
        
        // 设置播放超时（防止永久卡住）
        const timeout = Math.max(5000, (numSamples / sampleRate) * 1000 + 2000) // 音频长度 + 2秒缓冲
        setTimeout(() => {
          reject(new Error('音频播放超时'))
        }, timeout)
        
      } catch (error) {
        console.error('❌ 准备播放音频失败:', error)
        reject(error)
      }
    })
  }, [])

  // 设置新AI回复的回调
  const setOnNewAIResponse = useCallback((callback: (response: string) => void) => {
    onNewAIResponseRef.current = callback
  }, [])

  // 初始化连接
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [])

  // 监听消息变化以支持自动滚动
  useEffect(() => {
    if (preferences.autoScroll && state.messages.length > 0) {
      // 延迟一点时间以确保 DOM 更新
      setTimeout(() => {
        const chatContainer = document.querySelector('[data-chat-container]')
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight
        }
      }, 100)
    }
  }, [state.messages, preferences.autoScroll])

  const contextValue: ChatContextType = {
    state,
    sendMessage,
    clearChat,
    connect,
    disconnect,
    preferences,
    updatePreferences,
    onNewAIResponse: onNewAIResponseRef.current || undefined,
    setOnNewAIResponse,
    onSpeechEnd
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  )
}

// Hook
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
} 