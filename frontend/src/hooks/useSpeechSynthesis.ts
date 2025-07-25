import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechSynthesisOptions {
  voice?: string
  rate?: number
  pitch?: number
  volume?: number
  language?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

interface UseSpeechSynthesisReturn {
  isSupported: boolean
  isSpeaking: boolean
  isPaused: boolean
  voices: SpeechSynthesisVoice[]
  speak: (text: string, options?: Partial<SpeechSynthesisOptions>) => void
  pause: () => void
  resume: () => void
  stop: () => void
  error: string | null
}

export const useSpeechSynthesis = (
  defaultOptions: SpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn => {
  const {
    rate = 1,
    pitch = 1,
    volume = 1,
    language = 'zh-CN',
    onStart,
    onEnd,
    onError
  } = defaultOptions

  const [isSupported] = useState(() => {
    return !!(window.speechSynthesis && window.SpeechSynthesisUtterance)
  })

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [error, setError] = useState<string | null>(null)

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // 获取可用的语音列表
  useEffect(() => {
    if (!isSupported) return

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)
    }

    updateVoices()
    
    // 某些浏览器需要异步加载语音
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [isSupported])

  // 监听语音合成状态
  useEffect(() => {
    if (!isSupported) return

    const checkSpeaking = () => {
      setIsSpeaking(window.speechSynthesis.speaking)
      setIsPaused(window.speechSynthesis.paused)
    }

    const interval = setInterval(checkSpeaking, 100)
    return () => clearInterval(interval)
  }, [isSupported])

  // 获取最适合的中文语音
  const getPreferredVoice = useCallback((voiceName?: string): SpeechSynthesisVoice | null => {
    if (!voices.length) return null

    // 如果指定了语音名称，尝试找到匹配的
    if (voiceName) {
      const namedVoice = voices.find(voice => voice.name === voiceName)
      if (namedVoice) return namedVoice
    }

    // 查找中文语音，优先级：zh-CN > zh > 包含Chinese的
    const chineseVoices = voices.filter(voice => 
      voice.lang.startsWith('zh-CN') || 
      voice.lang.startsWith('zh') ||
      voice.name.toLowerCase().includes('chinese')
    )

    if (chineseVoices.length > 0) {
      // 优先选择zh-CN的女性语音
      const femaleZhCN = chineseVoices.find(voice => 
        voice.lang === 'zh-CN' && voice.name.toLowerCase().includes('female')
      )
      if (femaleZhCN) return femaleZhCN

      // 其次选择任何zh-CN语音
      const zhCNVoice = chineseVoices.find(voice => voice.lang === 'zh-CN')
      if (zhCNVoice) return zhCNVoice

      // 最后选择任何中文语音
      return chineseVoices[0]
    }

    // 如果没有中文语音，返回默认语音
    return voices[0] || null
  }, [voices])

  // 语音合成函数
  const speak = useCallback((text: string, options: Partial<SpeechSynthesisOptions> = {}) => {
    console.log('🗣️ useSpeechSynthesis speak 被调用:', {
      text: text.slice(0, 50) + '...',
      isSupported,
      textLength: text.length
    })

    if (!isSupported) {
      console.error('❌ 浏览器不支持语音合成')
      return
    }

    if (!text.trim()) {
      console.log('⚠️ 空文本，跳过语音合成')
      return
    }

    // 清除之前的错误状态
    setError(null)

    // 停止当前播放
    if (currentUtteranceRef.current) {
      console.log('🛑 停止当前语音合成')
      window.speechSynthesis.cancel()
      currentUtteranceRef.current = null
    }

    // 确保语音合成引擎已准备好
    if (window.speechSynthesis.speaking) {
      console.log('⏳ 等待当前语音完成...')
      window.speechSynthesis.cancel()
    }

    try {
      console.log('🎯 创建新的语音合成任务')
      const utterance = new SpeechSynthesisUtterance(text)
      currentUtteranceRef.current = utterance

      // 设置语音参数
      utterance.rate = options.rate ?? rate
      utterance.pitch = options.pitch ?? pitch
      utterance.volume = options.volume ?? volume
      utterance.lang = options.language ?? language

      console.log('⚙️ 语音合成参数:', {
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume,
        lang: utterance.lang
      })

      // 设置语音
      const selectedVoice = getPreferredVoice(options.voice)
      if (selectedVoice) {
        utterance.voice = selectedVoice
        console.log('🎵 选择的语音:', selectedVoice.name)
      } else {
        console.log('⚠️ 未找到合适的中文语音，使用默认语音')
      }

      // 事件处理
      utterance.onstart = () => {
        console.log('🎵 语音合成开始播放 (onstart事件)')
        setIsSpeaking(true)
        setError(null)
        onStart?.()
      }

      utterance.onend = () => {
        console.log('✅ 语音合成播放完成 (onend事件)')
        setIsSpeaking(false)
        setIsPaused(false)
        currentUtteranceRef.current = null
        onEnd?.()
      }

      utterance.onerror = (event: any) => {
        console.log('🚨 语音合成错误事件:', event.error, event)
        
        // 某些错误是正常的，不需要报告给用户
        if (event.error === 'canceled' || event.error === 'interrupted') {
          console.log('⚠️ 语音合成被取消（正常）')
          setError(null) // 不设置错误状态
        } else {
          const errorMessage = `语音合成错误: ${event.error}`
          console.error('❌ 语音合成严重错误:', errorMessage)
          setError(errorMessage)
          onError?.(errorMessage)
        }
        
        setIsSpeaking(false)
        setIsPaused(false)
        currentUtteranceRef.current = null
      }

      utterance.onpause = () => {
        setIsPaused(true)
      }

      utterance.onresume = () => {
        setIsPaused(false)
      }

      // 开始播放 - 立即启动，无延迟
      console.log('🚀 启动语音合成...')
      console.log('🔍 当前语音合成状态:', {
        speaking: window.speechSynthesis.speaking,
        pending: window.speechSynthesis.pending,
        paused: window.speechSynthesis.paused
      })
      
      try {
        console.log('🎯 实际开始语音合成播放')
        window.speechSynthesis.speak(utterance)
        
        // 立即检查是否成功加入队列
        setTimeout(() => {
          console.log('📊 播放后状态检查:', {
            speaking: window.speechSynthesis.speaking,
            pending: window.speechSynthesis.pending,
            isSpeaking
          })
        }, 50)

        // 添加轮询监控，处理事件不触发的情况
        const pollInterval = setInterval(() => {
          if (currentUtteranceRef.current !== utterance) {
            clearInterval(pollInterval)
            return
          }

          const browserSpeaking = window.speechSynthesis.speaking
          const browserPending = window.speechSynthesis.pending

          // 如果浏览器在播放但我们的状态是false，修复状态
          if (browserSpeaking && !isSpeaking) {
            console.log('🔄 轮询检测：修复语音播放状态')
            setIsSpeaking(true)
            setError(null)
          }
          
          // 如果浏览器停止播放但我们的状态还是true，清理状态
          if (!browserSpeaking && !browserPending && isSpeaking) {
            console.log('🔄 轮询检测：语音播放已结束，清理状态')
            setIsSpeaking(false)
            currentUtteranceRef.current = null
            clearInterval(pollInterval)
          }
        }, 200) // 每200ms检查一次

        // 10秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval)
        }, 10000)
        
        // 设置智能超时检查 - 同时检查浏览器状态和hook状态
        setTimeout(() => {
          const browserSpeaking = window.speechSynthesis.speaking
          const browserPending = window.speechSynthesis.pending
          const hasCurrentUtterance = currentUtteranceRef.current === utterance
          
          console.log('🔍 超时检查状态:', {
            browserSpeaking,
            browserPending, 
            isSpeaking,
            hasCurrentUtterance,
            shouldConsiderFailed: !browserSpeaking && !browserPending && !isSpeaking
          })
          
          // 只有当浏览器确实没有在播放时才认为失败
          if (hasCurrentUtterance && !browserSpeaking && !browserPending && !isSpeaking) {
            console.log('⏰ 语音合成确实启动失败')
            setError('语音合成被浏览器阻止，请手动点击播放按钮')
            currentUtteranceRef.current = null
          } else if (hasCurrentUtterance && browserSpeaking && !isSpeaking) {
            // 浏览器在播放但onstart没触发，手动设置状态
            console.log('🔧 修复语音合成状态：浏览器在播放但事件未触发')
            setIsSpeaking(true)
            setError(null)
          } else if (hasCurrentUtterance && (browserSpeaking || isSpeaking)) {
            console.log('✅ 语音合成正常工作中')
          }
        }, 3000)
      } catch (startErr) {
        console.error('❌ 启动语音合成失败:', startErr)
        setError('启动语音合成失败')
        currentUtteranceRef.current = null
      }
      
    } catch (err) {
      const errorMessage = '创建语音合成任务失败'
      console.error('❌ Speech synthesis creation error:', err)
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [isSupported, rate, pitch, volume, language, getPreferredVoice, onStart, onEnd, onError])

  // 暂停
  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return
    window.speechSynthesis.pause()
  }, [isSupported, isSpeaking])

  // 恢复
  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return
    window.speechSynthesis.resume()
  }, [isSupported, isPaused])

  // 停止
  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
    currentUtteranceRef.current = null
  }, [isSupported])

  // 清理函数
  useEffect(() => {
    return () => {
      if (isSupported && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSupported])

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    speak,
    pause,
    resume,
    stop,
    error
  }
} 