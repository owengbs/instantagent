import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Users, Filter, Search, Zap } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mentor } from '../types/mentor'
import { DEFAULT_MENTORS } from '../config/mentors'
import MentorCard from './MentorCard'

import DynamicMentorGenerator from './DynamicMentorGenerator'
import { useMentors } from '../hooks/useMentors'
import { useChat } from '../contexts/ChatContext'

const MentorSelection: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { getEnabledMentors, loading: mentorsLoading, error: mentorsError } = useMentors()
  const { sendMentorSelection } = useChat()
  
  // 从路由状态中获取话题
  const topicFromRoute = (location.state as any)?.topic || ''
  
  // 优先使用后端数据，如果失败则使用默认数据
  const [availableMentors, setAvailableMentors] = useState<Mentor[]>(DEFAULT_MENTORS)
  const [selectedMentors, setSelectedMentors] = useState<Mentor[]>([])

  const [showDynamicGenerator, setShowDynamicGenerator] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStyle, setFilterStyle] = useState<string>('')



  // 如果从首页传来了话题，自动打开动态导师生成器
  useEffect(() => {
    if (topicFromRoute) {
      setShowDynamicGenerator(true)
    }
  }, [topicFromRoute])

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

    // 为默认导师生成sessionId（确保会议纪要功能正常）
    const timestamp = Date.now();
    const suffix = Math.random().toString(36).slice(2, 10);
    const defaultSessionId = `default_${timestamp}_msg_${timestamp}_${suffix}`;
    const defaultTopic = '投资圆桌讨论';
    
    // 保存选中的导师到本地存储
    localStorage.setItem('selectedMentors', JSON.stringify(selectedMentors))
    
    // 保存会话信息（与动态导师格式保持一致）
    localStorage.setItem('dynamicSessionId', defaultSessionId)
    localStorage.setItem('dynamicTopic', defaultTopic)
    
    // 调试信息
    console.log('🎯 开始圆桌会议，选中的导师:', selectedMentors.map(m => ({ id: m.id, name: m.name })))
    console.log('🔑 生成的sessionId:', defaultSessionId)
    console.log('📋 设置的主题:', defaultTopic)
    
    // 立即发送导师选择信息到后端
    console.log('📤 立即发送导师选择到后端')
    sendMentorSelection(selectedMentors)
    
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-24 sm:pb-28">
        {/* 简化的头部 */}
         <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
           className="text-center mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              投资大师圆桌会议
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
            选择您想要对话的投资导师，开启专属的智慧交流之旅
          </p>
          
          {/* 已选导师统计 */}
          {selectedMentors.length > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium">
                已选择 {selectedMentors.length} 位导师
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* 核心功能区域 */}
         <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
           className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          {/* 讨论话题按钮 - 主要功能 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDynamicGenerator(true)}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Zap className="w-5 h-5" />
            <span className="font-semibold text-lg">讨论话题</span>
          </motion.button>

          {/* 搜索框 */}
           <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索导师..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
            />
          </div>

          {/* 投资风格过滤 */}
           <div className="relative min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="pl-10 pr-8 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white/80 backdrop-blur-sm min-w-[160px] text-sm"
            >
              <option value="">所有风格</option>
              {investmentStyles.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* 导师网格 - 优化移动端布局 */}
         <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
           className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
        >
          <AnimatePresence>
            {filteredMentors.map((mentor, index) => (
              <motion.div
                key={mentor.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
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
            <div className="text-gray-300 mb-4">
              <Users className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-base font-medium text-gray-600 mb-2">
              没有找到匹配的导师
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              尝试调整搜索条件或使用"讨论话题"功能
            </p>
            <button
              onClick={() => setShowDynamicGenerator(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>讨论话题</span>
            </button>
          </motion.div>
        )}

        {/* 开始按钮 - 优化移动端位置 */}
        <AnimatePresence>
          {selectedMentors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="sticky bottom-4 z-10 mt-6"
            >
              <div className="max-w-md mx-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startRoundtable}
                  className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <span className="text-base font-semibold">开始圆桌会议</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs opacity-80">({selectedMentors.length}位导师)</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 动态导师生成器 */}
        <AnimatePresence>
          {showDynamicGenerator && (
            <DynamicMentorGenerator
              onMentorsGenerated={handleDynamicMentorsGenerated}
              onClose={() => setShowDynamicGenerator(false)}
              initialTopic={topicFromRoute}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MentorSelection
