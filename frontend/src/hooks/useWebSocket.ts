import { useEffect, useRef, useCallback, useState } from 'react'
import { WebSocketMessage, Message } from '../types'
import { generateId } from '../utils'

interface UseWebSocketOptions {
  url: string
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  error: string | null
  sendMessage: (message: any) => boolean
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setError(null)
        onConnect?.()
        console.log('WebSocket 连接已建立:', url)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
        } catch (err) {
          console.error('解析 WebSocket 消息失败:', err)
          setError('消息格式错误')
        }
      }

      wsRef.current.onclose = (event) => {
        setIsConnected(false)
        onDisconnect?.()
        
        console.log('WebSocket 连接已关闭:', event.code, event.reason)

        // 自动重连
        if (autoReconnect && shouldReconnectRef.current && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              console.log('尝试重新连接 WebSocket...')
              connect()
            }
          }, reconnectInterval)
        }
      }

      wsRef.current.onerror = (event) => {
        console.error('WebSocket 错误:', event)
        setError('WebSocket 连接错误')
        onError?.(event)
      }

    } catch (err) {
      console.error('创建 WebSocket 连接失败:', err)
      setError('连接失败')
    }
  }, [url, onMessage, onError, onConnect, onDisconnect, autoReconnect, reconnectInterval])

  // 断开连接
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Normal closure')
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  // 重新连接
  const reconnect = useCallback(() => {
    disconnect()
    shouldReconnectRef.current = true
    setTimeout(() => {
      connect()
    }, 100)
  }, [connect, disconnect])

  // 发送消息
  const sendMessage = useCallback((message: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const data = typeof message === 'string' ? message : JSON.stringify(message)
        wsRef.current.send(data)
        return true
      } catch (err) {
        console.error('发送 WebSocket 消息失败:', err)
        setError('发送消息失败')
        return false
      }
    } else {
      console.warn('WebSocket 未连接，无法发送消息')
      setError('连接已断开')
      return false
    }
  }, [])

  // 初始化连接
  useEffect(() => {
    shouldReconnectRef.current = true
    connect()

    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting')
      }
    }
  }, [connect])

  // 页面可见性变化时的处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && shouldReconnectRef.current) {
        console.log('页面重新可见，尝试重新连接 WebSocket')
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected, connect])

  // 网络状态变化时的处理
  useEffect(() => {
    const handleOnline = () => {
      if (shouldReconnectRef.current) {
        console.log('网络已恢复，尝试重新连接 WebSocket')
        reconnect()
      }
    }

    const handleOffline = () => {
      console.log('网络已断开')
      setError('网络连接已断开')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [reconnect])

  return {
    isConnected,
    error,
    sendMessage,
    connect,
    disconnect,
    reconnect
  }
} 