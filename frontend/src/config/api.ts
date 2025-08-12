/**
 * API配置文件 - 统一管理所有后端地址
 */

// 默认后端地址配置
const DEFAULT_CONFIG = {
  // 开发环境
  development: {
    HTTP_BASE_URL: 'http://10.31.40.11:8000',
    WS_BASE_URL: 'ws://10.31.40.11:8000',
    HOST: '10.31.40.11:8000'
  },
  // 生产环境  
  production: {
    HTTP_BASE_URL: '',  // 生产环境使用相对路径
    WS_BASE_URL: '',    // 将根据当前域名自动推断
    HOST: ''            // 将使用当前域名
  }
}

// 从环境变量获取配置，如果没有则使用默认配置
const getConfig = () => {
  const isDev = process.env.NODE_ENV === 'development'
  
  return {
    HTTP_BASE_URL: import.meta.env.VITE_API_BASE_URL || DEFAULT_CONFIG[isDev ? 'development' : 'production'].HTTP_BASE_URL,
    WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || DEFAULT_CONFIG[isDev ? 'development' : 'production'].WS_BASE_URL,
    HOST: import.meta.env.VITE_HOST || DEFAULT_CONFIG[isDev ? 'development' : 'production'].HOST
  }
}

const config = getConfig()

export const API_CONFIG = {
  // HTTP API地址
  getHttpBaseUrl(): string {
    if (process.env.NODE_ENV === 'development') {
      return config.HTTP_BASE_URL
    }
    // 生产环境使用相对路径
    return '/api'
  },

  // WebSocket地址
  getWsBaseUrl(): string {
    if (process.env.NODE_ENV === 'development') {
      return config.WS_BASE_URL
    }
    // 生产环境根据当前协议和域名构建
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}`
  },

  // 获取主机地址
  getHost(): string {
    if (process.env.NODE_ENV === 'development') {
      return config.HOST
    }
    return window.location.host
  },

  // 具体的API端点
  endpoints: {
    // 聊天WebSocket
    chatWs: (sessionId: string) => `${API_CONFIG.getWsBaseUrl()}/realtime/ws/${sessionId}`,
    
    // 语音识别WebSocket  
    asrWs: () => `${API_CONFIG.getWsBaseUrl()}/api/asr/ws`,
    
    // 实时对话WebSocket
    realtimeWs: () => `${API_CONFIG.getWsBaseUrl()}/realtime/ws`,
    
    // TTS API
    tts: () => `${API_CONFIG.getHttpBaseUrl()}/api/tts`,
    
    // 通用API
    api: () => API_CONFIG.getHttpBaseUrl()
  }
}

export default API_CONFIG
