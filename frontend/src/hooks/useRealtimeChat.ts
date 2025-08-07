import { useState, useRef, useCallback, useEffect } from 'react'

interface RealtimeChatOptions {
  onMessage?: (message: any) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

interface RealtimeChatReturn {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  sendMessage: (message: string) => void
  setVoice: (voice: string) => void
  startASR: () => void
  stopASR: () => void
  sendAudioData: (audioData: ArrayBuffer) => void
  aiTextBuffer: string
  currentSentences: string[]
  isProcessing: boolean
  isSpeaking: boolean
}

const API_BASE_URL = 'ws://localhost:8000/api/realtime/ws'

// 音频播放器类
class RealtimeAudioPlayer {
  private context: AudioContext
  private sequenceQueue: Map<number, { chunks: Int16Array[], isComplete: boolean }> = new Map()
  private currentSequence: number = 0
  private isPlaying: boolean = false
  private sampleRate: number

  constructor(sampleRate: number = 24000) {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.sampleRate = sampleRate
  }

  async addAudioChunk(sequence: number, _chunkIndex: number, audioData: string): Promise<void> {
    try {
      // 解码base64音频数据
      const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
      const audioArray = new Int16Array(audioBytes.buffer)

      // 获取或创建序列
      if (!this.sequenceQueue.has(sequence)) {
        this.sequenceQueue.set(sequence, { chunks: [], isComplete: false })
      }

      const sequenceData = this.sequenceQueue.get(sequence)!
      sequenceData.chunks.push(audioArray)

      // 如果当前序列正在播放，立即播放新片段
      if (sequence === this.currentSequence && this.isPlaying) {
        await this.playAudioChunk(audioArray)
      }
    } catch (error) {
      console.error('❌ 添加音频片段失败:', error)
    }
  }

  markSequenceComplete(sequence: number): void {
    const sequenceData = this.sequenceQueue.get(sequence)
    if (sequenceData) {
      sequenceData.isComplete = true
    }
  }

  async playNextSequence(): Promise<void> {
    if (this.isPlaying) return

    // 查找下一个完整的序列
    for (const [sequence, data] of this.sequenceQueue) {
      if (sequence >= this.currentSequence && data.isComplete) {
        this.currentSequence = sequence
        this.isPlaying = true

        try {
          // 播放序列中的所有片段
          for (const chunk of data.chunks) {
            await this.playAudioChunk(chunk)
          }

          // 清理已播放的序列
          this.sequenceQueue.delete(sequence)
          this.currentSequence++
        } finally {
          this.isPlaying = false
        }

        // 继续播放下一个序列
        await this.playNextSequence()
        break
      }
    }
  }

