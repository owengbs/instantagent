import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, MessageCircle, Sparkles, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Mentor } from '../types/mentor'
import { DEFAULT_MENTORS } from '../config/mentors'
import DynamicMentorGenerator from './DynamicMentorGenerator'
import { useMentors } from '../hooks/useMentors'

const MobileMentorSelection: React.FC = () => {
  const navigate = useNavigate()
  const { getEnabledMentors, loading: mentorsLoading, error: mentorsError } = useMentors()
  
  const [availableMentors, setAvailableMentors] = useState<Mentor[]>(DEFAULT_MENTORS)
  const [selectedMentors, setSelectedMentors] = useState<Mentor[]>([])
  const [showDynamicGenerator, setShowDynamicGenerator] = useState(false)

  // 获取导师信息
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const enabledMentors = getEnabledMentors()
        if (enabledMentors.length > 0) {
          setAvailableMentors(enabledMentors)
        }
      } catch (error) {
        console.error('获取后端导师信息失败，使用默认数据:', error)
      }
    }

    if (!mentorsLoading && !mentorsError) {
      fetchMentors()
    }
  }, [getEnabledMentors, mentorsLoading, mentorsError])

  // 切换导师选择状态
  const toggleMentorSelection = (mentor: Mentor) => {
    setSelectedMentors(prev => {
      const isSelected = prev.some(m => m.id === mentor.id)
      if (isSelected) {
        return prev.filter(m => m.id !== mentor.id)
      } else {
        return [...prev, mentor]
      }
    })
  }

  // 开始圆桌会议 - 使用与PC端完全相同的逻辑
  const startRoundtable = () => {
    if (selectedMentors.length === 0) {
      alert('请至少选择一位导师参与圆桌会议')
      return
    }

    try {
      localStorage.setItem('selectedMentors', JSON.stringify(selectedMentors))
      console.log('📱 移动端开始圆桌会议，选中的导师:', selectedMentors.map(m => ({ id: m.id, name: m.name })))
      console.log('💾 移动端已存储到localStorage:', localStorage.getItem('selectedMentors'))
      
      // 检查存储是否成功
      const stored = localStorage.getItem('selectedMentors')
      if (stored) {
        console.log('✅ 移动端localStorage存储成功，准备跳转')
        navigate('/chat')
      } else {
        console.error('❌ 移动端localStorage存储失败')
        alert('存储导师信息失败，请重试')
      }
    } catch (error) {
      console.error('❌ 移动端存储导师信息失败:', error)
      alert('存储导师信息失败，请重试')
    }
  }

  // 处理动态导师生成 - 与PC端逻辑保持一致
  const handleDynamicMentorsGenerated = (mentors: Mentor[], topic: string, sessionId: string) => {
    console.log('📱 移动端动态导师已生成:', mentors.length, '位导师')
    console.log('📱 导师详情:', mentors.map(m => ({ id: m.id, name: m.name })))
    console.log('📱 话题:', topic)
    console.log('📱 会话ID:', sessionId)
    
    // 使用与PC端相同的跳转逻辑
    navigate('/chat', { 
      state: { 
        mentors: mentors,
        topic: topic,
        sessionId: sessionId,
        isDynamic: true  // 关键：标记为动态导师
      }
    })
  }

  // 获取导师表情符号
  const getMentorEmoji = (mentorName: string) => {
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
    return emojiMap[mentorName] || '👤'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">投资大师圆桌会议</h1>
          <div className="text-sm text-gray-500">移动端</div>
        </div>
      </div>

      <div className="p-4">
        {/* 动态导师生成 */}
        <div className="mb-6">
          <button
            onClick={() => setShowDynamicGenerator(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-3 px-4 rounded-lg shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>讨论话题</span>
            </div>
          </button>
        </div>

        {/* 导师选择 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">选择导师参与圆桌会议</h2>
          <div className="grid grid-cols-2 gap-4">
            {availableMentors.map((mentor) => {
              const isSelected = selectedMentors.some(m => m.id === mentor.id)
              return (
                <motion.div
                  key={mentor.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleMentorSelection(mentor)}
                  className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-lg' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {/* 导师头像 */}
                  <div className="text-center mb-3">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl mb-2 ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {getMentorEmoji(mentor.name)}
                    </div>
                  </div>

                  {/* 导师信息 */}
                  <div className="text-center px-3 pb-3">
                    <h3 className="font-medium text-gray-900 text-sm mb-1">{mentor.name}</h3>
                    <p className="text-xs text-gray-600 mb-2">{mentor.title}</p>
                    
                    {/* 选择状态指示器 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* 开始对话按钮 */}
        <div className="fixed bottom-4 left-4 right-4">
          <button
            onClick={startRoundtable}
            disabled={selectedMentors.length === 0}
            className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-all duration-300 transform ${
              selectedMentors.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg hover:from-blue-600 hover:to-green-600 hover:scale-105'
            }`}
          >
            <div className="flex items-center justify-center space-x-3">
              <MessageCircle className="w-6 h-6" />
              <span>开始对话 ({selectedMentors.length})</span>
              <ArrowRight className="w-6 h-6" />
            </div>
          </button>
        </div>
      </div>

      {/* 动态导师生成器 */}
      <AnimatePresence>
        {showDynamicGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <DynamicMentorGenerator
                onMentorsGenerated={handleDynamicMentorsGenerated}
                onClose={() => setShowDynamicGenerator(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MobileMentorSelection
