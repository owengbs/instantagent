/**
 * 语音状态指示器组件
 * 显示智能语音管理系统的当前状态
 */
import React from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Brain, Zap } from 'lucide-react'
import { SmartVoiceState } from '../hooks/useSmartVoiceManager'

interface VoiceStateIndicatorProps {
  voiceState: SmartVoiceState
  className?: string
  showDetails?: boolean
}

const VoiceStateIndicator: React.FC<VoiceStateIndicatorProps> = ({
  voiceState,
  className = '',
  showDetails = false
}) => {
  // 根据状态获取图标和颜色
  const getMicrophoneIcon = () => {
    switch (voiceState.microphoneState) {
      case 'active':
        return <Mic className="w-5 h-5" />
      case 'reduced':
        return <Mic className="w-5 h-5 opacity-60" />
      case 'muted':
        return <MicOff className="w-5 h-5" />
      default:
        return <Mic className="w-5 h-5" />
    }
  }

  const getMicrophoneColor = () => {
    switch (voiceState.microphoneState) {
      case 'active':
        return voiceState.isUserSpeaking ? 'text-green-500' : 'text-blue-500'
      case 'reduced':
        return 'text-yellow-500'
      case 'muted':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusText = () => {
    if (voiceState.isTTSPlaying) {
      return voiceState.canInterrupt ? '智能播放中（可打断）' : '播放中'
    }
    
    switch (voiceState.microphoneState) {
      case 'active':
        return voiceState.isUserSpeaking ? '检测到语音' : '语音待机'
      case 'reduced':
        return '灵敏度降低'
      case 'muted':
        return '麦克风静音'
      default:
        return '语音系统'
    }
  }

  const getStatusColor = () => {
    if (voiceState.isTTSPlaying) {
      return 'text-purple-600'
    }
    return getMicrophoneColor()
  }

  // 音频能量可视化
  const renderAudioLevelBar = () => {
    const level = Math.min(voiceState.audioEnergy * 100, 100)
    
    return (
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500">音量:</span>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              level > 50 ? 'bg-green-500' : level > 20 ? 'bg-yellow-500' : 'bg-gray-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${level}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        <span className="text-xs text-gray-500 w-8">{level.toFixed(0)}%</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {/* 主状态指示器 */}
      <div className="flex items-center space-x-2">
        {/* 麦克风状态 */}
        <motion.div
          className={`p-2 rounded-full ${getMicrophoneColor()} bg-gray-50`}
          animate={{
            scale: voiceState.isUserSpeaking ? 1.1 : 1,
            backgroundColor: voiceState.isUserSpeaking ? '#f0fdf4' : '#f9fafb'
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {getMicrophoneIcon()}
        </motion.div>

        {/* TTS播放指示器 */}
        {voiceState.isTTSPlaying && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="p-1 rounded-full text-purple-500 bg-purple-50"
          >
            <Volume2 className="w-4 h-4" />
          </motion.div>
        )}

        {/* 智能检测指示器 */}
        {voiceState.voiceActivity && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="p-1 rounded-full text-blue-500 bg-blue-50"
          >
            <Brain className="w-4 h-4" />
          </motion.div>
        )}

        {/* 打断能力指示器 */}
        {voiceState.isTTSPlaying && voiceState.canInterrupt && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="p-1 rounded-full text-orange-500 bg-orange-50"
          >
            <Zap className="w-3 h-3" />
          </motion.div>
        )}
      </div>

      {/* 状态文字 */}
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        
        {showDetails && (
          <div className="text-xs text-gray-500 mt-1">
            {voiceState.microphoneState === 'reduced' && 'AI正在播放，智能降噪中'}
            {voiceState.microphoneState === 'muted' && '完全静音模式'}
            {voiceState.isUserSpeaking && !voiceState.isTTSPlaying && '正在监听您的发言'}
          </div>
        )}
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="flex flex-col space-y-2 ml-auto">
          {/* 音频能量条 */}
          {renderAudioLevelBar()}
          
          {/* 技术指标 */}
          <div className="flex space-x-3 text-xs text-gray-500">
            <span>VAD: {voiceState.voiceActivity ? '✓' : '✗'}</span>
            <span>打断: {voiceState.canInterrupt ? '✓' : '✗'}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default VoiceStateIndicator
