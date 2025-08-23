import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Mic, Send, Square, Clock, X } from 'lucide-react'
import MessageBubble from './MessageBubble'
import MeetingSummaryGenerator from './MeetingSummaryGenerator'
import SimpleMeetingSummary from './SimpleMeetingSummary'
import { useChat } from '../contexts/ChatContext'
import { Mentor } from '../types/mentor'

interface ChatContainerProps {
  className?: string
}

const ChatContainer: React.FC<ChatContainerProps> = ({ className = '' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, sendMessage, sendMentorSelection } = useChat()
  const { messages, isTyping, isConnected } = state
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [selectedMentors, setSelectedMentors] = useState<Mentor[]>([])
  const [topic, setTopic] = useState<string>('')
  const [sessionId, setSessionId] = useState<string>('')
  const [inputMessage, setInputMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [showSummaryGenerator, setShowSummaryGenerator] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryData, setSummaryData] = useState<any>(null)

  // 从路由状态或本地存储加载信息
  useEffect(() => {
    const routeState = location.state as any
    let mentors: Mentor[] = []
    let currentTopic = ''
    let currentSessionId = ''

    console.log('🔍 ChatContainer初始化，检查路由状态:', routeState)

    if (routeState?.mentors) {
      mentors = routeState.mentors
      currentTopic = routeState.topic || ''
      currentSessionId = routeState.sessionId || ''
      console.log('✅ 从路由状态恢复数据:')
      console.log('  mentors:', mentors.map(m => ({ id: m.id, name: m.name })))
      console.log('  topic:', currentTopic)
      console.log('  sessionId:', currentSessionId)
    } else {
      // 从localStorage恢复
      try {
        const savedMentors = localStorage.getItem('selectedMentors')
        const savedTopic = localStorage.getItem('dynamicTopic')
        const savedSessionId = localStorage.getItem('dynamicSessionId')
        
        if (savedMentors) {
          mentors = JSON.parse(savedMentors)
        }
        if (savedTopic) {
          currentTopic = savedTopic
        }
        if (savedSessionId) {
          currentSessionId = savedSessionId
        }
        
        console.log('🔄 从localStorage恢复数据:')
        console.log('  mentors:', mentors.map(m => ({ id: m.id, name: m.name })))
        console.log('  topic:', currentTopic)
        console.log('  sessionId:', currentSessionId)
      } catch (error) {
        console.error('恢复聊天数据失败:', error)
      }
    }

    if (mentors.length === 0) {
      // 如果没有导师信息，返回首页
      console.warn('⚠️ 没有导师信息，返回首页')
      navigate('/')
      return
    }

    setSelectedMentors(mentors)
    setTopic(currentTopic)
    setSessionId(currentSessionId)
    setStartTime(new Date())
    
    // 确保WebSocket连接使用正确的会话ID并发送导师选择
    if (currentSessionId && mentors.length > 0) {
      console.log('📤 聊天页面立即发送导师选择到后端')
      // 延迟一下确保WebSocket连接已建立
      setTimeout(() => {
        console.log('📤 发送导师选择信息:', mentors)
        sendMentorSelection(mentors)
      }, 1000)
    }
  }, [location, navigate])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return
    
    await sendMessage(inputMessage.trim())
    setInputMessage('')
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 模拟录音功能
  const handleVoiceRecord = () => {
    if (isRecording) {
      setIsRecording(false)
      setRecordingTime(0)
    } else {
      setIsRecording(true)
      // 这里应该集成真实的语音识别
    }
  }

  // 录音计时
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  // 实时更新讨论时长
  useEffect(() => {
    const interval = setInterval(() => {
      // 强制重新渲染以更新时间显示
      setStartTime(prev => prev)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 格式化持续时间
  const formatDuration = (startTime: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - startTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000)
    return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`
  }

  // 处理结束讨论
  const handleEndDiscussion = () => {
    if (messages.length === 0) {
      // 如果没有消息，直接返回首页
      navigate('/')
      return
    }
    
    // 显示会议总结生成器
    setShowSummaryGenerator(true)
  }

  // 处理总结生成完成
  const handleSummaryGenerated = (summary: any) => {
    setSummaryData(summary)
    setShowSummaryGenerator(false)
    setShowSummary(true)
  }

  // 处理总结关闭
  const handleSummaryClose = () => {
    setShowSummary(false)
    navigate('/')
  }

  return (
    <div className={`h-screen bg-gray-900 text-white flex ${className}`}>
      {/* 左侧导师列表 */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* 顶部标题 */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-lg font-semibold">投资大师圆桌会</h1>
          {topic && (
            <p className="text-sm text-gray-400 mt-1">{topic}</p>
          )}
        </div>

        {/* 参会大师列表 */}
        <div className="flex-1 p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-3">参会大师</h2>
          <div className="space-y-3">
            {selectedMentors.map((mentor) => (
              <div key={mentor.id} className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: mentor.color }}
                >
                  {mentor.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {mentor.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {isTyping ? '正在思考...' : '等待中'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 连接状态 */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-400">
              {isConnected ? '已连接' : '连接中...'}
            </span>
          </div>
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-white">投资大师圆桌会</h1>
            {topic && (
              <p className="text-sm text-gray-400 mt-1">{topic}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* 连接状态指示器 */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">{formatDuration(startTime)}</span>
            </div>
            {/* 结束按钮 */}
            <button
              onClick={handleEndDiscussion}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              结束
            </button>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                  <Mic className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium mb-2">欢迎来到投资大师圆桌会</h3>
                <p className="text-sm">
                  {selectedMentors.length > 0 
                    ? `${selectedMentors.map(m => m.name).join('、')} 已准备就绪`
                    : '准备开始讨论'
                  }
                </p>
                {topic && (
                  <p className="text-sm mt-2 text-blue-400">
                    本次讨论话题：{topic}
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-500">
                <p>✅ 参会人员已到齐，您任意发言即可开始讨论。</p>
                <p>🎤 如遇到语音按钮无法使用，请<span className="text-blue-400">点击里查看教程</span></p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              className="max-w-4xl"
            />
          ))}

          {isTyping && (
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm">导师们正在思考...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-end space-x-3">
            {/* 语音按钮 */}
            <button
              onClick={handleVoiceRecord}
              className={`p-3 rounded-full transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* 录音时间显示 */}
            {isRecording && (
              <div className="flex items-center space-x-2 text-red-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
              </div>
            )}

            {/* 文本输入 */}
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息或点击麦克风说话..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            {/* 发送按钮 */}
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="p-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 会议总结生成器 */}
      {showSummaryGenerator && (
        <MeetingSummaryGenerator
          sessionId={sessionId}
          topic={topic}
          messages={messages}
          onSummaryGenerated={handleSummaryGenerated}
          onClose={() => setShowSummaryGenerator(false)}
        />
      )}

      {/* 会议总结显示 */}
      {showSummary && summaryData && (
        <SimpleMeetingSummary
          summary={summaryData}
          topic={topic}
          participants={['我', ...selectedMentors.map(m => m.name)]}
          duration={formatDuration(startTime)}
          onClose={handleSummaryClose}
        />
      )}
    </div>
  )
}

export default ChatContainer
