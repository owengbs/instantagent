import React from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Settings, Info, Wifi, WifiOff, TestTube } from 'lucide-react'

interface HeaderProps {
  isConnected?: boolean
  onSettingsClick?: () => void
  onInfoClick?: () => void
  onTestClick?: () => void
}

const Header: React.FC<HeaderProps> = ({ 
  isConnected = true, 
  onSettingsClick, 
  onInfoClick,
  onTestClick 
}) => {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 shadow-soft"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo 和标题 */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-medium">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">投资大师圆桌会议</h1>
            <p className="text-sm text-gray-500">专业的股票交易助手</p>
          </div>
        </div>

        {/* 状态和操作区域 */}
        <div className="flex items-center space-x-4">
          {/* 连接状态 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center space-x-2"
          >
            <div className={`p-2 rounded-lg ${
              isConnected 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {isConnected ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              {isConnected ? '已连接' : '连接中...'}
            </span>
          </motion.div>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-300" />

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            {/* 语音测试按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onTestClick}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="语音测试"
            >
              <TestTube className="w-5 h-5" />
            </motion.button>

            {/* 信息按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onInfoClick}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="关于"
            >
              <Info className="w-5 h-5" />
            </motion.button>

            {/* 设置按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSettingsClick}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="设置"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* 进度条（当连接中时显示） */}
      {!isConnected && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 origin-left"
        />
      )}
    </motion.header>
  )
}

export default Header 