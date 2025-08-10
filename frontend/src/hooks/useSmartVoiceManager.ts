/**
 * 智能语音管理Hook - 混合智能方案
 * 解决TTS播放时误识别用户语音的问题
 */
import { useState, useCallback, useRef, useEffect } from 'react'

export interface VoiceActivityDetector {
  // 音频能量检测
  analyzeAudioEnergy: (audioData: Float32Array) => number
  // 语音活动检测
  detectVoiceActivity: (audioData: Float32Array) => boolean
  // 用户主动发言检测
  detectUserSpeechIntent: (audioData: Float32Array, duration: number) => boolean
}

export interface SmartVoiceState {
  // 麦克风状态
  microphoneState: 'active' | 'reduced' | 'muted'
  // TTS播放状态
  isTTSPlaying: boolean
  // 用户发言检测状态
  isUserSpeaking: boolean
  // 是否允许打断
  canInterrupt: boolean
  // 音频能量级别
  audioEnergy: number
  // 检测到的语音活动
  voiceActivity: boolean
}

export interface SmartVoiceManagerOptions {
  // 自适应静音配置
  reducedSensitivity?: number // 降低的灵敏度比例 (0-1)
  muteThreshold?: number // 完全静音的阈值
  
  // 打断检测配置
  interruptVolumeThreshold?: number // 打断音量阈值
  interruptDurationThreshold?: number // 打断持续时间阈值(ms)
  
  // VAD配置
  voiceEnergyThreshold?: number // 语音能量阈值
  voiceFrequencyRange?: [number, number] // 语音频率范围
  
  // 恢复配置
  recoveryDelay?: number // 播放结束后恢复延迟(ms)
  
  // 回调函数
  onStateChange?: (state: SmartVoiceState) => void
  onUserInterrupt?: () => void
  onTTSStart?: () => void
  onTTSEnd?: () => void
}

export interface SmartVoiceManagerReturn {
  // 状态
  state: SmartVoiceState
  
  // 控制方法
  startTTSPlayback: () => void
  endTTSPlayback: () => void
  processAudioFrame: (audioData: Float32Array) => void
  
  // 麦克风控制
  setMicrophoneState: (state: SmartVoiceState['microphoneState']) => void
  
  // 手动控制
  enableUserInterrupt: () => void
  disableUserInterrupt: () => void
  
  // 重置方法
  reset: () => void
}

class VoiceActivityDetectorImpl implements VoiceActivityDetector {
  private readonly options: Required<SmartVoiceManagerOptions>
  
  constructor(options: Required<SmartVoiceManagerOptions>) {
    this.options = options
  }
  
  analyzeAudioEnergy(audioData: Float32Array): number {
    let sum = 0
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i]
    }
    return Math.sqrt(sum / audioData.length)
  }
  
  detectVoiceActivity(audioData: Float32Array): boolean {
    const energy = this.analyzeAudioEnergy(audioData)
    return energy > this.options.voiceEnergyThreshold
  }
  
  detectUserSpeechIntent(audioData: Float32Array, duration: number): boolean {
    const energy = this.analyzeAudioEnergy(audioData)
    const hasEnoughEnergy = energy > this.options.interruptVolumeThreshold
    const hasEnoughDuration = duration > this.options.interruptDurationThreshold
    
    // 频率分析（简化版）
    const hasVoiceFrequency = this.detectVoiceFrequency(audioData)
    
    return hasEnoughEnergy && hasEnoughDuration && hasVoiceFrequency
  }
  
  private detectVoiceFrequency(audioData: Float32Array): boolean {
    // 简化的频率检测 - 实际应用中可以使用FFT
    // 这里用简单的波形特征检测
    let zeroCrossings = 0
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        zeroCrossings++
      }
    }
    
    // 人声通常在85-255 Hz之间，对应的过零率
    const zeroCrossingRate = zeroCrossings / audioData.length
    return zeroCrossingRate > 0.02 && zeroCrossingRate < 0.3
  }
}

