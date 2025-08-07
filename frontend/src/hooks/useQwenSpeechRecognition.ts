import { useState, useCallback, useRef, useEffect } from 'react'
import { useChat } from '../contexts/ChatContext'
import { useQwenTTS } from './useQwenTTS'
import { API_CONFIG } from '../config/api'
import { checkMediaSupport, getMediaErrorInfo } from '../utils/mediaUtils'

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

const API_BASE_URL = API_CONFIG.endpoints.asrWs()

// Web Audio API 音频采集器
class AudioRecorder {
  private context: AudioContext
  private stream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private isRecording = false
  private sampleRate: number
  private onAudioData: (data: Int16Array) => void
  
  // 音频缓冲区
  private pcmBuffer: Int16Array[] = []
  private bufferLength = 0
  private readonly chunkSize = 3200 // 200ms @ 16kHz, 16bit, 单声道
  
  // 采样率警告标志
  private sampleRateWarningShown = false
  
  // 静音音频发送机制
  private silenceInterval: NodeJS.Timeout | null = null
  private readonly silenceIntervalMs = 1000 // 每1秒发送一次静音音频
  
  // 音频活动检测
  private lastAudioActivity = Date.now()
  private readonly activityThreshold = 0.01 // 音频能量阈值
  private readonly silenceTimeoutMs = 2000 // 2秒无活动后开始发送静音
  
  // 音频重采样函数
  private resampleAudio(inputData: Float32Array, fromRate: number, toRate: number): Float32Array<ArrayBuffer> {
    if (fromRate === toRate) {
      return inputData as Float32Array<ArrayBuffer>
    }
    
    const ratio = toRate / fromRate
    const newLength = Math.round(inputData.length * ratio)
    const resampled = new Float32Array(newLength)
    
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1)
      const fraction = srcIndex - srcIndexFloor
      
      // 线性插值
      resampled[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction
    }
    
