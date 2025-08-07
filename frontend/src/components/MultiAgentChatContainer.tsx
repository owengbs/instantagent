import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import AgentAvatar from './AgentAvatar';
import { useChat } from '../contexts/ChatContext';
import { Mentor } from '../types/mentor';



interface MultiAgentChatContainerProps {
  className?: string;
}

const MultiAgentChatContainer: React.FC<MultiAgentChatContainerProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { state } = useChat();
  const { messages, isTyping } = state;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMentors, setSelectedMentors] = useState<Mentor[]>([]);
  const [agentInfo, setAgentInfo] = useState<Record<string, any>>({
    user: {
      id: 'user',
      name: '您',
      description: '投资者',
      avatar: '/avatars/user.png',
      color: '#F59E0B'
    }
  });

  // 从本地存储加载选中的导师
  useEffect(() => {
    const savedMentors = localStorage.getItem('selectedMentors');
    if (savedMentors) {
      try {
        const mentors: Mentor[] = JSON.parse(savedMentors);
        setSelectedMentors(mentors);
        
        // 转换导师数据为agentInfo格式
        const newAgentInfo: Record<string, any> = {
          user: {
            id: 'user',
            name: '您',
            description: '投资者',
            avatar: '/avatars/user.png',
            color: '#F59E0B'
          }
        };
        
        mentors.forEach(mentor => {
          newAgentInfo[mentor.id] = {
            id: mentor.id,
            name: mentor.name,
            description: mentor.title,
            avatar: mentor.avatar,
            color: mentor.color
          };
        });
        
        setAgentInfo(newAgentInfo);
      } catch (error) {
        console.error('加载选中导师失败:', error);
        // 如果没有选中导师，重定向到选择页面
        navigate('/');
      }
    } else {
      // 如果没有选中导师，重定向到选择页面
      navigate('/');
    }
  }, [navigate]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 过滤多智能体消息 - 支持动态导师
  const multiAgentMessages = messages.filter(msg => {
    if (msg.type === 'user' || msg.type === 'multi_agent_response') {
      return true;
    }
    // 检查消息类型是否在选中的导师中
    return selectedMentors.some(mentor => mentor.id === msg.type);
  });

  // 调试信息
  console.log(`🔍 多智能体消息过滤结果: 总消息数=${messages.length}, 过滤后=${multiAgentMessages.length}`);
  console.log('📋 过滤后的消息类型分布:', multiAgentMessages.reduce((acc, msg) => {
    acc[msg.type] = (acc[msg.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));

  // 如果没有选中导师，显示加载状态
  if (selectedMentors.length === 0) {
    return (
      <div className={`flex flex-col h-full items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载导师信息...</p>
        </div>
      </div>
    );
  }

  // 动态布局导师头像
  const renderMentorAvatars = () => {
    const mentorCount = selectedMentors.length;
    const radius = 80; // 圆的半径
    const centerX = 80;
    const centerY = 64;
    
    return selectedMentors.map((mentor, index) => {
      const angle = (index * 2 * Math.PI) / mentorCount - Math.PI / 2; // 从顶部开始
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      return (
        <div
          key={mentor.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: x, top: y }}
        >
          <AgentAvatar
            agent={agentInfo[mentor.id]}
            size="md"
            className="border-4 border-white shadow-lg"
          />
        </div>
      );
    });
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 动态圆桌布局头部 */}
      <div className="flex justify-center items-center p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-b">
        <div className="relative" style={{ width: '160px', height: '128px' }}>
          {/* 用户头像 - 中央 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <AgentAvatar
              agent={agentInfo.user}
              size="lg"
              className="border-4 border-white shadow-lg"
            />
          </div>
          
          {/* 动态导师头像 */}
          {renderMentorAvatars()}
          
          {/* 连接线 - 从用户到每位导师 */}
          <svg className="absolute inset-0 w-full h-full">
            {selectedMentors.map((mentor, index) => {
              const angle = (index * 2 * Math.PI) / selectedMentors.length - Math.PI / 2;
              const radius = 80;
              const centerX = 80;
              const centerY = 64;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              
              return (
                <line
                  key={mentor.id}
                  x1={centerX} y1={centerY}
                  x2={x} y2={y}
                  stroke={mentor.color}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              );
            })}
          </svg>
        </div>
        
        <div className="ml-4">
          <h2 className="text-xl font-semibold text-gray-800">投资大师圆桌对话</h2>
          <p className="text-sm text-gray-600">
            与{selectedMentors.map(m => m.name).join('、')}一起探讨投资策略
          </p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 flex-wrap">
            {selectedMentors.map((mentor) => (
              <span key={mentor.id} className="flex items-center">
                <div 
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: mentor.color }}
                ></div>
                {mentor.investmentStyle}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {multiAgentMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-4">🎤</div>
            <p className="text-lg font-medium">开始您的投资对话</p>
            <p className="text-sm">点击麦克风按钮，与投资大师们交流</p>
          </div>
        ) : (
          multiAgentMessages.map((message, index) => {
            const agent = agentInfo[message.agent_id as keyof typeof agentInfo];
            
            // 调试信息
            if (message.type !== 'user') {
              console.log(`🎭 渲染智能体消息: ${message.agent_id} (${message.agent_name}) - Order: ${message.order}`);
            }
            
            return (
              <MessageBubble
                key={`${message.timestamp}-${index}`}
                message={{
                  ...message,
                  agent: agent,
                  isMultiAgent: true
                }}
                className={`
                  ${message.type === 'user' ? 'ml-auto' : 'mr-auto'}
                  ${message.type === 'buffett' ? 'border-l-4 border-blue-500' : ''}
                  ${message.type === 'soros' ? 'border-l-4 border-green-500' : ''}
                  ${message.type === 'munger' ? 'border-l-4 border-purple-500' : ''}
                  ${message.order ? `order-${message.order}` : ''}
                `}
              />
            );
          })
        )}
        
        {/* 处理中指示器 */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm">投资大师们正在思考...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MultiAgentChatContainer; 