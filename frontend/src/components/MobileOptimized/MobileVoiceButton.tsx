import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface MobileVoiceButtonProps {
  isRecording: boolean;
  isPlaying: boolean;
  onToggleRecording: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  disabled?: boolean;
  recordingLevel?: number; // 0-1 音量级别
}

const MobileVoiceButton: React.FC<MobileVoiceButtonProps> = ({
  isRecording,
  isPlaying,
  onToggleRecording,
  onToggleMute,
  isMuted,
  disabled = false,
  recordingLevel = 0
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // 触摸波纹效果
  const createRipple = (event: React.TouchEvent | React.MouseEvent) => {
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const x = (event as any).clientX - rect.left;
    const y = (event as any).clientY - rect.top;
    
    const newRipple = {
      id: Date.now(),
      x,
      y
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // 500ms后移除波纹
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 500);
  };

  // 录音音量脉冲效果
  const pulseIntensity = isRecording ? Math.max(0.3, recordingLevel) : 0;

  return (
    <div className="mobile-voice-controls flex flex-col items-center space-y-4">
      {/* 主录音按钮 */}
      <div className="relative">
        <button
          className={`
            relative overflow-hidden
            w-20 h-20 rounded-full
            flex items-center justify-center
            transition-all duration-200 ease-out
            shadow-lg active:shadow-xl
            ${isRecording 
              ? 'bg-red-500 active:bg-red-600' 
              : 'bg-blue-500 active:bg-blue-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isPressed ? 'scale-95' : 'scale-100'}
          `}
          onTouchStart={(e) => {
            if (!disabled) {
              setIsPressed(true);
              createRipple(e);
            }
          }}
          onTouchEnd={() => setIsPressed(false)}
          onTouchCancel={() => setIsPressed(false)}
          onMouseDown={(e) => {
            if (!disabled) {
              setIsPressed(true);
              createRipple(e);
            }
          }}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onClick={onToggleRecording}
          disabled={disabled}
          style={{
            boxShadow: isRecording 
              ? `0 0 ${20 + pulseIntensity * 30}px rgba(239, 68, 68, 0.6)`
              : '0 8px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* 波纹效果 */}
          {ripples.map(ripple => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white opacity-30 animate-ping"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
              }}
            />
          ))}
          
          {/* 图标 */}
          {isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
          
          {/* 录音脉冲环 */}
          {isRecording && (
            <>
              <div 
                className="absolute inset-0 rounded-full border-2 border-white opacity-60 animate-pulse"
                style={{
                  transform: `scale(${1 + pulseIntensity * 0.2})`,
                }}
              />
              <div 
                className="absolute inset-0 rounded-full border border-white opacity-30"
                style={{
                  transform: `scale(${1.2 + pulseIntensity * 0.3})`,
                  animation: 'pulse 1s infinite',
                }}
              />
            </>
          )}
        </button>
        
        {/* 播放状态指示器 */}
        {isPlaying && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-content border-2 border-white">
            <Volume2 className="w-3 h-3 text-white mx-auto" />
          </div>
        )}
      </div>
      
      {/* 状态文字 */}
      <div className="text-center">
        <p className={`text-sm font-medium ${
          isRecording ? 'text-red-600' : 'text-gray-600'
        }`}>
          {isRecording ? '正在录音...' : '点击开始录音'}
        </p>
        {isRecording && recordingLevel > 0 && (
          <div className="mt-2 flex justify-center">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-100"
                style={{ width: `${recordingLevel * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* 辅助控制按钮 */}
      <div className="flex space-x-4">
        {/* 静音切换 */}
        <button
          className={`
            w-12 h-12 rounded-full
            flex items-center justify-center
            transition-all duration-200
            ${isMuted 
              ? 'bg-gray-500 active:bg-gray-600' 
              : 'bg-gray-300 active:bg-gray-400'
            }
            shadow-md active:shadow-lg
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={onToggleMute}
          disabled={disabled}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>
      
      {/* 使用提示 */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        {isRecording 
          ? '松开手指停止录音' 
          : '长按录音，轻点开始/停止'
        }
      </div>
    </div>
  );
};

export default MobileVoiceButton;
