import React from 'react'
import { motion } from 'framer-motion'

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center text-white"
      >
        {/* Logo/图标 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 mx-auto mb-6 border-4 border-white border-t-transparent rounded-full"
        />
        
        {/* 标题 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold mb-4"
        >
          投资大师圆桌会议
        </motion.h1>
        
        {/* 副标题 */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg opacity-90 mb-8"
        >
          专业的股票交易助手，为您提供贴心服务
        </motion.p>
        
        {/* 加载点 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center space-x-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-white rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
        
        {/* 加载文字 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-sm opacity-75"
        >
          正在初始化智能助手...
        </motion.p>
      </motion.div>
    </div>
  )
}

export default LoadingScreen 