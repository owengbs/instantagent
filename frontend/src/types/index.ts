// 智能体信息
export interface Agent {
  id: string
  name: string
  description: string
  avatar?: string
  color: string
}

// 消息类型
export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system' | 'error' | 'buffett' | 'soros' | 'multi_agent_response'
  content: string
  timestamp: string
  isTyping?: boolean
  retrievedDocs?: RetrievedDocument[]
  context?: Record<string, any>
  // 多智能体相关字段
  agent_id?: string
  agent_name?: string
  agent?: Agent
  isMultiAgent?: boolean
  order?: number
}

// 检索到的文档
export interface RetrievedDocument {
  content: string
  metadata: {
    title?: string
    category?: string
    source?: string
    chunk_index?: number
  }
  score: number
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: 'welcome' | 'response' | 'processing' | 'error'
  message: string
  retrieved_docs?: RetrievedDocument[]
  turn_count?: number
  context?: Record<string, any>
  timestamp: string
}

// 聊天状态
export interface ChatState {
  messages: Message[]
  isConnected: boolean
  isTyping: boolean
  connectionError: string | null
  sessionId: string
  userId: string
}

// API响应类型
export interface ChatResponse {
  response: string
  retrieved_docs: RetrievedDocument[]
  turn_count: number
  context: Record<string, any>
  timestamp: string
}

// 健康检查响应
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  llm_status?: string
  knowledge_base_status?: string
  knowledge_base_count?: number
  error?: string
  timestamp: string
}

// 系统统计信息
export interface SystemStats {
  active_websocket_connections: number
  system_health: HealthCheckResponse
  app_version: string
  timestamp: string
}

// 用户偏好设置
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  soundEnabled: boolean
  autoScroll: boolean
  showTimestamps: boolean
}

// 聊天上下文
export interface ChatContextType {
  state: ChatState
  sendMessage: (content: string) => Promise<void>
  clearChat: () => void
  connect: () => void
  disconnect: () => void
  preferences: UserPreferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  onNewAIResponse?: (response: string) => void
  setOnNewAIResponse: (callback: (response: string) => void) => void
  onSpeechEnd: () => void
}

// 组件props类型
export interface WelcomeProps {
  onStart: () => void
}

export interface MessageBubbleProps {
  message: Message
  isLastMessage?: boolean
  className?: string
}

export interface ChatInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export interface TypingIndicatorProps {
  show: boolean
}

// 工具函数类型
export type GenerateId = () => string
export type FormatTime = (timestamp: string) => string
export type ScrollToBottom = (element: HTMLElement, smooth?: boolean) => void 