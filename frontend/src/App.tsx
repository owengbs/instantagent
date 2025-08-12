import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MultiAgentChatContainer from './components/MultiAgentChatContainer.tsx'
import Header from './components/Header.tsx'

import LoadingScreen from './components/LoadingScreen.tsx'
import VoiceTest from './components/VoiceTest.tsx'
import VoiceChatInput from './components/VoiceChatInput.tsx'
import MentorSelection from './components/MentorSelection.tsx'
import { DynamicMentorTest } from './components/DynamicMentorTest'
import { MentorManagement } from './components/MentorManagement'
import DebugMentorTest from './components/DebugMentorTest'
import MultiUserTestPage from './components/MultiUserTestPage'
import UserManagementPanel from './components/UserManagementPanel'
import PWAInstaller from './components/PWAInstaller'

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
          <Header 
            onTestClick={() => setShowVoiceTest(false)}
            onSettingsClick={() => console.log('设置')}
            onInfoClick={() => console.log('关于')}
          />
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
          <Header 
            onTestClick={() => setShowVoiceTest(true)}
            onSettingsClick={() => console.log('设置')}
            onInfoClick={() => console.log('关于')}
          />
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

  // 启动时的加载画面
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <Router>
      <ChatProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          {/* 导航栏 */}
          <nav className="bg-white shadow-lg border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between h-16">
                <div className="flex items-center space-x-8">
                  <Link to="/" className="text-xl font-bold text-gray-900">
                    投资大师圆桌会议
                  </Link>
                  <div className="flex space-x-4">
                    <Link 
                      to="/" 
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      导师选择
                    </Link>
                    <Link 
                      to="/chat" 
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      圆桌对话
                    </Link>
                    <Link 
                      to="/test" 
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      功能测试
                    </Link>
                    <Link 
                      to="/management" 
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      导师管理
                    </Link>
                    <Link 
                      to="/debug" 
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      调试
                    </Link>
                    <Link 
                      to="/multi-user-test" 
                      className="text-orange-600 hover:text-orange-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      多用户测试
                    </Link>
                    <Link 
                      to="/user-management" 
                      className="text-purple-600 hover:text-purple-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      用户管理
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>

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
          
          {/* PWA安装器 */}
          <PWAInstaller />
        </div>
      </ChatProvider>
    </Router>
  )
}

export default App 