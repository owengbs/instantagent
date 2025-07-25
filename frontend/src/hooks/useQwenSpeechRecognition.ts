import { useState, useRef, useCallback, useEffect } from 'react'

interface QwenSpeechRecognitionOptions {
  language?: string
  model?: string
  onStart?: () => void
  onEnd?: () => void
  onResult?: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

interface QwenSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  isConnecting: boolean
  transcript: string
  finalTranscript: string
  error: string | null
  startListening: () => Promise<void>
  stopListening: () => void
  resetTranscript: () => void
}

const API_BASE_URL = 'ws://localhost:8000/api/asr/ws'

// Web Audio API 音频采集器
class AudioRecorder {
  private context: AudioContext
  private stream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private isRecording = false
  private sampleRate: number
  private onAudioData: (data: Int16Array) => void

  constructor(sampleRate: number = 16000, onAudioData: (data: Int16Array) => void) {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.sampleRate = sampleRate
    this.onAudioData = onAudioData
  }

  async start(): Promise<void> {
    try {
      // 获取麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // 创建音频源
      const source = this.context.createMediaStreamSource(this.stream)
      
      // 创建音频处理器
      const bufferSize = 4096
      this.processor = this.context.createScriptProcessor(bufferSize, 1, 1)
      
      // 处理音频数据
      this.processor.onaudioprocess = (event) => {
        if (!this.isRecording) return
        
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        
        // 转换为Int16Array (PCM格式)
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
        }
        
        // 回调音频数据
        this.onAudioData(pcmData)
      }
      
      // 连接音频节点
      source.connect(this.processor)
      this.processor.connect(this.context.destination)
      
      this.isRecording = true
      
    } catch (error) {
      throw new Error(`启动音频录制失败: ${error}`)
    }
  }

  stop(): void {
    this.isRecording = false
    
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
  }

  getIsRecording(): boolean {
    return this.isRecording
  }
}

export const useQwenSpeechRecognition = (options: QwenSpeechRecognitionOptions = {}): QwenSpeechRecognitionReturn => {
  const {
    language = 'zh-CN',
    model = 'paraformer-realtime-v2',
    onStart,
    onEnd,
    onResult,
    onError
  } = options

  const [isSupported] = useState(true) // 假设浏览器支持Web Audio API
  const [isListening, setIsListening] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<AudioRecorder | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 音频数据回调
  const handleAudioData = useCallback((pcmData: Int16Array) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // 发送音频数据到WebSocket
      wsRef.current.send(pcmData.buffer)
    }
  }, [])

  // 连接WebSocket
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    console.log('🔌 连接Qwen ASR WebSocket...')
    setError(null)
    setIsConnecting(true)

    try {
      const ws = new WebSocket(`${API_BASE_URL}/recognize`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Qwen ASR WebSocket连接成功')
        setIsConnecting(false)
        setError(null)
        
        // 发送识别开始事件
        ws.send(JSON.stringify({
          type: 'start',
          model: model,
          language: language
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const { type, text, is_final } = data

          switch (type) {
            case 'partial':
              // 部分识别结果
              if (text && text.trim()) {
                setTranscript(text)
                onResult?.(text, false)
              }
              break

            case 'sentence':
              // 句子级别识别结果
              if (text && text.trim()) {
                setFinalTranscript(prev => prev + text)
                setTranscript('') // 清空部分结果
                onResult?.(text, is_final || false)
              }
              break

            case 'error':
              const errorMsg = data.message || '语音识别错误'
              console.error('❌ ASR错误:', errorMsg)
              setError(errorMsg)
              onError?.(errorMsg)
              break

            case 'end':
              console.log('✅ ASR识别结束')
              break
          }
        } catch (err) {
          console.error('❌ 处理ASR消息失败:', err)
        }
      }

      ws.onclose = (event) => {
        console.log('🔌 Qwen ASR WebSocket连接关闭:', event.code, event.reason)
        setIsConnecting(false)
        setIsListening(false)
        
        // 自动重连（除非是正常关闭）
        if (event.code !== 1000) {
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        console.error('❌ Qwen ASR WebSocket错误:', error)
        setError('WebSocket连接错误')
        setIsConnecting(false)
      }

    } catch (err) {
      console.error('❌ 创建ASR WebSocket连接失败:', err)
      setError('无法建立连接')
      setIsConnecting(false)
    }
  }, [language, model, onResult, onError])

  // 重连调度
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('🔄 尝试重连Qwen ASR WebSocket...')
      connectWebSocket()
    }, 3000)
  }, [connectWebSocket])

  // 开始监听
  const startListening = useCallback(async () => {
    try {
      console.log('🎤 开始Qwen语音识别...')
      setError(null)
      onStart?.()

      // 连接WebSocket
      await connectWebSocket()

      // 创建音频录制器
      recorderRef.current = new AudioRecorder(16000, handleAudioData)
      
      // 开始录制
      await recorderRef.current.start()
      setIsListening(true)
      
      console.log('✅ Qwen语音识别已启动')

    } catch (err) {
      console.error('❌ 启动Qwen语音识别失败:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [connectWebSocket, handleAudioData, onStart, onError])

  // 停止监听
  const stopListening = useCallback(() => {
    console.log('🛑 停止Qwen语音识别')
    
    // 停止音频录制
    if (recorderRef.current) {
      recorderRef.current.stop()
      recorderRef.current = null
    }

    // 发送结束信号
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }))
    }

    setIsListening(false)
    onEnd?.()
  }, [onEnd])

  // 重置转录
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setFinalTranscript('')
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
      
      if (recorderRef.current) {
        recorderRef.current.stop()
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    isConnecting,
    transcript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
} 