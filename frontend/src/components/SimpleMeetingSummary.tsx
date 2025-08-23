import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, FileText, Users, Home } from 'lucide-react'

interface SimpleMeetingSummaryProps {
  summary: any
  topic: string
  participants: string[]
  duration: string
  onSave?: () => void
  onClose: () => void
}

const SimpleMeetingSummary: React.FC<SimpleMeetingSummaryProps> = ({
  summary,
  topic,
  participants,
  duration,
  onSave,
  onClose
}) => {
  const handleSave = () => {
    // 这里可以添加保存逻辑
    if (onSave) {
      onSave()
    }
    // 保存后关闭
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
      {/* 顶部完成图标和标题 */}
      <div className="text-center py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          讨论结束
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600"
        >
          耗时：{duration}
        </motion.p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 px-6 pb-6 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          {/* 议题 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">议题：</span>
            </div>
            <p className="text-gray-700 ml-7">{topic}</p>
          </div>

          {/* 参会人员 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">参会：</span>
            </div>
            <p className="text-gray-700 ml-7">{participants.join('、')}</p>
          </div>

          {/* 纪要 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">纪要：</span>
            </div>
            <div className="ml-7 space-y-4 text-gray-700">
              {summary?.summary && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">### 讨论总结</h4>
                  <p className="leading-relaxed">{summary.summary}</p>
                </div>
              )}
              
              {summary?.key_points && summary.key_points.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">### 关键要点</h4>
                  <ul className="space-y-1">
                    {summary.key_points.map((point: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-gray-400 mt-1">-</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {summary?.recommendations && summary.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">### 操作建议</h4>
                  <ul className="space-y-1">
                    {summary.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-gray-400 mt-1">-</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 底部按钮 */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-6 bg-white border-t border-gray-200"
      >
        <div className="max-w-2xl mx-auto flex space-x-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-black text-white py-4 px-6 rounded-2xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
          >
            <FileText className="w-5 h-5" />
            <span>保存讨论</span>
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 py-4 px-6 rounded-2xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>回到首页</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default SimpleMeetingSummary
