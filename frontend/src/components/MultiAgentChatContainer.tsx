import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, LogOut } from 'lucide-react';
import MessageBubble from './MessageBubble';
import AgentAvatar from './AgentAvatar';
import MeetingSummaryGenerator from './MeetingSummaryGenerator';
import MeetingSummary from './MeetingSummary';
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
  const [isValidAccess, setIsValidAccess] = useState(false);
  const [showSummaryGenerator, setShowSummaryGenerator] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
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
      
      // 设置会话信息
      setSessionId(routeState.sessionId || '');
      setTopic(routeState.topic || '');
      
      console.log('🖥️ PC端使用动态导师:', mentors.length, '位导师');
      setIsValidAccess(true);
    } else {
      // 从本地存储加载选中的导师
      const savedMentors = localStorage.getItem('selectedMentors');
      console.log('🖥️ PC端加载本地存储的导师数据');
      
      if (savedMentors) {
        try {
          const mentors: Mentor[] = JSON.parse(savedMentors);
          console.log('🖥️ PC端解析后的导师数据:', mentors.map(m => ({ id: m.id, name: m.name })));
          
          if (mentors.length > 0) {
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
            
            // 从localStorage获取会话信息
            const dynamicSessionId = localStorage.getItem('dynamicSessionId');
            const dynamicTopic = localStorage.getItem('dynamicTopic');
            if (dynamicSessionId) {
              setSessionId(dynamicSessionId);
              setTopic(dynamicTopic || '');
            }
            
            setIsValidAccess(true);
          } else {
            // 导师列表为空，重定向到首页
            console.log('导师列表为空，重定向到首页');
            navigate('/', { replace: true });
            return;
          }
        } catch (error) {
          console.error('加载选中导师失败:', error);
          // 如果没有选中导师，重定向到选择页面
          navigate('/', { replace: true });
          return;
        }
      } else {
        // 如果没有选中导师，重定向到选择页面
        console.log('没有找到选中的导师，重定向到首页');
        navigate('/', { replace: true });
        return;
      }
    }
  }, [navigate, location.state]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理结束对话
  const handleEndConversation = () => {
    if (messages.length < 2) {
      alert('对话内容太少，无法生成有意义的会议纪要');
      return;
    }
    setShowSummaryGenerator(true);
  };

  // 处理会议总结生成完成
  const handleSummaryGenerated = (summary: any) => {
    setSummaryData(summary);
    setShowSummaryGenerator(false);
    setShowSummary(true);
  };

  // 处理总结导出
  const handleExportSummary = () => {
    if (!summaryData) return;
    
    // 创建一个简单的文本格式导出
    const exportContent = `
会议纪要
========

会议主题：${summaryData.meeting_info?.topic || '投资圆桌讨论'}
会议日期：${summaryData.meeting_info?.date || ''}
会议时长：${summaryData.meeting_info?.duration || ''}
参与人数：${summaryData.meeting_info?.participants_count || 0}位

会议要点
--------
${summaryData.summary?.executive_summary || ''}

关键洞察
--------
${summaryData.summary?.key_insights?.map((insight: any, index: number) => 
  `${index + 1}. ${insight.topic}\n${insight.insights?.map((i: string) => `   • ${i}`).join('\n') || ''}`
).join('\n\n') || ''}

行动建议
--------
${summaryData.summary?.actionable_advice?.map((advice: string, index: number) => 
  `${index + 1}. ${advice}`
).join('\n') || ''}

生成时间：${new Date(summaryData.generated_at).toLocaleString()}
    `.trim();

    // 创建下载链接
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `会议纪要_${summaryData.meeting_info?.topic || '圆桌讨论'}_${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  // 添加详细的调试信息
  console.log('🖥️ PC端渲染检查:', {
    isValidAccess,
    selectedMentorsLength: selectedMentors.length,
    selectedMentors: selectedMentors.map(m => ({ id: m.id, name: m.name }))
  })

  // 如果访问无效，显示加载状态或重定向
  if (!isValidAccess) {
    console.warn('🖥️ PC端访问状态无效，显示加载页面')
    return (
      <div className={`flex flex-col h-full items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证访问权限...</p>
          <p className="mt-2 text-xs text-gray-400">Debug: isValidAccess = {String(isValidAccess)}</p>
        </div>
      </div>
    );
  }

  if (selectedMentors.length === 0) {
    console.warn('🖥️ PC端导师列表为空，显示加载页面')
    return (
      <div className={`flex flex-col h-full items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载导师信息...</p>
          <p className="mt-2 text-xs text-gray-400">Debug: selectedMentors.length = {selectedMentors.length}</p>
        </div>
      </div>
    );
  }

  // 动态布局导师头像 - 优化布局
  const renderMentorAvatars = () => {
    const mentorCount = selectedMentors.length;
    const centerX = 100; // 新的中心X坐标
    const centerY = 70;  // 新的中心Y坐标
    
    if (mentorCount === 1) {
      // 单个导师：偏离中心显示
      return (
        <div className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: centerX + 60, top: centerY }}>
          <AgentAvatar
            agent={agentInfo[selectedMentors[0].id]}
            size="md"
            showName={true}
            className="bg-white rounded-full p-1 shadow-lg"
          />
        </div>
      );
    } else if (mentorCount === 2) {
      // 两个导师：左右对称
      return selectedMentors.map((mentor, index) => {
        const x = centerX + (index === 0 ? -60 : 60);
        return (
          <div
            key={mentor.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: x, top: centerY }}
          >
            <AgentAvatar
              agent={agentInfo[mentor.id]}
              size="md"
              showName={true}
              className="bg-white rounded-full p-1 shadow-lg"
            />
          </div>
        );
      });
    } else {
      // 多个导师：圆形布局
      const radius = 70;
      
      return selectedMentors.map((mentor, index) => {
        const angle = (index * 2 * Math.PI) / mentorCount - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        return (
          <div
            key={mentor.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: x, top: y }}
          >
            <AgentAvatar
              agent={agentInfo[mentor.id]}
              size="sm"
              showName={true}
              className="bg-white rounded-full p-1 shadow-lg"
            />
          </div>
        );
      });
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 动态圆桌布局头部 */}
      <div className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200">
        {/* 会议标题 */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          圆桌会议 ({selectedMentors.length + 1}人)
        </h2>
        
        <div className="relative" style={{ width: '200px', height: '140px' }}>
          {/* 用户头像 - 中央 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <AgentAvatar
              agent={agentInfo.user}
              size="lg"
              showName={true}
              className="bg-white rounded-full p-1 shadow-xl"
            />
          </div>
          
          {/* 动态导师头像 */}
          {renderMentorAvatars()}
          
          {/* 连接线 - 从用户到每位导师 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {selectedMentors.map((mentor, index) => {
              const mentorCount = selectedMentors.length;
              const centerX = 100;
              const centerY = 70;
              let x, y;
              
              if (mentorCount === 1) {
                x = centerX + 60;
                y = centerY;
              } else if (mentorCount === 2) {
                x = centerX + (index === 0 ? -60 : 60);
                y = centerY;
              } else {
                const radius = 70;
                const angle = (index * 2 * Math.PI) / mentorCount - Math.PI / 2;
                x = centerX + radius * Math.cos(angle);
                y = centerY + radius * Math.sin(angle);
              }
              
              return (
                <line
                  key={mentor.id}
                  x1={centerX} y1={centerY}  // 用户位置（中央）
                  x2={x} y2={y}   // 导师位置
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity="0.4"
                />
              );
            })}
          </svg>
        </div>
        
        {/* 导师风格标签 */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {selectedMentors.map((mentor) => (
            <span 
              key={mentor.id} 
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm"
              style={{ backgroundColor: mentor.color }}
            >
              {mentor.name} · {mentor.investmentStyle}
            </span>
          ))}
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

      {/* 结束对话按钮 */}
      {messages.length > 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleEndConversation}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
            >
              <FileText className="w-5 h-5" />
              <span>生成会议纪要</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-300"
            >
              <LogOut className="w-5 h-5" />
              <span>返回首页</span>
            </button>
          </div>
        </div>
      )}

      {/* 会议总结生成器 */}
      {showSummaryGenerator && (
        <MeetingSummaryGenerator
          sessionId={sessionId}
          topic={topic}
          onSummaryGenerated={handleSummaryGenerated}
          onClose={() => setShowSummaryGenerator(false)}
        />
      )}

      {/* 会议总结显示 */}
      {showSummary && summaryData && (
        <MeetingSummary
          summaryData={summaryData}
          onClose={() => setShowSummary(false)}
          onDownload={handleExportSummary}
        />
      )}
    </div>
  );
};

export default MultiAgentChatContainer; 