import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

interface UseSpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (result: SpeechRecognitionResult) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  transcript: string
  interimTranscript: string
  finalTranscript: string
  confidence: number
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

// 类型声明增强
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const {
    language = 'zh-CN',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onStart,
    onEnd
  } = options

  const [isSupported] = useState(() => {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  })

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 初始化语音识别
  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()

    const recognition = recognitionRef.current
    recognition.language = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      onStart?.()
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcriptPart = result[0].transcript

        if (result.isFinal) {
          final += transcriptPart
          setConfidence(result[0].confidence || 0)
        } else {
          interim += transcriptPart
        }
      }

      setInterimTranscript(interim)
      if (final) {
        setFinalTranscript(prev => prev + final)
        setTranscript(prev => prev + final)
      }

      // 调用回调函数
      if (final || interim) {
        onResult?.({
          transcript: final || interim,
          isFinal: !!final,
          confidence: confidence
        })
      }

      // 如果有最终结果且不是连续模式，自动停止
      if (final && !continuous) {
        stopListening()
      }
    }

    recognition.onerror = (event: any) => {
      console.error('🚨 语音识别错误事件:', event)
      
      let errorMessage = '语音识别出现问题'
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
          break
        case 'no-speech':
          errorMessage = '没有检测到语音，请重试'
          break
        case 'audio-capture':
          errorMessage = '无法捕获音频，请检查麦克风连接'
          break
        case 'network':
          errorMessage = '网络连接问题，请检查网络连接'
          break
        case 'service-not-allowed':
          errorMessage = '语音识别服务不可用'
          break
        case 'bad-grammar':
          errorMessage = '语音识别配置错误'
          break
        case 'language-not-supported':
          errorMessage = '不支持当前语言'
          break
        default:
          errorMessage = `语音识别错误: ${event.error}`
      }
      
      console.error('❌ 语音识别错误:', errorMessage)
      setError(errorMessage)
      setIsListening(false)
      onError?.(errorMessage)
    }

    recognition.onend = () => {
      setIsListening(false)
      onEnd?.()
    }

    return () => {
      if (recognition) {
        recognition.abort()
      }
    }
  }, [language, continuous, interimResults, onResult, onError, onStart, onEnd, isSupported])

  // 开始监听
  const startListening = useCallback(() => {
    console.log('🎙️ startListening 被调用', {
      isSupported,
      hasRecognition: !!recognitionRef.current,
      isListening,
      error
    })

    if (!isSupported) {
      const errorMsg = '浏览器不支持语音识别功能'
      setError(errorMsg)
      console.error('❌', errorMsg)
      return
    }

    if (!recognitionRef.current) {
      const errorMsg = '语音识别对象未初始化'
      setError(errorMsg)
      console.error('❌', errorMsg)
      return
    }

    if (isListening) {
      console.log('⚠️ 已经在监听中，忽略重复调用')
      return
    }

    try {
      console.log('🚀 准备启动语音识别...')
      setError(null)
      setInterimTranscript('')
      
      // 确保之前的识别已停止
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // 忽略停止错误
      }
      
      // 短暂延迟后启动
      setTimeout(() => {
        try {
          console.log('🎯 正在启动语音识别...')
          recognitionRef.current!.start()
        } catch (startErr: any) {
          console.error('❌ 启动语音识别失败:', startErr)
          
          let errorMessage = '启动语音识别失败'
          if (startErr.name === 'NotAllowedError') {
            errorMessage = '麦克风权限被拒绝，请允许访问麦克风'
          } else if (startErr.name === 'NotFoundError') {
            errorMessage = '未找到麦克风设备'
          } else if (startErr.name === 'NotSupportedError') {
            errorMessage = '浏览器不支持语音识别'
          } else if (startErr.message?.includes('already started')) {
            errorMessage = '语音识别已在运行中'
          }
          
          setError(errorMessage)
        }
      }, 100)

      // 添加超时保护
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ 语音识别超时，自动停止')
        if (isListening) {
          stopListening()
        }
      }, 30000) // 30秒超时
      
    } catch (err: any) {
      const errorMessage = `启动语音识别异常: ${err.message || err}`
      setError(errorMessage)
      console.error('❌ 语音识别启动异常:', err)
    }
  }, [isSupported, isListening, error])

  // 停止监听
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return

    try {
      recognitionRef.current.stop()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    } catch (err) {
      console.error('Speech recognition stop error:', err)
    }
  }, [isListening])

  // 重置转录
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalTranscript('')
    setConfidence(0)
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (recognitionRef.current && isListening) {
        recognitionRef.current.abort()
      }
    }
  }, [isListening])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
} 