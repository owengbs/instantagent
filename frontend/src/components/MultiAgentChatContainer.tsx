import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import AgentAvatar from './AgentAvatar';
import { useChat } from '../contexts/ChatContext';



interface MultiAgentChatContainerProps {
  className?: string;
}

const MultiAgentChatContainer: React.FC<MultiAgentChatContainerProps> = ({ className = '' }) => {
  const { state } = useChat();
  const { messages, isTyping } = state;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [agentInfo] = useState({
    buffett: {
      id: 'buffett',
      name: '沃伦·巴菲特',
      description: '价值投资大师',
      avatar: '/avatars/buffett.png',
      color: '#3B82F6'
    },
    soros: {
      id: 'soros',
      name: '乔治·索罗斯',
      description: '宏观投资大师',
      avatar: '/avatars/soros.png',
      color: '#10B981'
    },
    munger: {
      id: 'munger',
      name: '查理·芒格',
      description: '多元思维专家',
      avatar: '/avatars/munger.png',
      color: '#8B5CF6'
    },
    user: {
      id: 'user',
      name: '您',
      description: '投资者',
      avatar: '/avatars/user.png',
      color: '#F59E0B'
    }
  });

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 过滤多智能体消息
  const multiAgentMessages = messages.filter(msg => 
    msg.type === 'user' || 
    msg.type === 'multi_agent_response' ||
    msg.type === 'buffett' || 
    msg.type === 'soros' ||
    msg.type === 'munger'
  );

  // 调试信息
  console.log(`🔍 多智能体消息过滤结果: 总消息数=${messages.length}, 过滤后=${multiAgentMessages.length}`);
  console.log('📋 过滤后的消息类型分布:', multiAgentMessages.reduce((acc, msg) => {
    acc[msg.type] = (acc[msg.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 圆桌布局头部 */}
      <div className="flex justify-center items-center p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-b">
        <div className="relative">
          {/* 用户头像 - 底部中央 */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
            <AgentAvatar
              agent={agentInfo.user}
              size="lg"
              className="border-4 border-white shadow-lg"
            />
          </div>
          
          {/* 巴菲特头像 - 左上角 */}
          <div className="absolute top-0 left-0">
            <AgentAvatar
              agent={agentInfo.buffett}
              size="md"
              className="border-4 border-white shadow-lg"
            />
          </div>
          
          {/* 芒格头像 - 顶部中央 */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
            <AgentAvatar
              agent={agentInfo.munger}
              size="md"
              className="border-4 border-white shadow-lg"
            />
          </div>
          
          {/* 索罗斯头像 - 右上角 */}
          <div className="absolute top-0 right-0">
            <AgentAvatar
              agent={agentInfo.soros}
              size="md"
              className="border-4 border-white shadow-lg"
            />
          </div>
          
          {/* 连接线 - 形成三角形 */}
          <svg className="w-40 h-32" viewBox="0 0 160 128">
            {/* 用户到巴菲特 */}
            <line
              x1="80" y1="96" x2="32" y2="32"
              stroke="#3B82F6" strokeWidth="2" strokeDasharray="5,5"
            />
            {/* 用户到芒格 */}
            <line
              x1="80" y1="96" x2="80" y2="32"
              stroke="#8B5CF6" strokeWidth="2" strokeDasharray="5,5"
            />
            {/* 用户到索罗斯 */}
            <line
              x1="80" y1="96" x2="128" y2="32"
              stroke="#10B981" strokeWidth="2" strokeDasharray="5,5"
            />
            {/* 大师们之间的连接 */}
            <line
              x1="32" y1="32" x2="80" y2="32"
              stroke="#6B7280" strokeWidth="1" strokeDasharray="3,3"
            />
            <line
              x1="80" y1="32" x2="128" y2="32"
              stroke="#6B7280" strokeWidth="1" strokeDasharray="3,3"
            />
          </svg>
        </div>
        
        <div className="ml-4">
          <h2 className="text-xl font-semibold text-gray-800">投资大师圆桌对话</h2>
          <p className="text-sm text-gray-600">与巴菲特、芒格和索罗斯一起探讨投资策略</p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              价值投资
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
              多元思维
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              宏观投资
            </span>
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