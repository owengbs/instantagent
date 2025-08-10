import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Users, ArrowRight, Loader2, X, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Mentor } from '../types/mentor'
import MentorCard from './MentorCard'

interface DynamicMentorGeneratorProps {
  onMentorsGenerated: (mentors: Mentor[], topic: string, sessionId: string) => void
  onClose: () => void
}

const DynamicMentorGenerator: React.FC<DynamicMentorGeneratorProps> = ({
  onMentorsGenerated,
  onClose
}) => {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMentors, setGeneratedMentors] = useState<Mentor[]>([])
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([])
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState('')

  // 生成会话ID
  const generateSessionId = () => {
    return `dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

      // 通过WebSocket发送生成请求
      const ws = new WebSocket(`ws://localhost:8000/realtime/ws/${sessionId}`)
      
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
          
          setGeneratedMentors(mentors)
          // 默认全选所有生成的导师
          const mentorIds = mentors.map(m => m.id)
          console.log('🎯 生成的导师ID:', mentorIds)
          console.log('📋 生成的导师详情:', mentors.map(m => ({ id: m.id, name: m.name })))
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
    console.log('🚀 开始对话')
    console.log('📋 当前选择的导师ID:', selectedMentorIds)
    console.log('📋 所有生成的导师:', generatedMentors.map(m => ({ id: m.id, name: m.name })))
    
    if (selectedMentorIds.length > 0) {
      const selectedMentors = generatedMentors.filter(mentor => selectedMentorIds.includes(mentor.id))
      console.log('✅ 最终选择的导师:', selectedMentors.map(m => ({ id: m.id, name: m.name })))
      
      onMentorsGenerated(selectedMentors, topic, sessionId)
      navigate('/chat', { 
        state: { 
          mentors: selectedMentors,
          topic: topic,
          sessionId: sessionId,
          isDynamic: true
        }
      })
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

