import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mic, MicOff, FileText, Home, Volume2, VolumeX } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useChat } from '../contexts/ChatContext'
import { useQwenSpeechRecognition } from '../hooks/useQwenSpeechRecognition'
import { useQwenTTS } from '../hooks/useQwenTTS'
import { Message } from '../types'
import { Mentor } from '../types/mentor'
import API_CONFIG from '../config/api'

const MobileChatInterface: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, isConnected, sendMessage, connect } = useChat()
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [currentMentors, setCurrentMentors] = useState<Mentor[]>([])
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isValidAccess, setIsValidAccess] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [topic, setTopic] = useState('')

  // 语音识别
  const {
    transcript,
    isRecording,
    startListening,
    stopListening,
    isSupported: asrSupported
  } = useQwenSpeechRecognition()

  // 语音合成
  const { speak, stop: stopSpeaking, isPlaying } = useQwenTTS({
    voice: 'Chelsie',
    onStart: () => console.log('TTS开始播放'),
    onEnd: () => console.log('TTS播放结束'),
    onError: (error) => console.error('TTS错误:', error)
  })

  // 获取当前参与的导师 - 使用与PC端相同的逻辑
  useEffect(() => {
    console.log('📱 移动端聊天初始化 - 检查路由状态和本地存储')
    
    // 检查是否有动态导师信息 (与PC端逻辑一致)
    const routeState = location.state as any;
    console.log('📱 移动端路由状态:', routeState)
    
    if (routeState?.mentors && routeState?.isDynamic) {
      // 使用动态导师 (与PC端MultiAgentChatContainer相同逻辑)
      const mentors: Mentor[] = routeState.mentors;
      console.log('📱 移动端使用动态导师:', mentors)
      setCurrentMentors(mentors);
      
      // 保存动态导师信息到本地存储
      localStorage.setItem('selectedMentors', JSON.stringify(mentors));
      localStorage.setItem('dynamicSessionId', routeState.sessionId || '');
      localStorage.setItem('dynamicTopic', routeState.topic || '');
      
      // 设置会话信息
      setSessionId(routeState.sessionId || '');
      setTopic(routeState.topic || '');
      
      console.log('📱 移动端动态导师设置完成:', mentors.length, '位导师');
      setIsValidAccess(true);
    } else {
      // 从本地存储加载选中的导师 (常规导师)
      const savedMentors = localStorage.getItem('selectedMentors');
      console.log('📱 移动端本地存储的导师:', savedMentors)
      
      if (savedMentors) {
        try {
          const mentors: Mentor[] = JSON.parse(savedMentors);
          console.log('📱 移动端使用常规导师:', mentors)
          setCurrentMentors(mentors);
          
          // 为默认导师生成sessionId（确保会议纪要功能正常）
          const dynamicSessionId = localStorage.getItem('dynamicSessionId');
          const dynamicTopic = localStorage.getItem('dynamicTopic');
          
          if (dynamicSessionId) {
            // 如果已有sessionId，直接使用
            setSessionId(dynamicSessionId);
            setTopic(dynamicTopic || '');
            console.log('✅ 移动端使用现有sessionId:', dynamicSessionId)
          } else {
            // 生成新的sessionId
            const timestamp = Date.now();
            const suffix = Math.random().toString(36).slice(2, 10);
            const defaultSessionId = `default_${timestamp}_msg_${timestamp}_${suffix}`;
            const defaultTopic = '投资圆桌讨论';
            
            localStorage.setItem('dynamicSessionId', defaultSessionId);
            localStorage.setItem('dynamicTopic', defaultTopic);
            
            setSessionId(defaultSessionId);
            setTopic(defaultTopic);
            
            console.log('✅ 移动端生成新sessionId:', defaultSessionId)
          }
          
          setIsValidAccess(true);
        } catch (error) {
          console.error('❌ 移动端解析导师信息失败:', error);
          alert('导师信息解析失败，请重新选择导师')
          navigate('/');
          return;
        }
      } else {
        console.warn('⚠️ 移动端没有找到导师信息，返回首页')
        alert('请先选择导师参与圆桌会议')
        navigate('/');
        return;
      }
    }
  }, [location.state, navigate])

  // 添加额外的调试useEffect来监控状态变化
  useEffect(() => {
    console.log('📱 移动端状态变化监控:', {
      isValidAccess,
      currentMentorsLength: currentMentors.length,
      locationState: location.state,
      localStorage: localStorage.getItem('selectedMentors')
    })
  }, [isValidAccess, currentMentors.length, location.state])

  // 确保WebSocket连接已建立
  useEffect(() => {
    if (isValidAccess && currentMentors.length > 0 && !isConnected) {
      console.log('📱 移动端尝试重新连接WebSocket')
      connect()
    }
  }, [isValidAccess, currentMentors.length, isConnected, connect])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 处理语音识别结果
  useEffect(() => {
    if (transcript && !isRecording) {
      setInputText(transcript)
      handleSendMessage(transcript)
    }
  }, [transcript, isRecording])

  // 发送消息
  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim()
    if (!messageText || !isConnected) return

    setInputText('')
    await sendMessage(messageText)
  }

  // 切换语音识别
  const toggleListening = () => {
    if (isRecording) {
      stopListening()
      setIsListening(false)
    } else if (asrSupported) {
      startListening()
      setIsListening(true)
    }
  }

  // 播放消息语音
  const handlePlayMessage = (message: Message) => {
    if (isSpeakerOn && message.type === 'agent' && message.content) {
      speak(message.content)
    }
  }

  // 获取导师头像
  const getMentorAvatar = (agentName?: string) => {
    if (!agentName) return '🤖'
    
    // 使用表情符号而不是URL
    const emojiMap: { [key: string]: string } = {
      '沃伦·巴菲特': '🤵',
      '乔治·索罗斯': '🎩',
      '查理·芒格': '👨‍🏫',
      '保罗·克鲁格曼': '👨‍🎓',
      'Warren Buffett': '🤵',
      'George Soros': '🎩',
      'Charlie Munger': '👨‍🏫',
      'Paul Krugman': '👨‍🎓'
    }
    
    return emojiMap[agentName] || '👤'
  }

  // 获取导师颜色
  const getMentorColor = (agentName?: string) => {
    if (!agentName) return 'bg-gray-100'
    const mentor = currentMentors.find(m => m.name === agentName)
    return mentor?.color || 'bg-blue-100'
  }

  // 添加详细的调试信息
  console.log('📱 移动端渲染检查:', {
    isValidAccess,
    currentMentorsLength: currentMentors.length,
    currentMentors: currentMentors.map(m => ({ id: m.id, name: m.name }))
  })

  // 如果没有正确的访问状态，显示加载或错误页面
  if (!isValidAccess) {
    console.warn('📱 移动端访问状态无效，显示加载页面')
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在验证访问权限...</p>
          <p className="mt-2 text-sm text-gray-500">Debug: isValidAccess = {String(isValidAccess)}</p>
        </div>
      </div>
    );
  }

  if (currentMentors.length === 0) {
    console.warn('📱 移动端导师列表为空，显示加载页面')
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载导师信息...</p>
          <p className="mt-2 text-sm text-gray-500">Debug: currentMentors.length = {currentMentors.length}</p>
        </div>
      </div>
    );
  }

  // 生成会议纪要
  const handleGenerateSummary = async () => {
    if (messages.length === 0) return
    
    setIsGeneratingSummary(true)
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/meeting-summary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          topic: topic,
          messages: messages
        })
      })

      if (response.ok) {
        const summary = await response.json()
        alert(`会议纪要已生成！\n\n${summary.summary}`)
      } else {
        alert('生成会议纪要失败，请重试')
      }
    } catch (error) {
      console.error('生成会议纪要失败:', error)
      alert('生成会议纪要失败，请重试')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">圆桌会议</h1>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-2 rounded-full ${isSpeakerOn ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 参与导师 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-medium text-gray-700 mb-2">参与导师</h2>
        <div className="flex justify-center space-x-4">
          {currentMentors.map((mentor) => (
            <div key={mentor.id} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full ${getMentorColor(mentor.name)} flex items-center justify-center text-lg mb-1`}>
                {getMentorAvatar(mentor.name)}
              </div>
              <span className="text-xs text-gray-600 max-w-[60px] truncate">
                {mentor.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'agent' && (
              <div className="flex-shrink-0 mr-2">
                <div className={`w-8 h-8 rounded-full ${getMentorColor(message.agentName)} flex items-center justify-center text-sm`}>
                  {getMentorAvatar(message.agentName)}
                </div>
              </div>
            )}
            
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.type === 'agent'
                  ? 'bg-white border border-gray-200'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {message.type === 'agent' && (
                <p className="text-xs font-medium text-gray-600 mb-1">
                  {message.agentName || '导师'}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-60 mt-1">
                {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部操作栏 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          {/* 语音输入 */}
          <button
            onClick={toggleListening}
            disabled={!asrSupported}
            className={`p-3 rounded-full ${
              isRecording
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } transition-colors`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* 文本输入 */}
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="输入消息..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || !isConnected}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
        </div>

        {/* 功能按钮 */}
        <div className="flex justify-center space-x-4 mt-3">
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || messages.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            <span>{isGeneratingSummary ? '生成中...' : '会议纪要'}</span>
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            <Home className="w-4 h-4" />
            <span>返回首页</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MobileChatInterface