export const useSmartVoiceManager = (options: SmartVoiceManagerOptions = {}): SmartVoiceManagerReturn => {
  // 默认配置
  const config: Required<SmartVoiceManagerOptions> = {
    reducedSensitivity: 0.2, // 播放时保留20%灵敏度
    muteThreshold: 0.05,
    interruptVolumeThreshold: 0.15, // 较高的音量阈值
    interruptDurationThreshold: 800, // 800ms持续时间
    voiceEnergyThreshold: 0.03,
    voiceFrequencyRange: [85, 255],
    recoveryDelay: 500, // 500ms恢复延迟
    onStateChange: () => {},
    onUserInterrupt: () => {},
    onTTSStart: () => {},
    onTTSEnd: () => {},
    ...options
  }
  
  // 初始状态
  const [state, setState] = useState<SmartVoiceState>({
    microphoneState: 'active',
    isTTSPlaying: false,
    isUserSpeaking: false,
    canInterrupt: true,
    audioEnergy: 0,
    voiceActivity: false
  })
  
  // Refs
  const vadRef = useRef<VoiceActivityDetector>(new VoiceActivityDetectorImpl(config))
  const speechStartTimeRef = useRef<number | null>(null)
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioBufferRef = useRef<Float32Array[]>([])
  const frameCountRef = useRef<number>(0)
  
  // 状态更新回调
  useEffect(() => {
    config.onStateChange(state)
  }, [state, config])
  
  // 更新状态的辅助函数
  const updateState = useCallback((updates: Partial<SmartVoiceState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])
  
  // 开始TTS播放
  const startTTSPlayback = useCallback(() => {
    console.log('🔊 智能语音管理: TTS播放开始')
    
    // 清除恢复定时器
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current)
      recoveryTimeoutRef.current = null
    }
    
    updateState({
      isTTSPlaying: true,
      microphoneState: 'reduced', // 降低灵敏度而不是完全静音
      canInterrupt: true
    })
    
    config.onTTSStart()
  }, [updateState, config])
  
  // 结束TTS播放
  const endTTSPlayback = useCallback(() => {
    console.log('🔊 智能语音管理: TTS播放结束')
    
    updateState({
      isTTSPlaying: false,
      isUserSpeaking: false
    })
    
    // 延迟恢复麦克风灵敏度
    recoveryTimeoutRef.current = setTimeout(() => {
      console.log('🎤 智能语音管理: 恢复麦克风灵敏度')
      updateState({
        microphoneState: 'active',
        canInterrupt: true
      })
    }, config.recoveryDelay)
    
    config.onTTSEnd()
  }, [updateState, config])
  
  // 处理音频帧
  const processAudioFrame = useCallback((audioData: Float32Array) => {
    frameCountRef.current++
    
    // 每10帧分析一次（约100ms间隔）
    if (frameCountRef.current % 10 !== 0) {
      return
    }
    
    const vad = vadRef.current
    const energy = vad.analyzeAudioEnergy(audioData)
    const voiceActivity = vad.detectVoiceActivity(audioData)
    
    // 更新音频能量和语音活动
    updateState({
      audioEnergy: energy,
      voiceActivity: voiceActivity
    })
    
    // TTS播放期间的特殊处理
    if (state.isTTSPlaying && state.canInterrupt) {
      // 检测用户打断意图
      if (voiceActivity) {
        if (speechStartTimeRef.current === null) {
          speechStartTimeRef.current = Date.now()
        }
        
        const speechDuration = Date.now() - speechStartTimeRef.current
        const isUserIntent = vad.detectUserSpeechIntent(audioData, speechDuration)
        
        if (isUserIntent) {
          console.log('🗣️ 检测到用户打断意图:', { energy, speechDuration })
          
          updateState({
            isUserSpeaking: true,
            microphoneState: 'active' // 立即恢复完全灵敏度
          })
          
          config.onUserInterrupt()
        }
      } else {
        // 重置语音开始时间
        speechStartTimeRef.current = null
        updateState({
          isUserSpeaking: false
        })
      }
    } else if (!state.isTTSPlaying) {
      // 非播放期间的正常检测
      updateState({
        isUserSpeaking: voiceActivity
      })
      
      if (voiceActivity) {
        speechStartTimeRef.current = Date.now()
      } else {
        speechStartTimeRef.current = null
      }
    }
  }, [state, updateState, config])
  
  // 手动设置麦克风状态
  const setMicrophoneState = useCallback((micState: SmartVoiceState['microphoneState']) => {
    updateState({ microphoneState: micState })
  }, [updateState])
  
  // 启用用户打断
  const enableUserInterrupt = useCallback(() => {
    updateState({ canInterrupt: true })
  }, [updateState])
  
  // 禁用用户打断
  const disableUserInterrupt = useCallback(() => {
    updateState({ canInterrupt: false })
  }, [updateState])
  
  // 重置状态
  const reset = useCallback(() => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current)
      recoveryTimeoutRef.current = null
    }
    
    speechStartTimeRef.current = null
    frameCountRef.current = 0
    audioBufferRef.current = []
    
    setState({
      microphoneState: 'active',
      isTTSPlaying: false,
      isUserSpeaking: false,
      canInterrupt: true,
      audioEnergy: 0,
      voiceActivity: false
    })
  }, [])
  
  // 清理
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current)
      }
    }
  }, [])
  
  return {
    state,
    startTTSPlayback,
    endTTSPlayback,
    processAudioFrame,
    setMicrophoneState,
    enableUserInterrupt,
    disableUserInterrupt,
    reset
  }
}

export default useSmartVoiceManager
