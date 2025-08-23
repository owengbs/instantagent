import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Sparkles, Users, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API_CONFIG } from '../config/api'
import { userManager } from '../utils/userManager'
import { Mentor } from '../types/mentor'
import MentorCard from './MentorCard'
import { useChat } from '../contexts/ChatContext'

const GenerateMentorsPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { sendMentorSelection } = useChat()
  
  // 从路由状态中获取话题
  const topicFromRoute = (location.state as any)?.topic || ''
  
  const [topic, setTopic] = useState(topicFromRoute)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMentors, setGeneratedMentors] = useState<Mentor[]>([])
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([])
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState('')

  // 如果有话题，自动开始生成
  useEffect(() => {
    if (topicFromRoute && !isGenerating && generatedMentors.length === 0) {
      handleGenerateMentors()
    }
  }, [topicFromRoute])

  // 生成会话ID
  const generateSessionId = () => {
    return userManager.generateDynamicSessionId()
  }

  // 生成动态导师
  const handleGenerateMentors = async () => {
    if (!topic.trim()) {
      setError('请输入讨论议题')
      return
    }

    setIsGenerating(true)
    setError('')
    
    try {
      const sessionId = generateSessionId()
      setSessionId(sessionId)
      console.log('🆕 生成新的sessionId:', sessionId)

      // 通过WebSocket发送生成请求
      // 使用userManager生成正确的连接ID
      const connectionId = userManager.generateConnectionId(sessionId)
      console.log('🔗 生成导师页面WebSocket连接信息:')
      console.log('  sessionId:', sessionId)
      console.log('  connectionId:', connectionId)
      
      const ws = new WebSocket(API_CONFIG.endpoints.chatWs(connectionId))
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'generate_dynamic_mentors',
          topic: topic.trim(),
          session_id: sessionId
        }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'dynamic_mentors_generated') {
          // 使用后端返回的会话ID，确保前后端一致
          const backendSessionId = data.session_id
          if (backendSessionId) {
            setSessionId(backendSessionId)
            console.log('🔄 使用后端返回的会话ID:', backendSessionId)
          }
          
          // 转换导师数据格式
          const mentors: Mentor[] = data.mentors.map((mentor: any) => ({
            id: mentor.agent_id,
            name: mentor.name,
            title: mentor.title,
            description: mentor.description,
            avatar: mentor.avatar,
            color: mentor.color,
            voice: mentor.voice,
            expertise: mentor.expertise || [],
            personalityTraits: mentor.personality_traits || [],
            investmentStyle: mentor.investment_style || '',
            famousQuotes: mentor.famous_quotes || [],
            isEnabled: mentor.enabled,
            isCustom: false,
            isDynamic: true
          }))
          
          console.log('🎯 动态导师生成完成:', mentors.length, '位导师')
          
          setGeneratedMentors(mentors)
          // 默认全选所有生成的导师
          const mentorIds = mentors.map(m => m.id)
          setSelectedMentorIds(mentorIds)
          setIsGenerating(false)
          ws.close()
        } else if (data.type === 'error') {
          setError(data.message)
          setIsGenerating(false)
          ws.close()
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket错误:', error)
        setError('连接失败，请重试')
        setIsGenerating(false)
      }

    } catch (error) {
      console.error('生成导师失败:', error)
      setError('生成导师失败，请重试')
      setIsGenerating(false)
    }
  }

  // 切换导师选择状态
  const toggleMentorSelection = (mentorId: string) => {
    setSelectedMentorIds(prev => {
      const newSelection = prev.includes(mentorId) 
        ? prev.filter(id => id !== mentorId)
        : [...prev, mentorId]
      return newSelection
    })
  }

  // 开始对话
  const handleStartConversation = () => {
    if (selectedMentorIds.length === 0) {
      alert('请至少选择一位导师参与讨论')
      return
    }

    const selectedMentors = generatedMentors.filter(mentor => selectedMentorIds.includes(mentor.id))
    
    console.log('🚀 开始对话准备')
    console.log('  当前sessionId:', sessionId)
    console.log('  当前topic:', topic)
    console.log('  selectedMentorIds:', selectedMentorIds)
    console.log('  generatedMentors:', generatedMentors.map(m => ({ id: m.id, name: m.name })))
    console.log('✅ 最终选择的导师详情:')
    selectedMentors.forEach((mentor, index) => {
      console.log(`  ${index + 1}. ${mentor.name} (${mentor.id})`)
      console.log(`     提取的sessionId: ${mentor.id.match(/_msg_(\d+)_/)?.[1]}`)
    })
    
    // 保存到localStorage
    try {
      // 先清理之前的动态导师信息，避免冲突
      console.log('🧹 清理之前的localStorage数据')
      localStorage.removeItem('selectedMentors')
      localStorage.removeItem('dynamicSessionId') 
      localStorage.removeItem('dynamicTopic')
      localStorage.removeItem('isDynamic')
      
      const localStorageData = {
        selectedMentors: selectedMentors,
        dynamicSessionId: sessionId,
        dynamicTopic: topic,
        isDynamic: 'true'
      }
      console.log('💾 保存到localStorage的数据:', localStorageData)
      
      localStorage.setItem('selectedMentors', JSON.stringify(selectedMentors))
      localStorage.setItem('dynamicSessionId', sessionId)
      localStorage.setItem('dynamicTopic', topic)
      localStorage.setItem('isDynamic', 'true')
      
      // 验证保存结果
      console.log('✅ localStorage保存验证:')
      console.log('  selectedMentors:', localStorage.getItem('selectedMentors'))
      console.log('  dynamicSessionId:', localStorage.getItem('dynamicSessionId'))
      console.log('  dynamicTopic:', localStorage.getItem('dynamicTopic'))
      console.log('  isDynamic:', localStorage.getItem('isDynamic'))
    } catch (e) {
      console.warn('localStorage 持久化动态导师失败（不影响继续导航）:', e)
    }

    // 立即发送导师选择信息到后端
    console.log('📤 立即发送导师选择到后端')
    sendMentorSelection(selectedMentors)

    console.log('🔄 开始跳转到聊天页面')
    // 跳转到聊天页面
    navigate('/chat', { 
      state: { 
        mentors: selectedMentors,
        topic: topic,
        sessionId: sessionId,
        isDynamic: true
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-gray-900">
          选择讨论导师
        </h1>
        <div className="w-9"></div> {/* 占位符保持标题居中 */}
      </div>

      <div className="flex-1 p-4">
        {/* 生成中状态 */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              正在为您生成专业导师...
            </h2>
            <p className="text-gray-600">
              根据话题"{topic}"匹配最适合的投资导师
            </p>
          </motion.div>
        )}

        {/* 错误状态 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
          >
            <p className="text-red-600">{error}</p>
            <button
              onClick={handleGenerateMentors}
              className="mt-2 text-red-700 hover:text-red-800 font-medium"
            >
              重试生成
            </button>
          </motion.div>
        )}

        {/* 生成的导师列表 */}
        <AnimatePresence>
          {generatedMentors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 mb-6">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-800">
                  已生成 {generatedMentors.length} 位专业导师
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {generatedMentors.map((mentor, index) => (
                  <motion.div
                    key={mentor.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MentorCard
                      mentor={mentor}
                      isSelected={selectedMentorIds.includes(mentor.id)}
                      onToggleSelect={(selectedMentor) => toggleMentorSelection(selectedMentor.id)}
                    />
                  </motion.div>
                ))}
              </div>

              {/* 开始讨论按钮 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4"
              >
                <button
                  onClick={handleStartConversation}
                  disabled={selectedMentorIds.length === 0}
                  className="w-full bg-black text-white py-4 px-6 rounded-2xl text-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-3"
                >
                  <Users className="w-5 h-5" />
                  <span>确认并开始讨论 ({selectedMentorIds.length}位导师)</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default GenerateMentorsPage
