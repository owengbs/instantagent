import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useMentors } from '../hooks/useMentors';

const DebugMentorTest: React.FC = () => {
  const { state } = useChat();
  const { messages, isTyping } = state;
  const { getEnabledMentors } = useMentors();
  const [selectedMentors, setSelectedMentors] = useState<any[]>([]);

  useEffect(() => {
    // 从localStorage加载选中的导师
    const savedMentors = localStorage.getItem('selectedMentors');
    if (savedMentors) {
      try {
        const mentors = JSON.parse(savedMentors);
        setSelectedMentors(mentors);
        console.log('🎯 加载的选中导师:', mentors);
      } catch (error) {
        console.error('❌ 解析选中导师失败:', error);
      }
    }
  }, []);

  // 过滤多智能体消息
  const multiAgentMessages = messages.filter(msg => {
    if (msg.type === 'user' || msg.type === 'multi_agent_response') {
      return true;
    }
    if (msg.agent_id && selectedMentors.some(mentor => mentor.id === msg.agent_id)) {
      return true;
    }
    if (selectedMentors.some(mentor => mentor.id === msg.type)) {
      return true;
    }
    return false;
  });

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">导师选择调试页面</h1>
      
      {/* 选中导师信息 */}
      <div className="bg-white p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">选中的导师</h2>
        {selectedMentors.length > 0 ? (
          <div className="space-y-2">
            {selectedMentors.map((mentor, index) => (
              <div key={mentor.id} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: mentor.color }}
                ></div>
                <span>{mentor.name} ({mentor.id})</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">未选择导师</p>
        )}
      </div>

      {/* 消息统计 */}
      <div className="bg-white p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">消息统计</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">总消息数</p>
            <p className="text-xl font-bold">{messages.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">过滤后消息数</p>
            <p className="text-xl font-bold">{multiAgentMessages.length}</p>
          </div>
        </div>
      </div>

      {/* 消息类型分布 */}
      <div className="bg-white p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">消息类型分布</h2>
        <div className="space-y-2">
          {Object.entries(messages.reduce((acc, msg) => {
            acc[msg.type] = (acc[msg.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)).map(([type, count]) => (
            <div key={type} className="flex justify-between">
              <span className="font-mono text-sm">{type}</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 最近消息 */}
      <div className="bg-white p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">最近消息 (最多10条)</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.slice(-10).map((msg, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm text-gray-600">类型: {msg.type}</p>
                  {msg.agent_id && <p className="font-mono text-sm text-gray-600">智能体: {msg.agent_id}</p>}
                  {msg.order && <p className="font-mono text-sm text-gray-600">顺序: {msg.order}</p>}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm mt-1">{msg.content?.slice(0, 100)}...</p>
            </div>
          ))}
        </div>
      </div>

      {/* 过滤后的消息 */}
      <div className="bg-white p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">过滤后的消息</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {multiAgentMessages.slice(-10).map((msg, index) => (
            <div key={index} className="border-l-4 border-green-500 pl-3 py-2 bg-green-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm text-gray-600">类型: {msg.type}</p>
                  {msg.agent_id && <p className="font-mono text-sm text-gray-600">智能体: {msg.agent_id}</p>}
                  {msg.order && <p className="font-mono text-sm text-gray-600">顺序: {msg.order}</p>}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm mt-1">{msg.content?.slice(0, 100)}...</p>
            </div>
          ))}
        </div>
      </div>

      {/* 调试信息 */}
      <div className="bg-white p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">调试信息</h2>
        <div className="space-y-2 text-sm">
          <p>正在输入: {isTyping ? '是' : '否'}</p>
          <p>选中导师数量: {selectedMentors.length}</p>
          <p>可用导师: {getEnabledMentors().map(m => m.name).join(', ')}</p>
        </div>
      </div>
    </div>
  );
};

export default DebugMentorTest;
