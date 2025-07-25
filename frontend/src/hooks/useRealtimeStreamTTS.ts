import { useState, useRef, useCallback } from 'react'

interface StreamTTSOptions {
  voice?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

interface StreamTTSReturn {
  isSupported: boolean
  isSpeaking: boolean
  isLoading: boolean
  speak: (text: string) => Promise<void>
  stop: () => void
  error: string | null
}

const API_BASE_URL = 'http://localhost:8000/api/tts'

// Web Audio API 流式播放器
class StreamAudioPlayer {
  private context: AudioContext
  private bufferQueue: Float32Array[] = []
  private isPlaying = false
  private currentSource: AudioBufferSourceNode | null = null
  private sampleRate: number
  
  constructor(sampleRate: number = 24000) {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.sampleRate = sampleRate
  }
  
  async play(pcmData: Int16Array): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
    
    // 转换PCM数据为Float32Array
    const floatData = new Float32Array(pcmData.length)
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0
    }
    
    // 创建音频缓冲区
    const audioBuffer = this.context.createBuffer(1, floatData.length, this.sampleRate)
    audioBuffer.getChannelData(0).set(floatData)
    
    // 创建音频源并播放
    const source = this.context.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.context.destination)
    
    if (this.currentSource) {
      // 连接到前一个音频源实现无缝播放
      source.start(this.context.currentTime)
    } else {
      source.start(0)
      this.isPlaying = true
    }
    
    this.currentSource = source
    
    return new Promise((resolve) => {
      source.onended = () => {
        resolve()
        if (this.currentSource === source) {
          this.isPlaying = false
          this.currentSource = null
        }
      }
    })
  }
  
  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
    this.isPlaying = false
  }
  
  getIsPlaying(): boolean {
    return this.isPlaying
  }
}

export const useRealtimeStreamTTS = (options: StreamTTSOptions = {}): StreamTTSReturn => {
  const {
    voice = 'Cherry',
    onStart,
    onEnd,
    onError
  } = options

  const [isSupported] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playerRef = useRef<StreamAudioPlayer | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 流式语音合成和播放
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) {
      console.warn('⚠️ 文本为空，跳过语音合成')
      return
    }

    try {
      console.log('🌊 开始流式语音合成:', { text: text.slice(0, 50) + '...', voice })
      
      setIsLoading(true)
      setError(null)
      onStart?.()

      // 创建音频播放器
      playerRef.current = new StreamAudioPlayer(24000)
      
      // 创建中止控制器
      abortControllerRef.current = new AbortController()

      // 调用流式TTS API
      const response = await fetch(`${API_BASE_URL}/synthesize-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: voice
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`流式TTS失败: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      console.log('🎵 开始接收音频流...')
      setIsLoading(false)
      setIsSpeaking(true)

      let totalBytes = 0
      let chunkCount = 0

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('✅ 音频流接收完成')
          break
        }

        if (value && value.length > 0) {
          chunkCount++
          totalBytes += value.length
          
          // 将字节数组转换为Int16Array (PCM数据)
          const pcmData = new Int16Array(value.buffer, value.byteOffset, value.byteLength / 2)
          
          // 立即播放这个音频片段
          if (playerRef.current) {
            await playerRef.current.play(pcmData)
          }
          
          console.log(`🎶 播放音频片段 ${chunkCount}: ${value.length} bytes`)
        }
      }

      console.log(`🎉 流式播放完成: ${chunkCount} 个片段, 总计 ${totalBytes} bytes`)
      
      // 等待播放完成
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setIsSpeaking(false)
      playerRef.current = null
      onEnd?.()

    } catch (err) {
      console.error('❌ 流式语音合成失败:', err)
      setIsSpeaking(false)
      setIsLoading(false)
      
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🛑 流式语音合成被用户取消')
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [voice, onStart, onEnd, onError])

  // 停止播放
  const stop = useCallback(() => {
    console.log('🛑 停止流式语音播放')
    
    // 中止网络请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // 停止音频播放
    if (playerRef.current) {
      playerRef.current.stop()
      playerRef.current = null
    }

    setIsSpeaking(false)
    setIsLoading(false)
  }, [])

  return {
    isSupported,
    isSpeaking,
    isLoading,
    speak,
    stop,
    error
  }
} 