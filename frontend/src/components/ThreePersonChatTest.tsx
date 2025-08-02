import React, { useState } from 'react';
import MultiAgentChatContainer from './MultiAgentChatContainer';

interface TestMessage {
  id: string;
  type: 'user' | 'buffett' | 'soros' | 'munger' | 'multi_agent_response';
  content: string;
  timestamp: string;
  agent_id?: string;
  agent_name?: string;
  order?: number;
  isMultiAgent?: boolean;
  agent?: {
    id: string;
    name: string;
    description: string;
    color: string;
  };
}

const ThreePersonChatTest: React.FC = () => {
  const [messages, setMessages] = useState<TestMessage[]>([
    {
      id: '1',
      type: 'user',
      content: '如何运用多元思维模型避免投资错误？',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'multi_agent_response',
      content: '这是一个关于多元思维的绝佳问题。从我的角度来看，避免投资错误最重要的是运用跨学科的思维模型。首先要识别认知偏差，比如确认偏误和过度自信。然后用数学模型验证假设，用心理学理解市场情绪。',
      timestamp: new Date().toISOString(),
      agent_id: 'munger',
      agent_name: '查理·芒格',
      order: 1,
      isMultiAgent: true,
      agent: {
        id: 'munger',
        name: '查理·芒格',
        description: '多元思维专家',
        color: '#8B5CF6'
      }
    },
    {
      id: '3',
      type: 'multi_agent_response', 
      content: '芒格说得很对。我想补充的是，在具体的价值投资实践中，我们要关注企业的长期竞争力。好的投资决策需要耐心等待合适的价格，避免被短期市场情绪影响。关键是要在能力圈内行动。',
      timestamp: new Date().toISOString(),
      agent_id: 'buffett',
      agent_name: '沃伦·巴菲特',
      order: 2,
      isMultiAgent: true,
      agent: {
        id: 'buffett',
        name: '沃伦·巴菲特',
        description: '价值投资大师',
        color: '#3B82F6'
      }
    },
    {
      id: '4',
      type: 'multi_agent_response',
      content: '从宏观的角度，我认为投资错误往往源于对市场时机的误判。要善于观察市场情绪的变化，在恐慌时贪婪，在贪婪时恐慌。同时要注意地缘政治和货币政策的影响，这些都会改变投资环境。',
      timestamp: new Date().toISOString(),
      agent_id: 'soros',
      agent_name: '乔治·索罗斯',
      order: 3,
      isMultiAgent: true,
      agent: {
        id: 'soros',
        name: '乔治·索罗斯',
        description: '宏观投资大师',
        color: '#10B981'
      }
    }
  ]);

  const mockChatState = {
    messages: messages,
    isTyping: false,
    sessionId: 'test-session',
    isConnected: true,
    error: null,
    chatHistory: []
  };

  const addTestMessage = () => {
    const newMessage: TestMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: '谢谢各位大师的分享！能再详细说说具体的实践方法吗？',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold">三人圆桌对话测试</h1>
        <button 
          onClick={addTestMessage}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          添加测试消息
        </button>
      </div>
      
      <div className="flex-1">
        <MultiAgentChatContainer />
      </div>
    </div>
  );
};

export default ThreePersonChatTest;