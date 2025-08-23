import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')

  // 示例问题
  const exampleQuestions = [
    "量化投资会取代传统基金经理吗？",
    "如何在通胀环境下保护投资组合？",
    "ESG投资是否真的能带来超额收益？",
    "加密货币在投资组合中的合理配置是多少？"
  ]

  const handleStartDiscussion = () => {
    if (!topic.trim()) {
      // 如果没有输入话题，使用示例问题
      const randomExample = exampleQuestions[Math.floor(Math.random() * exampleQuestions.length)]
      setTopic(randomExample)
      // 延迟一下让用户看到填充的内容
      setTimeout(() => {
        navigate('/mentor-selection', { state: { topic: randomExample } })
      }, 500)
    } else {
      navigate('/mentor-selection', { state: { topic: topic.trim() } })
    }
  }

  const handleExampleClick = (example: string) => {
    setTopic(example)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-black rounded-3xl flex items-center justify-center shadow-lg">
            <div className="relative">
              {/* 中心麦克风图标 */}
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="w-3 h-5 bg-black rounded-full"></div>
              </div>
              {/* 环形装饰点 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-white/30 rounded-full relative">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-white/60 rounded-full"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-28px)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            投资大师圆桌会
          </h1>
          <p className="text-lg text-gray-600">
            与投资大师们一起语音讨论任何投资话题
          </p>
        </motion.div>

        {/* 输入框 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <div className="relative">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="描述您想讨论的投资话题..."
              className="w-full h-40 p-6 text-lg border-2 border-gray-200 rounded-2xl resize-none focus:border-gray-400 focus:outline-none transition-colors bg-white/80 backdrop-blur-sm"
              style={{ fontSize: '16px' }} // 防止iOS缩放
            />
          </div>
        </motion.div>

        {/* 示例问题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-8"
        >
          <div className="text-center">
            <button
              onClick={() => handleExampleClick(exampleQuestions[0])}
              className="inline-flex items-center px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              <span className="mr-2">"</span>
              <span>{exampleQuestions[0]}</span>
              <span className="ml-2">"</span>
            </button>
          </div>
        </motion.div>

        {/* 开始按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <button
            onClick={handleStartDiscussion}
            className="w-full bg-black text-white py-4 px-8 rounded-2xl text-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-3 shadow-lg"
          >
            <Users className="w-5 h-5" />
            <span>发起圆桌讨论</span>
          </button>
        </motion.div>

        {/* 其他示例问题（隐藏，用于随机选择） */}
        <div className="hidden">
          {exampleQuestions.slice(1).map((question, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(question)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HomePage
