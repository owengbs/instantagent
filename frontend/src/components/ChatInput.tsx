import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Smile, Paperclip } from 'lucide-react'
import { ChatInputProps } from '../types'

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "输入您的问题..." 
}) => {
  const [message, setMessage] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整输入框高度
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    adjustTextareaHeight()
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 发送消息
  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      // 重置输入框高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  // 处理输入法组合输入
  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = () => {
    setIsComposing(false)
  }

  // 焦点到输入框
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  // 快捷插入常用语
  const quickPhrases = [
    '谢谢',
    '我明白了',
    '请继续',
    '还有其他问题'
  ]

  const insertQuickPhrase = (phrase: string) => {
    const newMessage = message ? `${message} ${phrase}` : phrase
    setMessage(newMessage)
    textareaRef.current?.focus()
  }

  return (
    <div className="space-y-3">
      {/* 快捷短语 */}
      {message === '' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-2"
        >
          {quickPhrases.map((phrase) => (
            <button
              key={phrase}
              onClick={() => insertQuickPhrase(phrase)}
              disabled={disabled}
              className="px-3 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phrase}
            </button>
          ))}
        </motion.div>
      )}

      {/* 主输入区域 */}
      <div className="relative">
        <div className={`flex items-end space-x-3 p-4 bg-white rounded-2xl shadow-soft border-2 transition-colors ${
          disabled 
            ? 'border-gray-200 bg-gray-50' 
            : 'border-gray-200 focus-within:border-blue-300'
        }`}>
          {/* 附件按钮（占位） */}
          <button
            disabled={disabled}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="附件（即将推出）"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* 输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none border-none outline-none bg-transparent text-gray-800 placeholder-gray-400 disabled:cursor-not-allowed disabled:text-gray-500"
              style={{ 
                minHeight: '24px',
                maxHeight: '120px',
                lineHeight: '24px'
              }}
            />
            
            {/* 字符计数 */}
            {message.length > 200 && (
              <div className="absolute -bottom-6 right-0 text-xs text-gray-400">
                {message.length}/500
              </div>
            )}
          </div>

          {/* 表情按钮（占位） */}
          <button
            disabled={disabled}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="表情（即将推出）"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* 发送按钮 */}
          <motion.button
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={handleSendMessage}
            disabled={disabled || !message.trim()}
            className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 ${
              disabled || !message.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-soft'
            }`}
            title="发送消息 (Enter)"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {/* 输入提示 */}
        {!disabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -bottom-8 left-4 text-xs text-gray-400"
          >
            按 Enter 发送，Shift + Enter 换行
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ChatInput 