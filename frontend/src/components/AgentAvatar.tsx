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



  const getAvatarContent = () => {
    // 如果有头像URL，优先使用图片
    if (agent.avatar && agent.avatar !== '/avatars/user.png') {
      return (
        <img
          src={agent.avatar}
          alt={agent.name}
          className="w-full h-full object-cover"
        />
      );
    }
    
    // 用户头像
    if (agent.id === 'user') {
      return <User className="w-4/5 h-4/5 text-blue-500" />;
    }
    
    // 默认导师图标
    return <Brain className="w-4/5 h-4/5" style={{ color: agent.color }} />;
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-lg border-2 border-white bg-gradient-to-br from-white to-gray-50`}
        style={{ borderColor: agent.color }}
      >
        <div className="w-full h-full flex items-center justify-center">
          {getAvatarContent()}
        </div>
      </div>
      
      {showName && (
        <div className="mt-2 text-center">
          <div className={`font-semibold text-gray-800 ${nameSizeClasses[size]}`}>
            {agent.name}
          </div>
          {showDescription && (
            <div className="text-xs text-gray-500 mt-1 max-w-16 truncate">
              {agent.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentAvatar; 