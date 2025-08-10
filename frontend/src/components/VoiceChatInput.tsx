import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useQwenSpeechRecognition } from '../hooks/useQwenSpeechRecognition';
import VoiceStateIndicator from './VoiceStateIndicator';

interface VoiceChatInputProps {
  onSendMessage: (message: string) => void;
}

const VoiceChatInput: React.FC<VoiceChatInputProps> = ({ onSendMessage }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { state } = useChat();

  // 使用Qwen语音识别
  const {
    isListening,
    isConnecting,
    error,
    voiceState,
    startListening,
    stopListening,
    resetTranscript
  } = useQwenSpeechRecognition({
    onResult: (text, isFinal) => {
      console.log('🎤 VoiceChatInput 收到ASR结果:', { text, isFinal });
      
      if (isFinal && text && text.trim()) {
        console.log('🎤 VoiceChatInput Qwen ASR最终结果:', text);
        // 最终结果，自动发送给大模型
        onSendMessage(text.trim());
        setTranscript('');
      } else if (text && text.trim()) {
        // 部分结果，更新显示
        console.log('🎤 VoiceChatInput Qwen ASR部分结果:', text);
        setTranscript(text);
      }
    },
    onError: (error) => {
      console.error('❌ VoiceChatInput Qwen ASR错误:', error);
    }
  });

  // 开始语音识别
  const handleStartListening = async () => {
    try {
      console.log('🎤 开始Qwen语音识别...');
      resetTranscript();
      startListening();
      console.log('✅ Qwen语音识别已启动');
    } catch (error) {
      console.error('❌ 启动Qwen语音识别失败:', error);
    }
  };

  // 停止语音识别
  const handleStopListening = () => {
    console.log('🛑 停止Qwen语音识别...');
    stopListening();
    console.log('✅ Qwen语音识别已停止');
  };

  // 静音/取消静音
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  // 处理文本输入
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (transcript.trim()) {
      onSendMessage(transcript.trim());
      setTranscript('');
    }
  }, [transcript, onSendMessage]);



  return (
    <div className="relative">
      <div className="flex items-center space-x-2 p-4 bg-white/80 backdrop-blur-sm rounded-lg border">

        {/* 语音按钮 */}
        <button
          onClick={isListening ? handleStopListening : handleStartListening}
          disabled={state.isTyping || isConnecting}
          className={`p-3 rounded-full transition-all duration-200 ${
            isListening 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* 静音按钮 */}
        <button
          onClick={toggleMute}
          className={`p-2 rounded-full transition-all duration-200 ${
            isMuted 
              ? 'bg-gray-500 text-white hover:bg-gray-600' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* 文本输入 */}
        <form onSubmit={handleTextSubmit} className="flex-1">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="输入消息或按住麦克风说话..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={state.isTyping}
          />
        </form>

        {/* 发送按钮 */}
        <button
          onClick={() => handleTextSubmit({ preventDefault: () => {} } as any)}
          disabled={!transcript.trim() || state.isTyping}
          className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* 状态指示器 */}
      <div className="mt-2 text-xs text-gray-500">
        {isListening && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>正在录音...</span>

          </div>
        )}
        {isConnecting && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>连接中...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-600">错误: {error}</span>
          </div>
        )}
        {state.isTyping && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>导师正在回复...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChatInput; 