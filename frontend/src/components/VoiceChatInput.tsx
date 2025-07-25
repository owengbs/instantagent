import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Send, Settings, Keyboard } from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useQwenTTS } from '../hooks/useQwenTTS'
import { useChat } from '../contexts/ChatContext'
import AudioVisualizer from './AudioVisualizer.tsx'
import { ChatInputProps } from '../types'

interface VoiceChatInputProps extends ChatInputProps {
  autoSpeak?: boolean
  showTextInput?: boolean
  onVoiceToggle?: (isVoiceMode: boolean) => void
}

const VoiceChatInput: React.FC<VoiceChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "点击麦克风说话...",
  autoSpeak = true,
  showTextInput = true,
  onVoiceToggle
}) => {
  const [isVoiceMode, setIsVoiceMode] = useState(true)
  const [textInput, setTextInput] = useState('')
  const [lastAIResponse, setLastAIResponse] = useState('')
  const lastProcessedResponseRef = useRef('')
  const [showSettings, setShowSettings] = useState(false)
  const [speechSettings, setSpeechSettings] = useState({
    rate: 1,
    pitch: 1,
    volume: 1,
    voiceEnabled: true,
    selectedVoice: 'Cherry' // 默认使用Cherry语音
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { setOnNewAIResponse } = useChat()

  // 语音识别 - 使用和测试页面相同的简化配置
  const {
    isSupported: recognitionSupported,
    isListening,
    finalTranscript,
    interimTranscript,
    error: recognitionError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    language: 'zh-CN',
    continuous: false,
    interimResults: true
  })

  // 语音结果处理状态
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('')

  // 处理语音识别结果 - 监听finalTranscript变化
  useEffect(() => {
    if (finalTranscript && finalTranscript.trim() && finalTranscript !== lastProcessedTranscript) {
      console.log('🎤 VoiceChatInput 收到最终语音结果:', finalTranscript)
      setLastProcessedTranscript(finalTranscript)
      handleVoiceInput(finalTranscript.trim())
      
      // 延迟重置，确保消息发送完成
      setTimeout(() => {
        resetTranscript()
        setLastProcessedTranscript('')
      }, 1000)
    }
  }, [finalTranscript, lastProcessedTranscript])

  // 调试日志：监控关键状态变化（只记录重要状态）
  useEffect(() => {
    if (isListening || recognitionError) {
      console.log('🔍 VoiceChatInput 重要状态变化:', {
        isListening,
        error: recognitionError,
        finalTranscript: finalTranscript?.slice(0, 20) + '...'
      })
    }
  }, [isListening, recognitionError, finalTranscript])

  // Qwen-TTS 语音合成
  const {
    isSupported: synthesisSupported,
    isSpeaking,
    speak,
    stop: stopSpeaking,
    voices,
    error: synthesisError,
    isLoading: isSynthesisLoading
  } = useQwenTTS({
    voice: speechSettings.selectedVoice || 'Cherry',
    onStart: () => console.log('🎵 Qwen-TTS 语音合成开始'),
    onEnd: () => console.log('✅ Qwen-TTS 语音合成结束'),
    onError: (error) => console.error('❌ Qwen-TTS 错误:', error)
  })

  // 处理语音输入
  const handleVoiceInput = async (transcript: string) => {
    console.log('📤 VoiceChatInput 准备发送语音消息:', transcript)
    
    if (!transcript.trim() || disabled) {
      console.log('⚠️ 语音消息被忽略:', { transcript: transcript.trim(), disabled })
      return
    }

    try {
      console.log('🚀 调用 onSendMessage:', transcript)
      await onSendMessage(transcript)
      console.log('✅ 语音消息发送成功')
    } catch (error) {
      console.error('❌ 语音消息发送失败:', error)
    }
    
    // 重置转录
    resetTranscript()
  }

  // 处理文本输入
  const handleTextSubmit = () => {
    if (!textInput.trim() || disabled) return
    
    onSendMessage(textInput.trim())
    setTextInput('')
    
    // 重置textarea高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // 语音模式切换
  const toggleVoiceMode = () => {
    const newMode = !isVoiceMode
    setIsVoiceMode(newMode)
    onVoiceToggle?.(newMode)
    
    if (!newMode && isListening) {
      stopListening()
    }
    
    if (newMode && isSpeaking) {
      stopSpeaking()
    }
  }

  // 预初始化语音合成，避免浏览器限制
  const preinitializeSpeech = () => {
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      try {
        console.log('🔧 预初始化语音合成以避免浏览器限制')
        // 播放一个静音的短语音来激活语音合成
        const utterance = new SpeechSynthesisUtterance('')
        utterance.volume = 0
        utterance.rate = 10
        utterance.onend = () => {
          console.log('✅ 语音合成预初始化完成')
        }
        window.speechSynthesis.speak(utterance)
      } catch (error) {
        console.log('⚠️ 语音合成预初始化失败:', error)
      }
    }
  }

  // 麦克风控制
  const handleMicClick = () => {
    console.log('🎤 VoiceChatInput 麦克风按钮被点击！', {
      isListening,
      isSupported: recognitionSupported,
      disabled,
      isVoiceMode,
      error: recognitionError,
      timestamp: new Date().toISOString()
    })
    
    // 在用户点击时预初始化语音合成
    preinitializeSpeech()
    
    if (isListening) {
      console.log('🛑 VoiceChatInput 停止语音识别')
      stopListening()
    } else {
      console.log('🎙️ VoiceChatInput 准备开始语音识别')
      
      // 检查支持性和权限
      if (!recognitionSupported) {
        console.error('❌ VoiceChatInput 浏览器不支持语音识别')
        alert('您的浏览器不支持语音识别功能，请使用Chrome、Edge或Safari最新版本')
        return
      }
      
      if (recognitionError) {
        console.error('❌ VoiceChatInput 语音识别错误:', recognitionError)
        alert(`语音识别错误: ${recognitionError}`)
        return
      }
      
      console.log('🚀 VoiceChatInput 即将调用 startListening()')
      console.log('🔧 当前语音识别状态:', { isListening, recognitionSupported, disabled })
      
      // 先重置状态，确保没有残留
      resetTranscript()
      
      // 延迟调用，确保状态更新
      setTimeout(() => {
        console.log('⏰ 延迟调用 startListening()')
        startListening()
        
        // 再次检查状态
        setTimeout(() => {
          console.log('🔍 startListening调用后的状态检查:', { isListening })
        }, 500)
      }, 100)
    }
  }

  // (toggleSpeaking函数已被handleManualPlay替代)

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }

  // 自动调整textarea高度
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value)
    adjustTextareaHeight()
  }

  // 使用 useRef 存储最新的speak函数，避免依赖问题
  const speakRef = useRef(speak)
  const autoSpeakRef = useRef(autoSpeak)
  const synthesisSettingsRef = useRef(speechSettings)
  
  // 更新refs
  useEffect(() => {
    speakRef.current = speak
    autoSpeakRef.current = autoSpeak
    synthesisSettingsRef.current = speechSettings
  })

  // 监听AI回复 - 只设置一次回调，避免重复请求
  useEffect(() => {
    const handleNewAIResponse = (response: string) => {
      console.log('🎵 VoiceChatInput 收到AI回复回调:', {
        response: response.slice(0, 50) + '...',
        responseLength: response.length,
        timestamp: new Date().toISOString()
      })
      
      // 防重复处理：检查是否是同一个回复
      if (lastProcessedResponseRef.current === response) {
        console.log('⚠️ 重复的AI回复，跳过处理')
        return
      }
      
      // 记录已处理的回复
      lastProcessedResponseRef.current = response
      
      // 保存最新的AI回复
      setLastAIResponse(response)
      
      // 使用ref获取最新值，避免闭包问题
      const currentAutoSpeak = autoSpeakRef.current
      const currentSettings = synthesisSettingsRef.current
      const currentSpeak = speakRef.current
      
      // 如果启用了自动播放且浏览器支持语音合成，则自动播放
      if (currentAutoSpeak && synthesisSupported && currentSettings.voiceEnabled) {
        console.log('🔊 自动开始Qwen-TTS语音合成播放')
        try {
          currentSpeak(response)
          console.log('✅ 自动语音合成调用成功')
        } catch (error) {
          console.error('❌ 自动语音合成失败:', error)
        }
      } else {
        console.log('📝 AI回复已保存，自动播放已禁用')
      }
    }
    
    console.log('📝 设置AI回复自动播放回调（一次性）')
    setOnNewAIResponse(handleNewAIResponse)
    
    // 清理函数
    return () => {
      console.log('🧹 清理AI回复自动播放回调')
      setOnNewAIResponse(() => {})
    }
  }, [setOnNewAIResponse, synthesisSupported]) // 只保留必要的依赖

  // 手动播放最新AI回复 - 在用户点击事件中直接调用
  const handleManualPlay = () => {
    console.log('🎯 用户点击播放按钮', {
      hasLastResponse: !!lastAIResponse,
      isSpeaking,
      synthesisSupported,
      hasError: !!synthesisError
    })

    if (isSpeaking) {
      console.log('🛑 停止当前播放')
      stopSpeaking()
      return
    }

    if (!lastAIResponse) {
      console.log('⚠️ 没有可播放的AI回复')
      return
    }

    if (!synthesisSupported) {
      console.error('❌ 浏览器不支持语音合成')
      return
    }

    console.log('🎵 开始手动播放AI回复:', {
      text: lastAIResponse.slice(0, 50) + '...',
      length: lastAIResponse.length
    })

    // 在用户点击事件中立即调用语音合成，这样有最大的成功概率
    try {
      speak(lastAIResponse)
      console.log('✅ 语音合成调用成功')
    } catch (error) {
      console.error('❌ 手动播放失败:', error)
    }
  }

  const currentTranscript = finalTranscript + interimTranscript

  // 渲染前的最终状态检查
  console.log('🖼️ VoiceChatInput 即将渲染:', {
    isVoiceMode,
    recognitionSupported,
    disabled,
    isListening,
    hasError: !!recognitionError,
    timestamp: new Date().toISOString()
  })

  return (
    <div className="space-y-4">
      {/* 错误提示 */}
      <AnimatePresence>
        {(recognitionError || synthesisError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <p className="text-red-700 text-sm">
              ⚠️ {recognitionError || synthesisError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 语音状态显示 */}
      <AnimatePresence>
        {isVoiceMode && (isListening || isSpeaking || currentTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  isListening ? 'bg-red-500 animate-pulse' : 
                  isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-sm font-medium text-gray-700">
                  {isListening ? '正在听取您的话语...' : 
                   isSpeaking ? '正在播放回复...' : 
                   currentTranscript ? '识别完成' : '等待中'}
                </span>
              </div>
              
              <AudioVisualizer
                isActive={isListening || isSpeaking}
                type={isListening ? 'recording' : 'speaking'}
                size="small"
              />
            </div>
            
            {/* 实时转录显示 */}
            {currentTranscript && (
              <div className="bg-white rounded-lg p-3 text-sm">
                <span className="text-gray-500">识别结果：</span>
                <span className="text-gray-800 ml-2">
                  {finalTranscript}
                  <span className="text-gray-400">{interimTranscript}</span>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主输入区域 */}
      <div className="relative">
        <div className={`flex items-end space-x-3 p-4 bg-white rounded-2xl shadow-lg border-2 transition-all duration-200 ${
          disabled 
            ? 'border-gray-200 bg-gray-50' 
            : isVoiceMode 
              ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50'
              : 'border-gray-200 focus-within:border-blue-300'
        }`}>
          
          {/* 模式切换按钮 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleVoiceMode}
            disabled={disabled}
            className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 ${
              isVoiceMode 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isVoiceMode ? '切换到文字输入' : '切换到语音输入'}
          >
            {isVoiceMode ? <Mic className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
          </motion.button>

          {/* 输入区域 */}
          <div className="flex-1">
            {isVoiceMode ? (
              // 语音模式
              <div className="flex items-center justify-center py-4">
                <button
                  onClick={(e) => {
                    console.log('🎯 原生按钮点击事件触发!', e)
                    e.preventDefault()
                    e.stopPropagation()
                    handleMicClick()
                  }}
                  onMouseDown={(e) => {
                    console.log('🖱️ 原生按钮鼠标按下事件触发', e)
                  }}
                  onPointerDown={(e) => {
                    console.log('👆 原生按钮指针按下事件触发', e)
                  }}
                  disabled={disabled || !recognitionSupported}
                  className={`p-6 rounded-full transition-all duration-200 cursor-pointer relative ${
                    isListening 
                      ? 'bg-red-500 text-white shadow-xl scale-110' 
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{
                    zIndex: 10,
                    position: 'relative',
                    pointerEvents: 'auto'
                  }}
                >
                  {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
              </div>
            ) : (
              // 文字模式
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className="w-full resize-none border-none outline-none bg-transparent text-gray-800 placeholder-gray-400 disabled:cursor-not-allowed disabled:text-gray-500"
                style={{ 
                  minHeight: '24px',
                  maxHeight: '120px',
                  lineHeight: '24px'
                }}
              />
            )}
          </div>

          {/* 控制按钮组 */}
          <div className="flex items-center space-x-2">
            {/* 语音播放控制 - 支持手动播放AI回复 */}
            {synthesisSupported && (
              <div className="flex items-center space-x-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleManualPlay}
                  disabled={disabled || (!lastAIResponse && !isSpeaking && !isSynthesisLoading)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isSpeaking 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : isSynthesisLoading
                        ? 'bg-yellow-500 text-white'
                        : lastAIResponse 
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-100 text-gray-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={
                    isSpeaking 
                      ? '停止播放' 
                      : isSynthesisLoading
                        ? '正在实时合成语音...'
                        : lastAIResponse 
                          ? '播放AI回复 (Qwen-TTS Realtime)' 
                          : '暂无可播放内容'
                  }
                >
                  {isSpeaking ? (
                    <VolumeX className="w-4 h-4" />
                  ) : isSynthesisLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </motion.button>
                
                {/* 状态提示 */}
                {synthesisError && synthesisError.includes('浏览器阻止') && (
                  <span className="text-xs text-orange-600 whitespace-nowrap">
                    👆点击播放
                  </span>
                )}
                
                {synthesisError && synthesisError.includes('canceled') && (
                  <span className="text-xs text-blue-600 whitespace-nowrap">
                    手动播放
                  </span>
                )}
                
                {isSynthesisLoading && (
                  <span className="text-xs text-yellow-600 whitespace-nowrap">
                    实时合成...
                  </span>
                )}
                
                {isSpeaking && !isSynthesisLoading && (
                  <span className="text-xs text-red-600 whitespace-nowrap">
                    播放中...
                  </span>
                )}
                
                {lastAIResponse && !isSpeaking && !isSynthesisLoading && !synthesisError && (
                  <span className="text-xs text-green-600 whitespace-nowrap">
                    Realtime
                  </span>
                )}
                
                {!lastAIResponse && !isSpeaking && !isSynthesisLoading && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    等待回复
                  </span>
                )}
                
                {process.env.NODE_ENV === 'development' && (
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    Debug: {isSpeaking ? 'playing' : 'idle'}
                  </span>
                )}
              </div>
            )}

            {/* 设置按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(!showSettings)}
              disabled={disabled}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="语音设置"
            >
              <Settings className="w-4 h-4" />
            </motion.button>

            {/* 发送按钮（文字模式） */}
            {!isVoiceMode && (
              <motion.button
                whileHover={!disabled ? { scale: 1.05 } : {}}
                whileTap={!disabled ? { scale: 0.95 } : {}}
                onClick={handleTextSubmit}
                disabled={disabled || !textInput.trim()}
                className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 ${
                  disabled || !textInput.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                }`}
                title="发送消息 (Enter)"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>

        {/* 功能提示 */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>
              {isVoiceMode 
                ? `🎤 ${recognitionSupported ? '点击麦克风开始录音' : '浏览器不支持语音识别'}` 
                : '💡 按 Enter 发送，Shift + Enter 换行'
              }
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              disabled ? 'bg-red-500' : 'bg-green-500'
            }`} />
            <span>{disabled ? '连接中' : '已连接'}</span>
          </div>
        </div>
      </div>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-4 space-y-4"
          >
            <h3 className="font-medium text-gray-800 mb-3">语音设置</h3>
            
            {/* 语音开关 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">自动播放AI回复</label>
              <button
                onClick={() => setSpeechSettings(prev => ({
                  ...prev,
                  voiceEnabled: !prev.voiceEnabled
                }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  speechSettings.voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute w-5 h-5 bg-white rounded-full transition-transform top-0.5 ${
                  speechSettings.voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Qwen-TTS 语音选择 */}
            {speechSettings.voiceEnabled && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">选择语音</label>
                  <select
                    value={speechSettings.selectedVoice}
                    onChange={(e) => setSpeechSettings(prev => ({
                      ...prev,
                      selectedVoice: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {voices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} - {voice.description} ({voice.dialect})
                      </option>
                    ))}
                    {voices.length === 0 && (
                      <option value="Cherry">Cherry - 温柔甜美女声 (标准普通话)</option>
                    )}
                  </select>
                </div>

                {/* 语音信息显示 */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>🚀 当前使用: Qwen-TTS Realtime API</p>
                  <p>⚡ 实时流式合成，无需等待</p>
                  <p>🎭 可用语音: {voices.length > 0 ? voices.length : '加载中...'} 个</p>
                  <p>🌐 支持: 中英双语、方言 (Cherry、Dylan、Jada等)</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default VoiceChatInput 