  private async playAudioChunk(audioArray: Int16Array): Promise<void> {
    return new Promise((resolve) => {
      // 创建音频缓冲区
      const audioBuffer = this.context.createBuffer(1, audioArray.length, this.sampleRate)
      const channelData = audioBuffer.getChannelData(0)

      // 将Int16Array转换为Float32Array
      for (let i = 0; i < audioArray.length; i++) {
        channelData[i] = audioArray[i] / 32768.0
      }

      // 创建音频源并播放
      const source = this.context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.context.destination)
      source.onended = () => resolve()
      source.start()
    })
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  stop(): void {
    this.isPlaying = false
    this.sequenceQueue.clear()
    this.currentSequence = 0
  }
}

export const useRealtimeChat = (options: RealtimeChatOptions = {}): RealtimeChatReturn => {
  const {
    onMessage,
    onError,
    onConnect,
    onDisconnect
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiTextBuffer, setAiTextBuffer] = useState('')
  const [currentSentences] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioPlayerRef = useRef<RealtimeAudioPlayer | null>(null)
  const clientIdRef = useRef<string>('')

  // 生成客户端ID
  useEffect(() => {
    clientIdRef.current = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      const { type } = data

      switch (type) {
        case 'welcome':
          console.log('✅ 实时对话服务已连接')
          onMessage?.(data)
          break

        case 'ai_text_chunk':
          // AI文本片段
          setAiTextBuffer(prev => prev + data.content)
          onMessage?.(data)
          break

        case 'tts_start':
          // TTS开始
          setIsSpeaking(true)
          onMessage?.(data)
          break

        case 'audio_chunk':
          // 音频片段
          if (audioPlayerRef.current) {
            audioPlayerRef.current.addAudioChunk(
              data.sequence,
              data.chunk_index,
              data.audio_data
            )
          }
          onMessage?.(data)
          break

        case 'tts_complete':
          // TTS完成
          if (audioPlayerRef.current) {
            audioPlayerRef.current.markSequenceComplete(data.sequence)
            audioPlayerRef.current.playNextSequence()
          }
          setIsSpeaking(false)
          onMessage?.(data)
          break

        case 'processing_start':
          // 处理开始
          setIsProcessing(true)
          setAiTextBuffer('')
          onMessage?.(data)
          break

        case 'processing_complete':
          // 处理完成
          setIsProcessing(false)
          onMessage?.(data)
          break

        case 'asr_partial':
          // ASR部分结果
          onMessage?.(data)
          break

        case 'asr_start':
        case 'asr_stop':
        case 'voice_set':
        case 'asr_model_set':
        case 'audio_received':
          // 其他事件
          onMessage?.(data)
          break

        case 'error':
          console.error('❌ 服务器错误:', data.message)
          setError(data.message)
          onError?.(data.message)
          break

        case 'pong':
          // 心跳响应
          break

        default:
          console.log('📨 未知消息类型:', type, data)
      }
    } catch (err) {
      console.error('❌ 处理WebSocket消息失败:', err)
    }
  }, [onMessage, onError])

  // 连接WebSocket
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    console.log('🔌 连接实时对话WebSocket...')
    setError(null)
    setIsConnecting(true)

    try {
      const ws = new WebSocket(`${API_BASE_URL}/${clientIdRef.current}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ 实时对话WebSocket连接成功')
        setIsConnecting(false)
        setIsConnected(true)
        setError(null)
        onConnect?.()
      }

      ws.onmessage = handleWebSocketMessage

      ws.onclose = (event) => {
        console.log('🔌 实时对话WebSocket连接关闭:', event.code, event.reason)
        setIsConnecting(false)
        setIsConnected(false)
        onDisconnect?.()
        
        // 自动重连（除非是正常关闭）
        if (event.code !== 1000) {
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        console.error('❌ 实时对话WebSocket错误:', error)
        setError('WebSocket连接错误')
        setIsConnecting(false)
        setIsConnected(false)
      }

    } catch (err) {
      console.error('❌ 创建实时对话WebSocket连接失败:', err)
      setError('无法建立连接')
      setIsConnecting(false)
    }
  }, [handleWebSocketMessage, onConnect, onDisconnect])

  // 重连调度
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('🔄 尝试重连实时对话WebSocket...')
      connectWebSocket()
    }, 3000)
  }, [connectWebSocket])

  // 发送消息
  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        message: message
      }))
    }
  }, [])

  // 设置语音
  const setVoice = useCallback((voice: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'set_voice',
        voice: voice
      }))
    }
  }, [])

  // 开始ASR
  const startASR = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'asr_start'
      }))
    }
  }, [])

  // 停止ASR
  const stopASR = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'asr_stop'
      }))
    }
  }, [])

  // 发送音频数据
  const sendAudioData = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioData)
    }
  }, [])

  // 初始化音频播放器
  useEffect(() => {
    audioPlayerRef.current = new RealtimeAudioPlayer()
    return () => {
      audioPlayerRef.current?.stop()
    }
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (wsRef.current) {
        wsRef.current.close()
      }
      
      audioPlayerRef.current?.stop()
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    setVoice,
    startASR,
    stopASR,
    sendAudioData,
    aiTextBuffer,
    currentSentences,
    isProcessing,
    isSpeaking
  }
} 