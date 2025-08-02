import React from 'react';
import { User, Bot, UserCircle, Brain } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  color: string;
}

interface AgentAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showName?: boolean;
  showDescription?: boolean;
}

const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  size = 'md',
  className = '',
  showName = false,
  showDescription = false
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base'
  };

  const nameSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // 默认头像内容（如果没有图片）
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').slice(0, 2);
  };

  const getAvatarContent = () => {
    if (agent.id === 'user') {
      return <User className="w-full h-full text-blue-500" />;
    }
    if (agent.id === 'buffett') {
      return <UserCircle className="w-full h-full text-blue-400" />;
    }
    if (agent.id === 'soros') {
      return <Bot className="w-full h-full text-green-400" />;
    }
    if (agent.id === 'munger') {
      return <Brain className="w-full h-full text-purple-400" />;
    }
    // 默认
    return <User className="w-full h-full text-gray-400" />;
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-md`}>
        {getAvatarContent()}
      </div>
      
      {showName && (
        <div className="mt-1 text-center">
          <div className={`font-medium text-gray-800 ${nameSizeClasses[size]}`}>
            {agent.name}
          </div>
          {showDescription && (
            <div className="text-xs text-gray-500 mt-1">
              {agent.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentAvatar; 