import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Users, Filter, Search, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Mentor } from '../types/mentor'
import { DEFAULT_MENTORS } from '../config/mentors'
import MentorCard from './MentorCard'

import DynamicMentorGenerator from './DynamicMentorGenerator'
import { useMentors } from '../hooks/useMentors'

const MentorSelection: React.FC = () => {
  const navigate = useNavigate()
  const { getEnabledMentors, loading: mentorsLoading, error: mentorsError } = useMentors()
  
  // 优先使用后端数据，如果失败则使用默认数据
  const [availableMentors, setAvailableMentors] = useState<Mentor[]>(DEFAULT_MENTORS)
  const [selectedMentors, setSelectedMentors] = useState<Mentor[]>([])

  const [showDynamicGenerator, setShowDynamicGenerator] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStyle, setFilterStyle] = useState<string>('')



  // 尝试从后端获取导师信息
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

  // 处理动态导师生成
  const handleDynamicMentorsGenerated = (mentors: Mentor[], topic: string, sessionId: string) => {
    // 动态导师会直接跳转到聊天页面，这里不需要额外处理
    console.log('动态导师已生成:', mentors.length, '位导师')
  }

  // 开始圆桌会议
  const startRoundtable = () => {
    if (selectedMentors.length === 0) {
      alert('请至少选择一位导师参与圆桌会议')
      return
    }

    // 保存选中的导师到本地存储或状态管理
    localStorage.setItem('selectedMentors', JSON.stringify(selectedMentors))
    
    // 详细调试信息
    console.log('🎯 MentorSelection: 开始圆桌会议')
    console.log('📋 MentorSelection: 选中的导师详情:', selectedMentors.map(m => ({ 
      id: m.id, 
      name: m.name,
      title: m.title 
    })))
    console.log('💾 MentorSelection: 已保存到localStorage:', JSON.stringify(selectedMentors.map(m => ({ id: m.id, name: m.name }))))
    
    // 验证保存是否成功
    const saved = localStorage.getItem('selectedMentors')
    if (saved) {
      const parsed = JSON.parse(saved)
      console.log('✅ MentorSelection: localStorage验证成功，导师数量:', parsed.length)
    } else {
      console.error('❌ MentorSelection: localStorage保存失败！')
    }
    
    // 导航到聊天页面
    navigate('/chat')
  }

  // 过滤导师
  const filteredMentors = availableMentors.filter(mentor => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentor.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = !filterStyle || mentor.investmentStyle === filterStyle
    
    return matchesSearch && matchesFilter
  })

  // 获取所有投资风格用于过滤
  const investmentStyles = Array.from(new Set(availableMentors.map(mentor => mentor.investmentStyle)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              投资大师圆桌会议
            </h1>
          </div>
          <p className="text-lg text-gray-600 mb-6">
            选择您想要对话的投资导师，开启专属的智慧交流之旅
          </p>
          
          {/* 已选导师统计 */}
          {selectedMentors.length > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full"
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">
                已选择 {selectedMentors.length} 位导师
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* 搜索和过滤 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-8"
        >
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索导师姓名、职位或描述..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 投资风格过滤 */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[200px]"
            >
              <option value="">所有投资风格</option>
              {investmentStyles.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>

          {/* 讨论话题按钮 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDynamicGenerator(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all duration-300 shadow-lg"
          >
            <Zap className="w-5 h-5" />
            <span className="font-medium">讨论话题</span>
          </motion.button>
        </motion.div>

        {/* 导师网格 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
        >
          <AnimatePresence>
            {filteredMentors.map((mentor, index) => (
              <motion.div
                key={mentor.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <MentorCard
                  mentor={mentor}
                  isSelected={selectedMentors.some(m => m.id === mentor.id)}
                  onToggleSelect={toggleMentorSelection}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* 无结果提示 */}
        {filteredMentors.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-gray-400 mb-4">
              <Users className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              没有找到匹配的导师
            </h3>
            <p className="text-gray-500 mb-4">
              尝试调整搜索条件或使用"讨论话题"功能
            </p>
            <button
              onClick={() => setShowDynamicGenerator(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>讨论话题</span>
            </button>
          </motion.div>
        )}

        {/* 开始按钮 */}
        <AnimatePresence>
          {selectedMentors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-10"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRoundtable}
                className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300"
              >
                <span className="text-lg font-semibold">
                  开始圆桌会议
                </span>
                <div className="flex items-center space-x-1">
                  <span className="text-sm opacity-80">
                    ({selectedMentors.length}位导师)
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 动态导师生成器 */}
        <AnimatePresence>
          {showDynamicGenerator && (
            <DynamicMentorGenerator
              onMentorsGenerated={handleDynamicMentorsGenerated}
              onClose={() => setShowDynamicGenerator(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MentorSelection
