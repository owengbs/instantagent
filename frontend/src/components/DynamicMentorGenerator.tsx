import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Users, ArrowRight, Loader2, X, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { API_CONFIG } from '../config/api'
import { userManager } from '../utils/userManager'
import { Mentor } from '../types/mentor'
import MentorCard from './MentorCard'
import { useChat } from '../contexts/ChatContext'

interface DynamicMentorGeneratorProps {
  onMentorsGenerated: (mentors: Mentor[], topic: string, sessionId: string) => void
  onClose: () => void
  initialTopic?: string
}

const DynamicMentorGenerator: React.FC<DynamicMentorGeneratorProps> = ({
  onMentorsGenerated,
  onClose,
  initialTopic = ''
}) => {
  const navigate = useNavigate()
  const { sendMentorSelection } = useChat()
  const [topic, setTopic] = useState(initialTopic)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMentors, setGeneratedMentors] = useState<Mentor[]>([])
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([])
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState('')

  // 组件加载时检查是否有已存在的动态导师数据
  React.useEffect(() => {
    const existingDynamicSessionId = localStorage.getItem('dynamicSessionId')
    const existingMentors = localStorage.getItem('selectedMentors')
    const existingTopic = localStorage.getItem('dynamicTopic')
    const isDynamic = localStorage.getItem('isDynamic') === 'true'
    
    if (existingDynamicSessionId && existingMentors && isDynamic) {
      try {
        const mentors: Mentor[] = JSON.parse(existingMentors)
        if (mentors.length > 0 && mentors.some(m => m.isDynamic === true)) {
          console.log('🔄 组件加载时发现已有动态导师数据:')
          console.log('  sessionId:', existingDynamicSessionId)
          console.log('  topic:', existingTopic)
          console.log('  mentors:', mentors.map(m => ({ id: m.id, name: m.name })))
          
          setSessionId(existingDynamicSessionId)
          setTopic(existingTopic || '')
          setGeneratedMentors(mentors)
          setSelectedMentorIds(mentors.map(m => m.id))
          
          console.log('✅ 已加载已有的动态导师数据到组件')
        }
      } catch (error) {
        console.error('❌ 加载已有动态导师数据失败:', error)
      }
    }
  }, [])

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

    // 防重复生成：检查当前组件状态和localStorage
    const existingDynamicSessionId = localStorage.getItem('dynamicSessionId')
    const existingMentors = localStorage.getItem('selectedMentors')
    const isDynamic = localStorage.getItem('isDynamic') === 'true'
    
    // 如果组件已有生成的导师 OR localStorage中有动态导师数据
    if (generatedMentors.length > 0 || (existingDynamicSessionId && existingMentors && isDynamic)) {
      console.log('🔍 检测到已有动态导师:')
      console.log('  当前组件导师数量:', generatedMentors.length)
      console.log('  localStorage dynamicSessionId:', existingDynamicSessionId)
      console.log('  localStorage isDynamic:', isDynamic)
      
      const confirmed = window.confirm('检测到您已经生成过动态导师了，是否要重新生成？这将覆盖之前的导师。')
      if (!confirmed) {
        return
      }
      console.log('🔄 用户确认重新生成动态导师')
      
      // 清理之前的状态
      setGeneratedMentors([])
      setSelectedMentorIds([])
      setSessionId('')
      
      // 清理localStorage中的旧数据
      localStorage.removeItem('selectedMentors')
      localStorage.removeItem('dynamicSessionId') 
      localStorage.removeItem('dynamicTopic')
      localStorage.removeItem('isDynamic')
      console.log('🧹 已清理localStorage中的旧动态导师数据')
    }

    setIsGenerating(true)
    setError('')
    
    try {
      const sessionId = generateSessionId()
      setSessionId(sessionId)
      console.log('🆕 生成新的sessionId:', sessionId)

      // 通过WebSocket发送生成请求
      const ws = new WebSocket(API_CONFIG.endpoints.chatWs(sessionId))
      
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
          
          console.log('🎯 动态导师生成完成:')
          console.log('  后端返回的sessionId:', backendSessionId)
          console.log('  当前组件的sessionId:', sessionId)
          console.log('  生成的导师数量:', mentors.length)
          console.log('  生成的导师详情:', mentors.map(m => ({ 
            id: m.id, 
            name: m.name, 
            extractedSessionId: m.id.match(/_msg_(\d+)_/)?.[1] 
          })))
          
          setGeneratedMentors(mentors)
          // 默认全选所有生成的导师
          const mentorIds = mentors.map(m => m.id)
          console.log('🎯 默认选择的导师ID:', mentorIds)
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
    console.log('🔄 切换导师选择:', mentorId)
    setSelectedMentorIds(prev => {
      const newSelection = prev.includes(mentorId) 
        ? prev.filter(id => id !== mentorId)
        : [...prev, mentorId]
      console.log('📝 选择状态更新:', { 
        mentorId, 
        before: prev, 
        after: newSelection 
      })
      return newSelection
    })
  }

  // 开始对话
  const handleStartConversation = () => {
    console.log('🚀 开始对话准备')
    console.log('  当前sessionId:', sessionId)
    console.log('  当前topic:', topic)
    console.log('  selectedMentorIds:', selectedMentorIds)
    console.log('  generatedMentors:', generatedMentors.map(m => ({ id: m.id, name: m.name })))
    
    if (selectedMentorIds.length > 0) {
      const selectedMentors = generatedMentors.filter(mentor => selectedMentorIds.includes(mentor.id))
      console.log('✅ 最终选择的导师详情:')
      selectedMentors.forEach((mentor, index) => {
        console.log(`  ${index + 1}. ${mentor.name} (${mentor.id})`)
        console.log(`     提取的sessionId: ${mentor.id.match(/_msg_(\d+)_/)?.[1]}`)
      })
      
      // 将动态导师选择结果持久化，避免路由状态在某些环境下丢失时回退到默认导师
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
      onMentorsGenerated(selectedMentors, topic, sessionId)
      navigate('/chat', { 
        state: { 
          mentors: selectedMentors,
          topic: topic,
          sessionId: sessionId,
          isDynamic: true
        }
      })
    } else {
      console.warn('⚠️ 没有选择任何导师，无法开始对话')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6" />
              <h2 className="text-2xl font-bold">动态导师生成</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-blue-100">
            输入您想要讨论的议题，AI将为您生成四位最适合的导师
          </p>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* 议题输入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              讨论议题 *
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：人工智能对投资市场的影响、ESG投资策略、加密货币投资风险..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isGenerating}
            />
            <p className="mt-2 text-sm text-gray-500">
              请详细描述您想要讨论的议题，这将帮助AI生成更合适的导师
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-600 text-sm">{error}</p>
            </motion.div>
          )}

          {/* 生成按钮 */}
          <div className="mb-6">
            <button
              onClick={handleGenerateMentors}
              disabled={isGenerating || !topic.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>正在生成导师...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>生成四位导师</span>
                </>
              )}
            </button>
          </div>

          {/* 生成的导师 */}
          <AnimatePresence>
            {generatedMentors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    已生成 {generatedMentors.length} 位导师
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* 开始对话按钮 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="pt-4"
                >
                  <button
                    onClick={handleStartConversation}
                    disabled={selectedMentorIds.length === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Users className="w-5 h-5" />
                    <span>开始与导师对话 {selectedMentorIds.length > 0 && `(${selectedMentorIds.length}位)`}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default DynamicMentorGenerator

