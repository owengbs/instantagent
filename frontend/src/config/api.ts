/**
 * API配置文件 - 统一管理所有后端地址
 */

// 智能检测当前环境
const detectEnvironment = () => {
  // 检查是否在移动设备上
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // 检查是否在本地开发环境
  const isLocalDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('192.168.') ||
                     window.location.hostname.includes('10.31.')
  
  // 检查是否在移动端访问PC端开发服务器
  const isMobileAccessingDev = isMobile && !isLocalDev && 
                               (window.location.hostname === '10.31.40.11' || 
                                window.location.hostname.includes('192.168.') ||
                                window.location.hostname.includes('10.31.'))
  
  return { isMobile, isLocalDev, isMobileAccessingDev }
}

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

// 从环境变量获取配置，如果没有则使用智能配置
const getConfig = () => {
  const isDev = process.env.NODE_ENV === 'development'
  const env = detectEnvironment()
  
  // 如果环境变量已设置，直接使用（仅当仍在本机或内网场景）。
  // 当通过外网域名（如 ngrok）访问开发服务器时，不使用绝对地址，改走相对路径以命中 Vite 代理。
  const isExternalDevHost = !env.isLocalDev
  if (!isExternalDevHost && (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_WS_BASE_URL)) {
    return {
      HTTP_BASE_URL: import.meta.env.VITE_API_BASE_URL || DEFAULT_CONFIG[isDev ? 'development' : 'production'].HTTP_BASE_URL,
      WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || DEFAULT_CONFIG[isDev ? 'development' : 'production'].WS_BASE_URL,
      HOST: import.meta.env.VITE_HOST || DEFAULT_CONFIG[isDev ? 'development' : 'production'].HOST
    }
  }
  
  // 智能配置：移动端访问开发服务器或通过外网域名（如 ngrok）访问时，使用当前域名（相对路径 + 由 Vite 代理转发）
  if (isDev && (env.isMobileAccessingDev || isExternalDevHost)) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const currentHost = window.location.host
    
    return {
      HTTP_BASE_URL: '', // 使用相对路径让 Vite 代理接管
      WS_BASE_URL: '',   // WebSocket 也走相对，使用同源构建
      HOST: currentHost
    }
  }
  
  // 使用默认配置
  return DEFAULT_CONFIG[isDev ? 'development' : 'production']
}

const config = getConfig()

export const API_CONFIG = {
  // HTTP API地址
  getHttpBaseUrl(): string {
    // 当配置为空字符串时，表示使用相对路径（由 Vite 代理或同源后端处理）
    if (!config.HTTP_BASE_URL) return ''
    return config.HTTP_BASE_URL
  },

  // WebSocket地址
  getWsBaseUrl(): string {
    if (!config.WS_BASE_URL) {
      // 相对路径，使用空字符串让端点函数决定是否使用绝对路径
      return ''
    }
    return config.WS_BASE_URL
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
    // 聊天WebSocket - 在外网环境（如ngrok）使用相对路径更可靠
    chatWs: (sessionId: string) => {
      const wsBase = API_CONFIG.getWsBaseUrl()
      if (!wsBase || wsBase === '') {
        // 相对路径，让 Vite 代理处理
        return `/realtime/ws/${sessionId}`
      }
      return `${wsBase}/realtime/ws/${sessionId}`
    },
    
    // 语音识别WebSocket  
    asrWs: () => {
      const wsBase = API_CONFIG.getWsBaseUrl()
      if (!wsBase || wsBase === '') {
        return `/api/asr/ws`
      }
      return `${wsBase}/api/asr/ws`
    },
    
    // 实时对话WebSocket
    realtimeWs: () => {
      const wsBase = API_CONFIG.getWsBaseUrl()
      if (!wsBase || wsBase === '') {
        return `/realtime/ws`
      }
      return `${wsBase}/realtime/ws`
    },
    
    // TTS API
    tts: () => `${API_CONFIG.getHttpBaseUrl()}/api/tts`,
    
    // 通用API
    api: () => API_CONFIG.getHttpBaseUrl()
  }
}

export default API_CONFIG
