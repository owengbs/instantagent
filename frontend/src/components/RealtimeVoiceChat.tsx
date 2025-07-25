import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Zap, Settings, Wifi, WifiOff } from 'lucide-react'
import { useRealtimeChat } from '../hooks/useRealtimeChat'

interface RealtimeVoiceChatProps {
  disabled?: boolean
  onToggle?: () => void
}

// 音频录制器类
class AudioRecorder {
  private context: AudioContext
  private stream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private isRecording = false
  private sampleRate: number
  private onAudioData: (data: ArrayBuffer) => void

  constructor(sampleRate: number = 16000, onAudioData: (data: ArrayBuffer) => void) {
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
        this.onAudioData(pcmData.buffer)
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

const RealtimeVoiceChat: React.FC<RealtimeVoiceChatProps> = ({ disabled, onToggle }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('Cherry')
  const [showSettings, setShowSettings] = useState(false)

  const recorderRef = useRef<AudioRecorder | null>(null)

  // 实时对话Hook
  const {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    setVoice,
    startASR,
    stopASR,
    sendAudioData,
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
      console.log('🎤 开始语音识别...')
      
      // 创建音频录制器
      recorderRef.current = new AudioRecorder(16000, (audioData) => {
        // 发送音频数据到WebSocket
        sendAudioData(audioData)
      })
      
      // 开始录制
      await recorderRef.current.start()
      setIsListening(true)
      
      // 通知后端开始ASR
      startASR()
      
      console.log('✅ 语音识别已启动')
      
    } catch (error) {
      console.error('❌ 启动语音识别失败:', error)
      alert(`启动语音识别失败: ${error}`)
    }
  }

  // 停止语音识别
  const handleStopListening = () => {
    console.log('🛑 停止语音识别...')
    
    // 停止录制
    if (recorderRef.current) {
      recorderRef.current.stop()
      recorderRef.current = null
    }
    
    setIsListening(false)
    setTranscript('')
    
    // 通知后端停止ASR
    stopASR()
    
    console.log('✅ 语音识别已停止')
  }

  // 处理语音识别结果
  const handleSpeechResult = (text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      console.log('🎤 最终识别结果:', text)
      // 发送识别结果给AI
      sendMessage(text)
      setTranscript('')
    } else {
      setTranscript(text)
    }
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
      if (recorderRef.current) {
        recorderRef.current.stop()
      }
    }
  }, [])

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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 rounded-lg p-4 space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                语音选择
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value)
                  setVoice(e.target.value)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Cherry">Cherry (女声)</option>
                <option value="Ethan">Ethan (男声)</option>
                <option value="Chelsie">Chelsie (女声)</option>
                <option value="Serena">Serena (女声)</option>
                <option value="Dylan">Dylan (男声)</option>
                <option value="Jada">Jada (女声)</option>
                <option value="Sunny">Sunny (女声)</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* AI回复显示 */}
      {aiTextBuffer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div className="flex-1">
              <p className="text-blue-800 text-sm leading-relaxed">
                {aiTextBuffer}
                {isProcessing && (
                  <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 语音识别输入 */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={isListening ? handleStopListening : handleStartListening}
            disabled={disabled || !isConnected}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } ${disabled || !isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                <span>停止录音</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>开始录音</span>
              </>
            )}
          </button>

          {/* 状态指示器 */}
          <div className="flex items-center space-x-2">
            {isListening && (
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
            
            {isSpeaking && (
              <div className="flex items-center space-x-1 text-blue-600">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm">正在播放</span>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center space-x-1 text-orange-600">
                <Zap className="w-4 h-4" />
                <span className="text-sm">AI思考中</span>
              </div>
            )}
          </div>
        </div>

        {/* 识别结果显示 */}
        {transcript && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-gray-700 text-sm">
              <span className="font-medium">识别结果:</span> {transcript}
            </p>
          </div>
        )}

        {/* 文本输入（备用） */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="或者直接输入文字..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled || !isConnected}
          />
          <button
            onClick={() => {
              if (transcript.trim()) {
                sendMessage(transcript.trim())
                setTranscript('')
              }
            }}
            disabled={disabled || !isConnected || !transcript.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
      </div>

      {/* 切换按钮 */}
      {onToggle && (
        <div className="text-center">
          <button
            onClick={onToggle}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            切换到传统模式
          </button>
        </div>
      )}
    </div>
  )
}

export default RealtimeVoiceChat 