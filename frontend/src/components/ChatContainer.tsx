import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '../contexts/ChatContext'
import MessageBubble from './MessageBubble.tsx'
import ChatInput from './ChatInput.tsx'
import VoiceChatInput from './VoiceChatInput.tsx'
import RealtimeVoiceChat from './RealtimeVoiceChat.tsx'
import TypingIndicator from './TypingIndicator.tsx'
import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react'

const ChatContainer: React.FC = () => {
  const { state, sendMessage, connect } = useChat()
  const { messages, isConnected, connectionError } = state
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [useVoiceChat, setUseVoiceChat] = React.useState(true)
  const [useRealtimeMode, setUseRealtimeMode] = React.useState(false)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 调试日志：监控连接状态和语音模式
  useEffect(() => {
    console.log('🔍 ChatContainer 状态:', {
      isConnected,
      useVoiceChat,
      messagesCount: messages.length,
      connectionError,
      timestamp: new Date().toISOString()
    })
  }, [isConnected, useVoiceChat, messages.length, connectionError])

  // 处理重连
  const handleReconnect = () => {
    connect()
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white/50 backdrop-blur-sm rounded-t-3xl shadow-large">
      {/* 连接状态条 */}
      <AnimatePresence>
        {connectionError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {connectionError}
              </span>
            </div>
            <button
              onClick={handleReconnect}
              className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重试</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 聊天消息区域 */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
        data-chat-container
      >
        {/* 欢迎消息 */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-medium">
              {isConnected ? (
                <Wifi className="w-8 h-8 text-white" />
              ) : (
                <WifiOff className="w-8 h-8 text-white" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {isConnected ? '欢迎使用智能客服' : '正在连接...'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
              {isConnected 
                ? '我是您的专属交易助手，有任何问题都可以问我！' 
                : '正在建立连接，请稍候...'}
            </p>
            
            {/* 建议问题 */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto"
              >
                {[
                  '如何注册新账户？',
                  '怎么买入股票？',
                  '充值提现流程是什么？',
                  'APP有哪些功能？'
                ].map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="p-3 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left"
                  >
                    💬 {question}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* 消息列表 */}
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {/* 打字指示器 */}
        <TypingIndicator 
          show={messages.some(msg => msg.isTyping)} 
        />

        {/* 底部锚点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm p-6">
        {useVoiceChat ? (
          useRealtimeMode ? (
            <RealtimeVoiceChat
              disabled={!isConnected}
              onToggle={() => setUseRealtimeMode(false)}
            />
          ) : (
            <VoiceChatInput
              onSendMessage={sendMessage}
              disabled={!isConnected}
              placeholder={
                isConnected 
                  ? "点击麦克风说话或切换到文字输入..." 
                  : "连接中，请稍候..."
              }
              autoSpeak={true}
              onVoiceToggle={setUseVoiceChat}
            />
          )
        ) : (
          <>
            <ChatInput
              onSendMessage={sendMessage}
              disabled={!isConnected}
              placeholder={
                isConnected 
                  ? "输入您的问题..." 
                  : "连接中，请稍候..."
              }
            />
            
            {/* 切换到语音模式的按钮 */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>💡 按 Enter 发送，Shift + Enter 换行</span>
                <button
                  onClick={() => setUseVoiceChat(true)}
                  className="text-blue-500 hover:text-blue-700 font-medium"
                >
                  🎤 切换到语音模式
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>{isConnected ? '已连接' : '连接中'}</span>
              </div>
            </div>
          </>
        )}
        
        {/* 实时模式切换按钮 */}
        {useVoiceChat && !useRealtimeMode && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setUseRealtimeMode(true)}
              className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-sm"
            >
              <span>⚡</span>
              <span>启用实时模式</span>
              <span className="text-xs opacity-75">(流式AI + 实时TTS)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatContainer 