import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Zap, Settings, Wifi, WifiOff } from 'lucide-react'
import { useRealtimeChat } from '../hooks/useRealtimeChat'
import { useQwenSpeechRecognition } from '../hooks/useQwenSpeechRecognition'

interface RealtimeVoiceChatProps {
  disabled?: boolean
  onToggle?: () => void
}

const RealtimeVoiceChat: React.FC<RealtimeVoiceChatProps> = ({ disabled }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('Cherry')
  const [showSettings, setShowSettings] = useState(false)

  // 使用Qwen语音识别
  const {
    startListening,
    stopListening
  } = useQwenSpeechRecognition({
    onResult: (text, isFinal) => {
      console.log('🎤 RealtimeVoiceChat 收到ASR结果:', { text, isFinal })
      
      if (isFinal && text && text.trim()) {
        console.log('🎤 RealtimeVoiceChat Qwen ASR最终结果:', text)
        // 最终结果，自动发送给大模型
        sendMessage(text.trim())
        setTranscript('')
      } else if (text && text.trim()) {
        // 部分结果，更新显示
        console.log('🎤 RealtimeVoiceChat Qwen ASR部分结果:', text)
        setTranscript(text)
      }
    },
    onError: (error) => {
      console.error('❌ RealtimeVoiceChat Qwen ASR错误:', error)
      // 如果Qwen ASR失败，提示用户使用浏览器语音识别
      if (error && (error.includes('HTTP 404') || error.includes('API端点不存在'))) {
        alert('Qwen ASR服务暂时不可用，请切换到浏览器语音识别模式。')
      }
    }
  })

  // 实时对话Hook
  const {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    setVoice,
    aiTextBuffer,
    isProcessing,
    isSpeaking
  } = useRealtimeChat({
    onMessage: (message) => {
      console.log('📨 收到消息:', message.type, message)
      
      // 处理ASR部分结果
      if (message.type === 'asr_partial') {
        setTranscript(message.text || '')
      }
    },
    onError: (error) => {
      console.error('❌ 实时对话错误:', error)
    }
  })

  // 开始语音识别
  const handleStartListening = async () => {
    try {
      console.log('🎤 开始Qwen语音识别...')
      setIsListening(true)
      startListening()
      console.log('✅ Qwen语音识别已启动')
    } catch (error) {
      console.error('❌ 启动Qwen语音识别失败:', error)
      alert(`启动语音识别失败: ${error}`)
    }
  }

  // 停止语音识别
  const handleStopListening = () => {
    console.log('🛑 停止Qwen语音识别...')
    setIsListening(false)
    setTranscript('')
    stopListening()
    console.log('✅ Qwen语音识别已停止')
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (transcript.trim()) {
        sendMessage(transcript.trim())
        setTranscript('')
      }
    }
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening()
      }
    }
  }, [isListening, stopListening])

  return (
    <div className="space-y-4">
      {/* 连接状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
          </span>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">语音设置</span>
              <select
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value)
                  setVoice(e.target.value)
                }}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="Cherry">Cherry (女声)</option>
                <option value="ZhiYuan">ZhiYuan (男声)</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">❌ {error}</p>
        </div>
      )}

      {/* 语音识别状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isListening ? (
            <Mic className="w-4 h-4 text-red-500 animate-pulse" />
          ) : (
            <MicOff className="w-4 h-4 text-gray-400" />
          )}
          <span className={`text-sm ${isListening ? 'text-red-600' : 'text-gray-500'}`}>
            {isListening ? '正在录音...' : '点击麦克风开始录音'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isSpeaking ? (
            <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />
          ) : (
            <VolumeX className="w-4 h-4 text-gray-400" />
          )}
          <span className={`text-sm ${isSpeaking ? 'text-blue-600' : 'text-gray-500'}`}>
            {isSpeaking ? '正在播放...' : '等待回复'}
          </span>
        </div>
      </div>

      {/* 语音识别输入 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={isListening ? handleStopListening : handleStartListening}
            disabled={disabled || !isConnected}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } ${disabled || !isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <div className="flex-1">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="语音识别结果或直接输入..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => {
              if (transcript.trim()) {
                sendMessage(transcript.trim())
                setTranscript('')
              }
            }}
            disabled={!transcript.trim() || !isConnected}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
      </div>

      {/* AI回复显示 */}
      {aiTextBuffer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">AI回复</span>
          </div>
          <p className="text-blue-800">{aiTextBuffer}</p>
        </div>
      )}

      {/* 处理状态 */}
      {isProcessing && (
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm">AI正在思考...</span>
        </div>
      )}
    </div>
  )
}

export default RealtimeVoiceChat 