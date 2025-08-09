import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import AgentAvatar from './AgentAvatar';
import { useChat } from '../contexts/ChatContext';
import { Mentor } from '../types/mentor';



interface MultiAgentChatContainerProps {
  className?: string;
}

const MultiAgentChatContainer: React.FC<MultiAgentChatContainerProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // 从路由状态或本地存储加载选中的导师
  useEffect(() => {
    // 检查是否有动态导师信息
    const routeState = location.state as any;
    if (routeState?.mentors && routeState?.isDynamic) {
      // 使用动态导师
      const mentors: Mentor[] = routeState.mentors;
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
      
      // 保存动态导师信息到本地存储
      localStorage.setItem('selectedMentors', JSON.stringify(mentors));
      localStorage.setItem('dynamicSessionId', routeState.sessionId || '');
      localStorage.setItem('dynamicTopic', routeState.topic || '');
      
      console.log('使用动态导师:', mentors.length, '位导师');
    } else {
      // 从本地存储加载选中的导师
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
    }
  }, [navigate, location.state]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 过滤多智能体消息 - 支持动态导师
  const multiAgentMessages = messages.filter(msg => {
    // 显示用户消息
    if (msg.type === 'user') {
      return true;
    }
    
    // 显示多智能体回复消息
    if (msg.type === 'multi_agent_response') {
      return true;
    }
    
    // 显示单个智能体消息（兼容旧格式）
    if (msg.agent_id && selectedMentors.some(mentor => mentor.id === msg.agent_id)) {
      return true;
    }
    
    // 显示智能体ID类型的消息（新格式）
    if (selectedMentors.some(mentor => mentor.id === msg.type)) {
      return true;
    }
    
    return false;
  });

  // 调试信息
  console.log(`🔍 多智能体消息过滤结果: 总消息数=${messages.length}, 过滤后=${multiAgentMessages.length}`);
  console.log('📋 所有消息类型:', messages.map(msg => ({ type: msg.type, agent_id: msg.agent_id, content: msg.content?.slice(0, 50) })));
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

  // 动态布局导师头像 - 优化布局
  const renderMentorAvatars = () => {
    const mentorCount = selectedMentors.length;
    
    if (mentorCount === 1) {
      // 单个导师：居中显示
      return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <AgentAvatar
            agent={agentInfo[selectedMentors[0].id]}
            size="lg"
            className="border-4 border-white shadow-lg"
          />
        </div>
      );
    } else if (mentorCount === 2) {
      // 两个导师：左右对称
      return selectedMentors.map((mentor, index) => {
        const x = index === 0 ? 40 : 120; // 左右对称位置
        return (
          <div
            key={mentor.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: x, top: 64 }}
          >
            <AgentAvatar
              agent={agentInfo[mentor.id]}
              size="md"
              className="border-4 border-white shadow-lg"
            />
          </div>
        );
      });
    } else {
      // 多个导师：圆形布局
      const radius = 80;
      const centerX = 80;
      const centerY = 64;
      
      return selectedMentors.map((mentor, index) => {
        const angle = (index * 2 * Math.PI) / mentorCount - Math.PI / 2;
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
    }
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
              const mentorCount = selectedMentors.length;
              let x, y;
              
              if (mentorCount === 1) {
                // 单个导师：居中
                x = 80;
                y = 64;
              } else if (mentorCount === 2) {
                // 两个导师：左右对称
                x = index === 0 ? 40 : 120;
                y = 64;
              } else {
                // 多个导师：圆形布局
                const radius = 80;
                const centerX = 80;
                const centerY = 64;
                const angle = (index * 2 * Math.PI) / mentorCount - Math.PI / 2;
                x = centerX + radius * Math.cos(angle);
                y = centerY + radius * Math.sin(angle);
              }
              
              return (
                <line
                  key={mentor.id}
                  x1={80} y1={64}  // 用户位置（中央）
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
            // 获取智能体信息
            let agent;
            if (message.type === 'user') {
              agent = agentInfo.user;
            } else if (message.type === 'multi_agent_response') {
              // 多智能体回复消息
              agent = {
                id: message.agent_id,
                name: message.agent_name || '未知导师',
                description: message.agent_id === 'buffett' ? '价值投资大师' : 
                            message.agent_id === 'soros' ? '宏观投资大师' : 
                            message.agent_id === 'munger' ? '多元思维专家' :
                            message.agent_id === 'krugman' ? '宏观经济专家' : '投资导师',
                color: message.agent_id === 'buffett' ? '#3B82F6' : 
                       message.agent_id === 'soros' ? '#10B981' : 
                       message.agent_id === 'munger' ? '#8B5CF6' :
                       message.agent_id === 'krugman' ? '#F59E0B' : '#6B7280'
              };
            } else {
              // 单个智能体消息
              agent = agentInfo[message.agent_id as keyof typeof agentInfo];
            }
            
            // 调试信息
            if (message.type !== 'user') {
              console.log(`🎭 渲染智能体消息: ${message.agent_id || message.type} (${agent?.name}) - Order: ${message.order}`);
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
                  ${message.agent_id === 'buffett' ? 'border-l-4 border-blue-500' : ''}
                  ${message.agent_id === 'soros' ? 'border-l-4 border-green-500' : ''}
                  ${message.agent_id === 'munger' ? 'border-l-4 border-purple-500' : ''}
                  ${message.agent_id === 'krugman' ? 'border-l-4 border-orange-500' : ''}
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