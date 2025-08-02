import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import { ChatContextType, ChatState, Message, UserPreferences } from '../types'
import { generateId, storage } from '../utils'

// 初始状态
const initialState: ChatState = {
  messages: [],
  isConnected: false,
  isTyping: false,
  connectionError: null,
  sessionId: generateId(),
  userId: 'default'
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

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = process.env.NODE_ENV === 'development' 
        ? 'localhost:8000' 
        : window.location.host
      const wsUrl = `${protocol}//${host}/api/realtime/ws/${state.sessionId}`

      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        dispatch({ type: 'SET_CONNECTED', payload: true })
        dispatch({ type: 'SET_ERROR', payload: null })
        console.log('WebSocket 连接已建立')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
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
              
              // 停止打字指示器
              dispatch({ type: 'SET_TYPING', payload: false })
              
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: generateId(),
                  type: data.agent_id as 'buffett' | 'soros',
                  content: data.content,
                  timestamp: data.timestamp || new Date().toISOString(),
                  agent_id: data.agent_id,
                  agent_name: data.agent_name,
                  order: data.order,
                  isMultiAgent: true,
                  agent: {
                    id: data.agent_id,
                    name: data.agent_name || '未知智能体',
                    description: data.agent_id === 'buffett' ? '价值投资大师' : '宏观投资大师',
                    color: data.agent_id === 'buffett' ? '#3B82F6' : '#10B981'
                  }
                }
              })
              
              // 触发语音回调
              if (onNewAIResponseRef.current && data.content) {
                console.log('🔊 触发多智能体语音合成回调:', {
                  agent: data.agent_name,
                  messageLength: data.content.length
                })
                onNewAIResponseRef.current(data.content)
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
    // 可以在这里调用 API 清空服务端的对话历史
  }, [])

  // 更新偏好设置
  const updatePreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)
    storage.set('chat_preferences', updated)
  }, [preferences])

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
    setOnNewAIResponse
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