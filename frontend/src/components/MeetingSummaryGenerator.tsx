import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Users,
  MessageSquare,
  Sparkles
} from 'lucide-react'
import API_CONFIG from '../config/api'

interface MeetingSummaryGeneratorProps {
  sessionId: string
  topic?: string
  // 新增：可选直传的会话消息，用于后端兜底
  messages?: any[]
  onSummaryGenerated: (summary: any) => void
  onClose: () => void
}

interface GenerationStatus {
  stage: 'preparing' | 'analyzing' | 'generating' | 'completed' | 'error'
  message: string
  progress: number
}

const MeetingSummaryGenerator: React.FC<MeetingSummaryGeneratorProps> = ({
  sessionId,
  topic,
  messages,
  onSummaryGenerated,
  onClose
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<GenerationStatus>({
    stage: 'preparing',
    message: '准备生成会议总结...',
    progress: 20
  })
  const [error, setError] = useState('')

  const handleGenerateSummary = async () => {
    setIsGenerating(true)
    setError('')
    
    try {
      // 调试信息
      console.log('🔍 开始生成会议纪要...')
      console.log('📋 会话ID:', sessionId)
      console.log('📋 主题:', topic)
      console.log('🔗 API地址:', `${API_CONFIG.getHttpBaseUrl()}/api/meeting-summary/generate`)
      
      // 第一阶段：准备
      setStatus({
        stage: 'preparing',
        message: '正在收集会议数据...',
        progress: 20
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 第二阶段：分析
      setStatus({
        stage: 'analyzing',
        message: '正在分析对话内容...',
        progress: 40
      })
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 第三阶段：生成
      setStatus({
        stage: 'generating',
        message: '正在生成会议纪要...',
        progress: 70
      })
      
      // 调用后端API生成总结
      const requestBody: any = {
        session_id: sessionId,
        topic: topic
      }
      // 如有传入消息，则一并发送，便于后端兜底
      if (Array.isArray(messages) && messages.length > 0) {
        requestBody.messages = messages
      }
      
      console.log('📤 发送请求体:', requestBody)
      
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/meeting-summary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('📥 收到响应:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API错误:', errorData)
        throw new Error(errorData.detail || '生成会议总结失败')
      }
      
      const data = await response.json()
      console.log('✅ 成功数据:', data)
      
      // 完成
      setStatus({
        stage: 'completed',
        message: '会议纪要生成完成！',
        progress: 100
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onSummaryGenerated(data.summary)
      
    } catch (err: any) {
      console.error('生成会议总结失败:', err)
      setError(err.message || '生成会议总结失败，请重试')
      setStatus({
        stage: 'error',
        message: '生成失败',
        progress: 0
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const getStageIcon = () => {
    switch (status.stage) {
      case 'preparing':
        return <Clock className="w-6 h-6 text-blue-500" />
      case 'analyzing':
        return <MessageSquare className="w-6 h-6 text-purple-500" />
      case 'generating':
        return <Sparkles className="w-6 h-6 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />
      default:
        return <FileText className="w-6 h-6 text-gray-500" />
    }
  }

  const getStageColor = () => {
    switch (status.stage) {
      case 'preparing':
        return 'from-blue-500 to-blue-600'
      case 'analyzing':
        return 'from-purple-500 to-purple-600'
      case 'generating':
        return 'from-yellow-500 to-yellow-600'
      case 'completed':
        return 'from-green-500 to-green-600'
      case 'error':
        return 'from-red-500 to-red-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* 头部 */}
        <div className={`bg-gradient-to-r ${getStageColor()} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">生成会议纪要</h2>
                <p className="text-white/80 text-sm">
                  {topic ? `主题：${topic}` : '投资圆桌讨论'}
                </p>
              </div>
            </div>
            {!isGenerating && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {!isGenerating && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  准备生成会议纪要
                </h3>
                <p className="text-gray-600">
                  系统将分析本次圆桌会议的对话内容，为您生成专业的会议纪要，包括核心观点、行动建议等内容。
                </p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-700">参与者分析</span>
                  </div>
                  <span className="text-sm text-gray-500">包含</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-700">对话内容总结</span>
                  </div>
                  <span className="text-sm text-gray-500">包含</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-700">智能洞察分析</span>
                  </div>
                  <span className="text-sm text-gray-500">包含</span>
                </div>
              </div>
              
              <button
                onClick={handleGenerateSummary}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
              >
                开始生成会议纪要
              </button>
            </motion.div>
          )}

          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="mb-6">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                  <div 
                    className={`absolute inset-0 rounded-full border-4 border-t-transparent bg-gradient-to-r ${getStageColor()}`}
                    style={{
                      background: `conic-gradient(from 0deg, transparent ${360 - (status.progress * 3.6)}deg, currentColor ${360 - (status.progress * 3.6)}deg)`
                    }}
                  ></div>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    {getStageIcon()}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {status.message}
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <motion.div
                    className={`h-2 rounded-full bg-gradient-to-r ${getStageColor()}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${status.progress}%` }}
                    transition={{ duration: 0.5 }}
                  ></motion.div>
                </div>
                <p className="text-sm text-gray-600">
                  正在处理中，请稍候...
                </p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  生成失败
                </h3>
                <p className="text-red-600 mb-4">
                  {error}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setError('')
                    handleGenerateSummary()
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                >
                  重试
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-all duration-300"
                >
                  取消
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default MeetingSummaryGenerator
