import { useState, useEffect, useRef, useCallback } from 'react'

interface QwenTTSVoice {
  name: string
  language: string
  description: string
  dialect: string
}

interface QwenTTSOptions {
  voice?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

interface QwenTTSReturn {
  isSupported: boolean
  isSpeaking: boolean
  speak: (text: string) => Promise<void>
  stop: () => void
  voices: QwenTTSVoice[]
  error: string | null
  isLoading: boolean
}

import { API_CONFIG } from '../config/api'

const API_BASE_URL = API_CONFIG.endpoints.tts()

// 在开发/外网调试（如 ngrok）时，优先走相对路径命中 Vite 代理，避免跨域/证书等导致返回HTML
const buildUrl = (path: string) => {
  const base = API_BASE_URL
  if (!base) return `/api/tts${path}`
  // base 可能为 ''（相对），或 'http(s)://.../api/tts'
  return base.startsWith('http') ? `${base}${path}` : `/api/tts${path}`
}

// Web Audio API 上下文
let audioContext: AudioContext | null = null

// 获取或创建AudioContext
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

export const useQwenTTS = (options: QwenTTSOptions = {}): QwenTTSReturn => {
  const {
    voice = 'Cherry',
    onStart,
    onEnd,
    onError
  } = options

  const [isSupported, setIsSupported] = useState(true) // Qwen-TTS always supported
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<QwenTTSVoice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const currentAudioRef = useRef<any>(null)  // 支持HTMLAudioElement和Web Audio API对象
  const abortControllerRef = useRef<AbortController | null>(null)

  // 获取可用语音列表 - 移除依赖避免无限循环
  const fetchVoices = useCallback(async () => {
    try {
      console.log('🎤 获取Qwen-TTS语音列表...')
      const response = await fetch(buildUrl('/voices'))
      
      if (!response.ok) {
        throw new Error(`获取语音列表失败: ${response.status}`)
      }

      const voicesData = await response.json()
      console.log('🎵 获取到语音列表:', voicesData)
      setVoices(voicesData)
      
      // 添加默认语音选项（防止API返回空数组）
      if (voicesData.length === 0) {
        setVoices([
          { name: 'Cherry', language: 'Chinese/English', description: '温柔甜美女声', dialect: 'Standard Mandarin' },
          { name: 'Ethan', language: 'Chinese/English', description: '成熟稳重男声', dialect: 'Standard Mandarin' },
          { name: 'Chelsie', language: 'Chinese/English', description: '活泼可爱女声', dialect: 'Standard Mandarin' },
          { name: 'Serena', language: 'Chinese/English', description: '优雅知性女声', dialect: 'Standard Mandarin' }
        ])
      }
    } catch (err) {
      console.error('❌ 获取语音列表失败:', err)
      setError('获取语音列表失败')
      
      // 设置默认语音
      setVoices([
        { name: 'Cherry', language: 'Chinese/English', description: '温柔甜美女声', dialect: 'Standard Mandarin' }
      ])
    }
  }, []) // 移除onError依赖

  // 检查TTS服务健康状态 - 移除依赖避免无限循环
  const checkTTSHealth = useCallback(async () => {
    try {
      const response = await fetch(buildUrl('/health'))
      const health = await response.json()
      
      if (health.status !== 'healthy') {
        console.warn('⚠️ TTS服务状态异常:', health)
        setError('TTS服务不可用')
        setIsSupported(false)
      } else {
        console.log('✅ TTS服务健康检查通过')
        setIsSupported(true)
        setError(null)
      }
    } catch (err) {
      console.error('❌ TTS健康检查失败:', err)
      setError('TTS服务连接失败')
      setIsSupported(false)
    }
  }, []) // 保持空依赖数组

  // 语音合成函数
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) {
      console.warn('⚠️ 文本为空，跳过语音合成')
      return
    }

    if (isSpeaking) {
      console.log('🛑 正在播放中，先停止当前播放')
      stop()
    }

