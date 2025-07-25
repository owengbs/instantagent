import React from 'react'
import { motion } from 'framer-motion'
import { User, Bot, Clock, FileText } from 'lucide-react'
import { MessageBubbleProps } from '../types'
import { formatTime, copyToClipboard } from '../utils'

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLastMessage }) => {
  const isUser = message.type === 'user'
  const isAssistant = message.type === 'assistant'
  const isTyping = message.isTyping

  // 复制消息内容
  const handleCopyMessage = async () => {
    const success = await copyToClipboard(message.content)
    if (success) {
      // 可以添加复制成功的提示
      console.log('消息已复制到剪贴板')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* 头像 */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
        }`}>
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* 消息内容 */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* 消息气泡 */}
          <div
            className={`relative px-4 py-3 rounded-2xl message-bubble ${
              isUser
                ? 'bg-blue-500 text-white rounded-br-md'
                : 'bg-white text-gray-800 rounded-bl-md shadow-soft border border-gray-200'
            } ${isTyping ? 'animate-pulse' : ''}`}
          >
            {/* 消息文本 */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {isTyping ? (
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              ) : (
                message.content
              )}
            </div>

            {/* 知识库来源（仅助手消息） */}
            {!isTyping && isAssistant && message.retrievedDocs && message.retrievedDocs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                  <FileText className="w-3 h-3" />
                  <span>参考信息来源</span>
                </div>
                <div className="space-y-1">
                  {message.retrievedDocs.slice(0, 2).map((doc, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      {doc.metadata.title && (
                        <span className="font-medium">{doc.metadata.title}</span>
                      )}
                      {doc.metadata.category && (
                        <span className="text-gray-500 ml-1">({doc.metadata.category})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 消息操作（悬停显示） */}
            {!isTyping && (
              <div className={`absolute top-1 ${isUser ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <button
                  onClick={handleCopyMessage}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="复制消息"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* 时间戳 */}
          {!isTyping && (
            <div className={`flex items-center space-x-1 mt-1 text-xs text-gray-400 ${isUser ? 'flex-row-reverse' : ''}`}>
              <Clock className="w-3 h-3" />
              <span>{formatTime(message.timestamp)}</span>
              
              {/* 消息状态（用户消息） */}
              {isUser && (
                <span className="text-green-500">✓</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default MessageBubble 