    return resampled
  }

  constructor(sampleRate: number = 16000, onAudioData: (data: Int16Array) => void) {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.sampleRate = sampleRate
    this.onAudioData = onAudioData
  }
  
  // 生成静音音频数据
  private generateSilenceAudio(durationMs: number): Int16Array {
    const sampleCount = Math.floor((this.sampleRate * durationMs) / 1000)
    return new Int16Array(sampleCount) // 默认全为0，即静音
  }
  
  // 检测音频能量（判断是否有实际声音）
  private detectAudioActivity(audioData: Float32Array): boolean {
    let energy = 0
    for (let i = 0; i < audioData.length; i++) {
      energy += audioData[i] * audioData[i]
    }
    energy = Math.sqrt(energy / audioData.length) // RMS能量
    return energy > this.activityThreshold
  }


  
  // 开始发送静音音频（保持连接）
  private startSilenceKeepAlive(): void {
    if (this.silenceInterval) {
      return
    }
    
    console.log('🔇 开始静音音频保持连接监控')
    this.silenceInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - this.lastAudioActivity
      
      // 只有在超过静音阈值时间且没有音频活动时才发送静音
      if (timeSinceLastActivity > this.silenceTimeoutMs) {
        const silenceData = this.generateSilenceAudio(100) // 100ms静音
        this.onAudioData(silenceData)
        console.log(`🔇 发送静音音频保持连接 (${Math.round(timeSinceLastActivity/1000)}s无活动)`)
      }
    }, this.silenceIntervalMs)
  }
  
  // 停止发送静音音频
  private stopSilenceKeepAlive(): void {
    if (this.silenceInterval) {
      clearInterval(this.silenceInterval)
      this.silenceInterval = null
      console.log('🔇 停止发送静音音频')
    }
  }

  async start(): Promise<void> {
    try {
      // 检查浏览器是否支持媒体设备API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('浏览器不支持麦克风访问。请使用现代浏览器并确保在HTTPS环境下访问。')
      }

      // 检查是否在安全上下文中（HTTPS或localhost）
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('麦克风访问需要HTTPS环境。请使用HTTPS协议访问本站点。')
      }

      // 获取麦克风权限，确保正确的音频参数
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
      
      // 创建音频处理器 - 使用ScriptProcessorNode直接获取PCM数据
      const bufferSize = 4096
      this.processor = this.context.createScriptProcessor(bufferSize, 1, 1)
      
      // 处理音频数据
      this.processor.onaudioprocess = (event) => {
        if (!this.isRecording) return
        
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        
        // 检测音频活动
        if (this.detectAudioActivity(inputData)) {
          this.lastAudioActivity = Date.now()
        }
        

        
        // 检查采样率并重采样
        let processedData: Float32Array<ArrayBuffer> = inputData as Float32Array<ArrayBuffer>
        if (inputBuffer.sampleRate !== this.sampleRate) {
          if (!this.sampleRateWarningShown) {
            console.warn(`⚠️ 采样率不匹配: 期望${this.sampleRate}Hz, 实际${inputBuffer.sampleRate}Hz，进行重采样`)
            this.sampleRateWarningShown = true
          }
          processedData = this.resampleAudio(inputData as Float32Array<ArrayBuffer>, inputBuffer.sampleRate, this.sampleRate)
        }
        
        // 转换为Int16Array (PCM格式)
        const pcmData = new Int16Array(processedData.length)
        for (let i = 0; i < processedData.length; i++) {
          // 确保音频数据在有效范围内
          const sample = Math.max(-1, Math.min(1, processedData[i]))
          pcmData[i] = Math.max(-32768, Math.min(32767, sample * 32768))
        }
        
        // 添加到缓冲区
        this.pcmBuffer.push(pcmData)
        this.bufferLength += pcmData.length
        
        // 合并到200ms一块再发送
        while (this.bufferLength >= this.chunkSize) {
          let merged = new Int16Array(this.chunkSize)
          let offset = 0
          
          while (offset < this.chunkSize && this.pcmBuffer.length > 0) {
            let chunk = this.pcmBuffer[0]
            let copyLen = Math.min(chunk.length, this.chunkSize - offset)
            merged.set(chunk.subarray(0, copyLen), offset)
            offset += copyLen
            
            if (copyLen < chunk.length) {
              // 还有剩余数据，更新第一个块
              this.pcmBuffer[0] = chunk.subarray(copyLen)
            } else {
              // 这个块用完了，移除
              this.pcmBuffer.shift()
            }
          }
          
          this.bufferLength -= this.chunkSize
          
          // 发送合并后的音频块
          this.onAudioData(merged)
        }
      }
      
      // 连接音频节点
      source.connect(this.processor)
      this.processor.connect(this.context.destination)
      
      this.isRecording = true
      
      // 重置活动时间戳
      this.lastAudioActivity = Date.now()
      
      // 开始静音音频保持连接
      this.startSilenceKeepAlive()
      
    } catch (error) {
      throw new Error(`启动音频录制失败: ${error}`)
    }
  }

  stop(): void {
    this.isRecording = false
    
    // 停止静音音频发送
    this.stopSilenceKeepAlive()
    
    // 清空缓冲区
    this.pcmBuffer = []
    this.bufferLength = 0
    
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
  const clientIdRef = useRef<string>('')
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityTimeRef = useRef<number>(0)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(0)

  // 获取聊天上下文
  const { sendMessage } = useChat()
  
  // 获取TTS功能
  const { speak } = useQwenTTS({
    voice: 'Cherry',
    onStart: () => console.log('🔊 TTS开始播放'),
    onEnd: () => {
      console.log('🔊 TTS播放结束，准备下一轮对话')
      // TTS播放结束后，可以重新开始录音
      // 这里可以添加重新开始录音的逻辑
    },
    onError: (error) => {
      console.error('❌ TTS播放错误:', error)
      setError(`TTS播放错误: ${error}`)
    }
  })

  // 设置AI回复的TTS播放回调
  const { setOnNewAIResponse } = useChat()
  
  useEffect(() => {
    // 设置AI回复回调，自动播放语音
    setOnNewAIResponse((response: string) => {
      console.log('🤖 收到AI回复，开始TTS播放:', response.slice(0, 50) + '...')
      speak(response).catch((error) => {
        console.error('❌ TTS播放失败:', error)
      })
    })
  }, [setOnNewAIResponse, speak])

  // 初始化客户端ID
  useEffect(() => {
    clientIdRef.current = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // 说话结束检测（3秒静音）
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      console.log('🔄 重置静音计时器')
    }
    lastSpeechTimeRef.current = Date.now()
    
    // 3秒无语音活动自动停止并发送给大模型
    silenceTimeoutRef.current = setTimeout(() => {
      console.log('⏰ 3秒静音计时器到期！准备检查是否发送给大模型...')
      console.log('🔍 当前状态检查:', {
        isListening,
        transcript,
        finalTranscript,
        wsConnected: wsRef.current?.readyState === WebSocket.OPEN
      })
      
      // 获取当前识别结果（无论录音状态如何）
      const currentText = transcript || finalTranscript
      console.log('📝 当前识别结果:', { transcript, finalTranscript, currentText })
      
      if (currentText && currentText.trim()) {
        console.log('✅ 静音检测触发，发送识别结果给大模型:', currentText)
        console.log('📊 识别结果详情:', {
          transcriptLength: transcript.length,
          finalTranscriptLength: finalTranscript.length,
          currentTextLength: currentText.length,
          hasValidText: currentText.trim().length > 0
        })
        
        // 如果还在录音，先停止录音
        if (isListening) {
          console.log('🛑 停止Qwen语音识别')
          
          // 清理自动停止计时器
          if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current)
            autoStopTimeoutRef.current = null
          }

          // 清理说话结束检测计时器
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
            silenceTimeoutRef.current = null
          }
          
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
        }
        
        // 发送send请求到后端，让后端处理发送给大模型
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('📤 发送send请求到后端')
          wsRef.current.send(JSON.stringify({ type: 'send' }))
        } else {
          console.error('❌ WebSocket未连接，无法发送send请求')
        }
      } else {
        console.log('⚠️ 静音检测触发，但没有识别到有效文本')
        console.log('📊 空结果详情:', {
          transcriptLength: transcript.length,
          finalTranscriptLength: finalTranscript.length,
          currentTextLength: currentText.length,
          hasValidText: currentText.trim().length > 0
        })
        
        // 如果还在录音，停止录音
        if (isListening) {
          console.log('🛑 停止Qwen语音识别')
          
          // 清理计时器
          if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current)
            autoStopTimeoutRef.current = null
          }
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
            silenceTimeoutRef.current = null
          }
          
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
        }
      }
    }, 3000)
    console.log('⏰ 启动3秒静音计时器')
  }, [isListening, transcript, finalTranscript, sendMessage, onEnd])

  // 自动停止机制（5秒无活动）
  const resetAutoStopTimer = useCallback(() => {
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current)
    }
    lastActivityTimeRef.current = Date.now()
    
    // 5秒无活动自动停止
    autoStopTimeoutRef.current = setTimeout(() => {
      if (isListening) {
        console.log('⏰ 自动停止语音识别（无活动超时）')
        // stopListening() // 移除此行，避免循环依赖
      }
    }, 5000)
  }, [isListening])

  // 简单的语音活动检测
  const detectSpeechActivity = useCallback((pcmData: Int16Array): boolean => {
    // 计算音频数据的RMS（均方根）值作为音量指标
    let sum = 0
    for (let i = 0; i < pcmData.length; i++) {
      sum += pcmData[i] * pcmData[i]
    }
    const rms = Math.sqrt(sum / pcmData.length)
    
    // 设置音量阈值（降低阈值，提高检测灵敏度）
    const threshold = 500 // 降低阈值从1000到500
    const hasSpeech = rms > threshold
    
    // 添加调试日志（减少频率，只在有语音时显示）
    if (hasSpeech) {
      console.log(`🎤 语音活动检测: RMS=${rms.toFixed(0)}, 阈值=${threshold}, 检测到语音`)
    } else {
      // 偶尔显示静音状态，帮助调试
      if (Math.random() < 0.1) { // 10%的概率显示静音日志
        console.log(`🔇 语音活动检测: RMS=${rms.toFixed(0)}, 阈值=${threshold}, 静音中`)
      }
    }
    
    return hasSpeech
  }, [])

  // 音频数据回调
  const handleAudioData = useCallback((pcmData: Int16Array) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        // 确保音频数据是16位PCM格式
        if (pcmData.length > 0) {
          // 检测是否有语音活动（简单的音量检测）
          const hasSpeech = detectSpeechActivity(pcmData)
          
          if (hasSpeech) {
            // 有语音活动，重置静音计时器
            resetSilenceTimer()
            console.log('🎤 检测到语音活动')
          }
          
          // 转换为ArrayBuffer
          const buffer = pcmData.buffer
          
          // 发送音频数据到WebSocket（减少日志频率）
          if (hasSpeech) {
            console.log(`🎤 发送音频数据: ${pcmData.length} 采样点, ${buffer.byteLength} 字节`)
          }
          wsRef.current.send(buffer)
          
          // 重置自动停止计时器
          resetAutoStopTimer()
        }
      } catch (error) {
        console.error('❌ 发送音频数据失败:', error)
      }
    } else {
      console.warn('⚠️ WebSocket未连接，无法发送音频数据')
    }
  }, [resetAutoStopTimer, resetSilenceTimer, detectSpeechActivity])

  // 连接WebSocket
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    console.log('🔌 连接Qwen ASR WebSocket...')
    setError(null)
    setIsConnecting(true)

    try {
      const ws = new WebSocket(`${API_BASE_URL}/${clientIdRef.current}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Qwen ASR WebSocket连接成功')
        setIsConnecting(false)
        setError(null)
        
        // 发送识别开始事件
        const startMessage = {
          type: 'start',
          model: model,
          language: language
        }
        console.log('🚀 发送ASR开始消息:', startMessage)
        ws.send(JSON.stringify(startMessage))
      }

      ws.onmessage = (event) => {
        console.log('📨 收到ASR消息:', event.data)
        try {
          const data = JSON.parse(event.data)
          const { type, text, is_final } = data

          console.log('📨 收到WebSocket消息:', { type, text, is_final, data })

          switch (type) {
            case 'partial':
              // 部分识别结果
              if (text && text.trim()) {
                console.log('📝 ASR部分结果:', text)
                setTranscript(text)
                onResult?.(text, false)
                console.log('🔄 已更新transcript状态:', text)
                // 注意：不要在这里重置静音计时器，因为ASR结果可能延迟
                // 静音检测应该基于实际的语音活动，而不是ASR结果
              } else {
                console.log('⚠️ 收到空的ASR部分结果')
              }
              break

            case 'final':
              // 最终识别结果
              if (text && text.trim()) {
                console.log('📝 ASR最终结果:', text)
                setFinalTranscript(prev => {
                  const newFinal = prev + text
                  console.log('🔄 更新finalTranscript:', { prev, text, newFinal })
                  return newFinal
                })
                setTranscript('') // 清空部分结果
                onResult?.(text, true)
                console.log('✅ 已处理ASR最终结果')
                
                // 注意：不要在这里重置静音计时器，让静音检测基于实际的语音活动
              } else {
                console.log('⚠️ 收到空的ASR最终结果')
              }
              break

            case 'sentence':
              // 句子级别识别结果（兼容旧版本）
              if (text && text.trim()) {
                console.log('📝 ASR句子结果:', text, 'is_final:', is_final)
                setFinalTranscript(prev => {
                  const newFinal = prev + text
                  console.log('🔄 更新finalTranscript (sentence):', { prev, text, newFinal })
                  return newFinal
                })
                setTranscript('') // 清空部分结果
                onResult?.(text, is_final || false)
                
                // 如果是最终结果，停止录音并发送给大模型
                // 注意：如果静音检测已经触发，这里就不需要重复发送了
                if (is_final && isListening) {
                  console.log('✅ 收到ASR最终识别结果，准备发送给大模型:', text)
                  
                  // 停止录音
                  // stopListening() // 移除此行，避免循环依赖
                  
                  // 发送给大模型进行对话
                  console.log('🤖 发送语音识别结果给大模型:', text)
                  sendMessage(text).then(() => {
                    console.log('✅ 语音识别结果已发送给大模型')
                  }).catch((error) => {
                    console.error('❌ 发送给大模型失败:', error)
                    setError('发送给大模型失败')
                  })
                }
                // 注意：不要在这里重置静音计时器，让静音检测基于实际的语音活动
              } else {
                console.log('⚠️ 收到空的ASR句子结果')
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

            case 'welcome':
              console.log('👋 ASR服务欢迎消息:', data.message)
              break

            case 'send_success':
              // 后端成功处理发送请求，调用sendMessage
              const message = data.message
              console.log('✅ 后端发送成功，调用sendMessage:', message)
              sendMessage(message).then(() => {
                console.log('✅ 语音识别结果已发送给大模型')
              }).catch((error) => {
                console.error('❌ 发送给大模型失败:', error)
                setError('发送给大模型失败')
              })
              break

            case 'send_error':
              // 后端发送失败
              const sendErrorMsg = data.message || '发送失败'
              console.error('❌ 后端发送失败:', sendErrorMsg)
              setError(sendErrorMsg)
              onError?.(sendErrorMsg)
              break

            case 'llm_response':
              // 大模型回复
              const llmMessage = data.message
              console.log('🤖 收到大模型回复:', llmMessage)
              // 这里可以触发TTS播放
              break

            case 'llm_error':
              // 大模型调用失败
              const llmErrorMsg = data.message || '大模型调用失败'
              console.error('❌ 大模型调用失败:', llmErrorMsg)
              setError(llmErrorMsg)
              onError?.(llmErrorMsg)
              break

            default:
              console.log('📨 未知ASR消息类型:', type, data)
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
  }, [language, model, onResult, onError, sendMessage, isListening])

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
      
      // 首先检查媒体设备支持情况
      const supportInfo = checkMediaSupport()
      if (!supportInfo.isSupported) {
        const errorMsg = supportInfo.errorMessage || '浏览器不支持语音功能'
        console.error('❌ 媒体设备检查失败:', errorMsg)
        console.log('💡 建议解决方案:', supportInfo.recommendations)
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }

      onStart?.()

      // 连接WebSocket
      await connectWebSocket()

      // 创建音频录制器
      recorderRef.current = new AudioRecorder(16000, handleAudioData)
      
      // 开始录制
      await recorderRef.current.start()
      setIsListening(true)
      
      // 启动自动停止计时器
      resetAutoStopTimer()
      
      console.log('✅ Qwen语音识别已启动')

    } catch (err) {
      console.error('❌ 启动Qwen语音识别失败:', err)
      
      // 获取用户友好的错误信息
      const errorInfo = getMediaErrorInfo(err instanceof Error ? err : new Error(String(err)))
      console.log('💡 解决方案:', errorInfo.solutions)
      
      setError(errorInfo.message)
      onError?.(errorInfo.message)
    }
  }, [connectWebSocket, handleAudioData, onStart, onError, resetAutoStopTimer])

  // 停止监听
  const stopListening = useCallback(() => {
    console.log('🛑 停止Qwen语音识别')
    
    // 清理自动停止计时器
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current)
      autoStopTimeoutRef.current = null
    }

    // 清理说话结束检测计时器
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    
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
      
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current)
      }

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
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