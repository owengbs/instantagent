import React from 'react';
import MultiAgentChatContainer from './MultiAgentChatContainer';

const ThreePersonChatTest: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold">三人圆桌对话测试</h1>
      </div>
      
      <div className="flex-1">
        <MultiAgentChatContainer />
      </div>
    </div>
  );
};

export default ThreePersonChatTest;