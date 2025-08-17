import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MultiAgentChatContainer from './components/MultiAgentChatContainer.tsx'

import LoadingScreen from './components/LoadingScreen.tsx'
import VoiceTest from './components/VoiceTest.tsx'
import VoiceChatInput from './components/VoiceChatInput.tsx'
import MentorSelection from './components/MentorSelection.tsx'
import { DynamicMentorTest } from './components/DynamicMentorTest'
import { MentorManagement } from './components/MentorManagement'
import DebugMentorTest from './components/DebugMentorTest'
import MultiUserTestPage from './components/MultiUserTestPage'
import UserManagementPanel from './components/UserManagementPanel'
// 移除PWA安装提示功能

import { ChatProvider, useChat } from './contexts/ChatContext'

// 内部聊天组件，在 ChatProvider 内部使用 useChat
const ChatInterface: React.FC = () => {
  const { sendMessage } = useChat()
  const [showVoiceTest, setShowVoiceTest] = useState(false)

  return (
    <AnimatePresence mode="wait">
      {showVoiceTest ? (
        <motion.div
          key="voice-test"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="h-screen flex flex-col"
        >
          {/* 顶部Header移除以满足首页精简化要求 */}
          <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
            <VoiceTest />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="chat"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-screen flex flex-col"
        >
          {/* 顶部Header移除以满足首页精简化要求 */}
          <div className="flex-1 overflow-hidden">
            <MultiAgentChatContainer />
          </div>
          {/* 语音输入区 */}
          <div className="p-4 bg-white/80">
            <VoiceChatInput onSendMessage={sendMessage} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}



function App() {
  const [isLoading, setIsLoading] = useState(true)

  // 模拟初始加载
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  // 在开发/外网调试（如 ngrok）时，确保已卸载任何已注册的 Service Worker，避免拦截接口/WS 导致返回 HTML
  useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production'
    const isNgrok = (window.location.host || '').includes('ngrok')
    if ('serviceWorker' in navigator && (!isProd || isNgrok)) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister().catch(() => {}))
      })
    }
  }, [])

  // 启动时的加载画面
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <Router>
      <ChatProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          {/* 顶部导航移除，首页只保留核心入口（讨论话题/导师选择/开始对话） */}

          {/* 路由内容 */}
          <Routes>
            <Route path="/" element={<MentorSelection />} />
            <Route path="/chat" element={<ChatInterface />} />
            <Route path="/test" element={<DynamicMentorTest />} />
            <Route path="/management" element={<MentorManagement />} />
            <Route path="/debug" element={<DebugMentorTest />} />
            <Route path="/multi-user-test" element={<MultiUserTestPage />} />
            <Route path="/user-management" element={<UserManagementPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* 已移除PWA安装提示 */}
        </div>
      </ChatProvider>
    </Router>
  )
}

export default App 