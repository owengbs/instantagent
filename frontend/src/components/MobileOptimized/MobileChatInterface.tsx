import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, MoreVertical, Users, Settings, Share2 } from 'lucide-react';
import MobileVoiceButton from './MobileVoiceButton';

interface Mentor {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
  color?: string;
}

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: Date;
}

interface MobileChatInterfaceProps {
  mentors: Mentor[];
  messages: Message[];
  isRecording: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  recordingLevel?: number;
  onToggleRecording: () => void;
  onToggleMute: () => void;
  onSendMessage: (message: string) => void;
  onEndConversation: () => void;
  onGenerateSummary: () => void;
}

const MobileChatInterface: React.FC<MobileChatInterfaceProps> = ({
  mentors,
  messages,
  isRecording,
  isPlaying,
  isMuted,
  recordingLevel = 0,
  onToggleRecording,
  onToggleMute,
  onSendMessage,
  onEndConversation,
  onGenerateSummary
}) => {
  const [textInput, setTextInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 检测虚拟键盘
  useEffect(() => {
    const handleResize = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      setIsKeyboardOpen(vh < window.screen.height * 0.75);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 发送文本消息
  const handleSendText = () => {
    if (textInput.trim()) {
      onSendMessage(textInput.trim());
      setTextInput('');
      textareaRef.current?.focus();
    }
  };

  // 分享功能
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '投资大师圆桌会议',
          text: '与AI投资大师进行深度对话',
          url: window.location.href
        });
      } catch (error) {
        console.log('分享取消或失败');
      }
    } else {
      // 降级到复制链接
      navigator.clipboard?.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  return (
    <div className="mobile-chat-container flex flex-col h-screen bg-gray-50">
      {/* 顶部导师栏 */}
      <div className="mobile-nav bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <Users className="w-5 h-5 text-gray-600" />
            <div className="flex -space-x-2">
              {mentors.slice(0, 4).map((mentor, index) => (
                <div
                  key={mentor.id}
                  className="mobile-avatar border-2 border-white"
                  style={{ zIndex: 10 - index }}
                >
                  {mentor.avatar ? (
                    <img 
                      src={mentor.avatar} 
                      alt={mentor.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: mentor.color || '#3B82F6' }}
                    >
                      {mentor.name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {mentors.length > 1 ? `${mentors.length}位导师` : mentors[0]?.name}
              </p>
              <p className="text-xs text-gray-500">
                {isRecording ? '正在聆听...' : isPlaying ? '正在回复...' : '在线'}
              </p>
            </div>
          </div>
          
          <button
            className="mobile-touch-target"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* 下拉菜单 */}
        {showMenu && (
          <div className="absolute right-4 top-16 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <button
              className="mobile-list-item px-4 py-3 text-left w-full"
              onClick={() => {
                handleShare();
                setShowMenu(false);
              }}
            >
              <Share2 className="w-4 h-4 inline mr-2" />
              分享对话
            </button>
            <button
              className="mobile-list-item px-4 py-3 text-left w-full"
              onClick={() => {
                onGenerateSummary();
                setShowMenu(false);
              }}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              生成纪要
            </button>
            <button
              className="mobile-list-item px-4 py-3 text-left w-full text-red-600"
              onClick={() => {
                onEndConversation();
                setShowMenu(false);
              }}
            >
              结束对话
            </button>
          </div>
        )}
      </div>

      {/* 消息列表 */}
      <div className="mobile-content flex-1 overflow-y-auto px-4 py-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex mb-4 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.type === 'agent' && (
              <div className="flex-shrink-0 mr-3">
                {/* 导师头像 */}
                <div className="mobile-avatar">
                  {/* 根据agentId找到对应导师 */}
                  {(() => {
                    const mentor = mentors.find(m => m.id === message.agentId);
                    return mentor?.avatar ? (
                      <img 
                        src={mentor.avatar} 
                        alt={mentor.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div 
                        className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: mentor?.color || '#3B82F6' }}
                      >
                        {(message.agentName || mentor?.name || 'AI').charAt(0)}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            
            <div className={`mobile-chat-bubble ${message.type}`}>
              {message.type === 'agent' && (
                <p className="text-xs font-medium mb-1 opacity-70">
                  {message.agentName || '导师'}
                </p>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入区域 */}
      <div 
        className={`
          bg-white border-t border-gray-200 p-4 transition-all duration-300
          ${isKeyboardOpen ? 'pb-2' : 'mobile-bottom-safe'}
        `}
      >
        {/* 语音控制 */}
        {!isKeyboardOpen && (
          <div className="mb-4">
            <MobileVoiceButton
              isRecording={isRecording}
              isPlaying={isPlaying}
              isMuted={isMuted}
              recordingLevel={recordingLevel}
              onToggleRecording={onToggleRecording}
              onToggleMute={onToggleMute}
            />
          </div>
        )}
        
        {/* 文本输入 */}
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="输入消息..."
              className="mobile-input resize-none h-10 min-h-[2.5rem] max-h-32"
              rows={1}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              style={{
                height: 'auto',
                minHeight: '2.5rem',
                maxHeight: '8rem'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
          
          <button
            className={`
              mobile-touch-target rounded-full p-2 transition-all duration-200
              ${textInput.trim() 
                ? 'bg-blue-500 text-white shadow-lg active:bg-blue-600 active:scale-95' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
            onClick={handleSendText}
            disabled={!textInput.trim()}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* 点击菜单外部关闭 */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default MobileChatInterface;