    try {
      console.log('🗣️ 开始Qwen-TTS语音合成:', { text: text.slice(0, 50) + '...', voice })
      
      setIsSpeaking(true)
      setIsLoading(true)
      setError(null)
      onStart?.()

      // 创建中止控制器
      abortControllerRef.current = new AbortController()

      // 调用TTS API
      const response = await fetch(buildUrl('/synthesize'), {
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
        throw new Error(`TTS合成失败: ${response.status} - ${errorText}`)
      }

      // 获取音频数据 (PCM格式)
      const arrayBuffer = await response.arrayBuffer()
      const sampleRate = parseInt(response.headers.get('X-Sample-Rate') || '24000')
      const channels = parseInt(response.headers.get('X-Channels') || '1')
      
      console.log('🎵 PCM音频合成完成，开始播放', { 
        size: arrayBuffer.byteLength, 
        sampleRate, 
        channels 
      })
      setIsLoading(false)

             // 使用Web Audio API播放PCM音频
       await playPCMAudio(arrayBuffer, sampleRate, channels)

       // PCM音频播放函数
       async function playPCMAudio(arrayBuffer: ArrayBuffer, sampleRate: number, channels: number) {
         try {
           const context = getAudioContext()
           
           // 确保AudioContext已恢复
           if (context.state === 'suspended') {
             await context.resume()
           }
           
           // 将PCM数据转换为Float32Array
           const pcmData = new Int16Array(arrayBuffer)
           const audioBuffer = context.createBuffer(channels, pcmData.length / channels, sampleRate)
           
           // 转换16位PCM到Float32格式
           const channelData = audioBuffer.getChannelData(0)
           for (let i = 0; i < pcmData.length; i++) {
             channelData[i] = pcmData[i] / 32768.0  // 16位PCM归一化
           }
           
           // 创建音频源
           const source = context.createBufferSource()
           source.buffer = audioBuffer
           source.connect(context.destination)
           
           // 设置播放事件
           source.onended = () => {
             console.log('✅ PCM音频播放结束')
             setIsSpeaking(false)
             setIsLoading(false)
             currentAudioRef.current = null
             onEnd?.()
           }
           
           // 保存引用以便停止
           currentAudioRef.current = { 
             stop: () => source.stop(),
             pause: () => source.stop(), // PCM音频无法暂停，只能停止
             currentTime: 0
           } as any
           
           // 开始播放
           console.log('▶️ PCM音频播放开始')
           setIsSpeaking(true)
           source.start(0)
           onStart?.()
           
         } catch (err) {
           console.error('❌ PCM音频播放错误:', err)
           setIsSpeaking(false)
           setIsLoading(false)
           setError('PCM音频播放失败')
           currentAudioRef.current = null
           onError?.('PCM音频播放失败')
         }
       }

    } catch (err) {
      console.error('❌ Qwen-TTS语音合成失败:', err)
      setIsSpeaking(false)
      setIsLoading(false)
      
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🛑 语音合成被用户取消')
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
    }
  }, [voice]) // 只保留voice依赖，避免无限循环

  // 停止播放
  const stop = useCallback(() => {
    console.log('🛑 停止Qwen-TTS播放')
    
    // 中止网络请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // 停止音频播放 (支持Web Audio API和传统Audio)
    if (currentAudioRef.current) {
      try {
        if (typeof currentAudioRef.current.stop === 'function') {
          // Web Audio API AudioBufferSourceNode
          currentAudioRef.current.stop()
        } else if (typeof currentAudioRef.current.pause === 'function') {
          // 传统HTML Audio元素
          currentAudioRef.current.pause()
          currentAudioRef.current.currentTime = 0
        }
      } catch (err) {
        console.warn('停止音频时出现警告:', err)
      }
      currentAudioRef.current = null
    }

    setIsSpeaking(false)
    setIsLoading(false)
  }, [])

  // 组件初始化 - 只执行一次
  useEffect(() => {
    console.log('🔧 初始化Qwen-TTS Hook')
    checkTTSHealth()
    fetchVoices()
    
    // 清理函数
    return () => {
      stop()
    }
  }, []) // 空依赖数组，只在组件挂载时执行一次

  return {
    isSupported,
    isSpeaking,
    speak,
    stop,
    voices,
    error,
    isLoading
  }
} 