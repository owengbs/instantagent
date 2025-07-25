import React from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Zap, Shield, Clock } from 'lucide-react'
import { WelcomeProps } from '../types'

const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  const features = [
    {
      icon: MessageSquare,
      title: '智能对话',
      description: '基于AI的自然语言理解，像真人一样交流',
    },
    {
      icon: Zap,
      title: '快速响应',
      description: '实时回复，无需等待，解决问题更高效',
    },
    {
      icon: Shield,
      title: '专业可靠',
      description: '丰富的交易知识库，为您提供准确信息',
    },
    {
      icon: Clock,
      title: '24小时服务',
      description: '随时为您服务，解答各种交易疑问',
    },
  ]

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center text-white mb-12">
          {/* 主标题 */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4">
              智能交易客服
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              您的专属股票交易助手，为新用户提供专业、友好的指导服务
            </p>
          </motion.div>

          {/* 特性介绍 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition-colors"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-white/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* 开始按钮 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <button
              onClick={onStart}
              className="group relative px-8 py-4 bg-white text-gray-800 font-semibold rounded-full text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-large"
            >
              <span className="relative z-10 flex items-center space-x-2">
                <span>开始对话</span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </motion.div>
              </span>
              
              {/* 按钮光效 */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            </button>
          </motion.div>

          {/* 底部提示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="mt-8 text-sm opacity-75"
          >
            <p>💡 您可以询问账户注册、交易操作、资金管理等任何问题</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Welcome 