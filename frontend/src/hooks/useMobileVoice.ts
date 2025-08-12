import { useState, useEffect, useRef, useCallback } from 'react';
import { deviceInfo, MobileUtils } from '../utils/mobileDetection';

interface MobileVoiceConfig {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  volume?: number;
}

interface MobileVoiceState {
  isRecording: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  recordingLevel: number;
  error: string | null;
  isInitialized: boolean;
  audioContext: AudioContext | null;
  mediaStream: MediaStream | null;
}

interface MobileVoiceHook extends MobileVoiceState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleRecording: () => void;
  toggleMute: () => void;
  playAudio: (audioData: ArrayBuffer | Blob) => Promise<void>;
  cleanup: () => void;
  requestPermissions: () => Promise<boolean>;
  getAudioLevel: () => number;
}

/**
 * 移动端优化的语音处理Hook
 * 专门针对移动端浏览器的音频处理限制进行优化
 */
export function useMobileVoice(config: MobileVoiceConfig = {}): MobileVoiceHook {
  const {
    sampleRate = 16000,
    channelCount = 1,
    echoCancellation = true,
    noiseSuppression = true,
    autoGainControl = true,
    volume = 1.0
  } = config;

  const [state, setState] = useState<MobileVoiceState>({
    isRecording: false,
    isPlaying: false,
    isMuted: false,
    recordingLevel: 0,
    error: null,
    isInitialized: false,
    audioContext: null,
    mediaStream: null
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioBufferRef = useRef<Float32Array>(new Float32Array(256));

  /**
   * 初始化音频上下文（移动端优化）
   */
  const initializeAudioContext = useCallback(async () => {
    try {
      // 移动端需要用户交互后才能创建AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: deviceInfo.isMobile ? 44100 : sampleRate, // 移动端使用设备默认采样率
          latencyHint: 'interactive'
        });
      }

      // iOS需要恢复AudioContext
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      setState(prev => ({
        ...prev,
        audioContext: audioContextRef.current,
        isInitialized: true,
        error: null
      }));

      return true;
    } catch (error) {
      console.error('音频上下文初始化失败:', error);
      setState(prev => ({
        ...prev,
        error: `音频初始化失败: ${error instanceof Error ? error.message : '未知错误'}`,
        isInitialized: false
      }));
      return false;
    }
  }, [sampleRate]);

  /**
   * 请求音频权限（移动端优化）
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // 首先初始化音频上下文
      const audioInitialized = await initializeAudioContext();
      if (!audioInitialized) return false;

      // 移动端优化的媒体约束
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: deviceInfo.isMobile ? undefined : sampleRate, // 移动端让浏览器选择最佳采样率
          channelCount,
          echoCancellation,
          noiseSuppression,
          autoGainControl,
          // 移动端专用优化
          ...(deviceInfo.isMobile && {
            latency: 0.02, // 20ms延迟
            volume: 1.0,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
            googAudioMirroring: false
          })
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // 创建音频分析节点
      if (audioContextRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        const gainNode = audioContextRef.current.createGain();

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        gainNode.gain.value = volume;

        source.connect(analyser);
        analyser.connect(gainNode);

        analyserRef.current = analyser;
        gainNodeRef.current = gainNode;

        // 移动端震动反馈
        if (deviceInfo.isMobile) {
          MobileUtils.vibrate([50, 100, 50]);
        }
      }

      setState(prev => ({
        ...prev,
        mediaStream: stream,
        error: null
      }));

      return true;
    } catch (error) {
      console.error('权限请求失败:', error);
      let errorMessage = '麦克风权限被拒绝';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '请允许访问麦克风权限';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '未找到可用的麦克风设备';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = '浏览器不支持音频录制';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        error: errorMessage
      }));

      return false;
    }
  }, [initializeAudioContext, sampleRate, channelCount, echoCancellation, noiseSuppression, autoGainControl, volume]);

  /**
   * 获取当前音频级别
   */
  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current) return 0;

    analyserRef.current.getFloatTimeDomainData(audioBufferRef.current);
    
    let sum = 0;
    for (let i = 0; i < audioBufferRef.current.length; i++) {
      sum += audioBufferRef.current[i] * audioBufferRef.current[i];
    }
    
    const rms = Math.sqrt(sum / audioBufferRef.current.length);
    return Math.min(1, rms * 10); // 放大并限制在0-1范围
  }, []);

  /**
   * 监控音频级别
   */
  const monitorAudioLevel = useCallback(() => {
    if (!state.isRecording) return;

    const level = getAudioLevel();
    setState(prev => ({ ...prev, recordingLevel: level }));

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  }, [state.isRecording, getAudioLevel]);

  /**
   * 开始录音
   */
  const startRecording = useCallback(async () => {
    try {
      if (!mediaStreamRef.current) {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;
      }

      if (!mediaStreamRef.current) {
        throw new Error('媒体流未就绪');
      }

      // 创建MediaRecorder（移动端优化）
      const mimeType = deviceInfo.isIOS 
        ? 'audio/mp4;codecs=mp4a.40.2' // iOS优化
        : deviceInfo.isAndroid 
          ? 'audio/webm;codecs=opus' // Android优化
          : 'audio/webm;codecs=opus'; // 默认

      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        audioBitsPerSecond: deviceInfo.isMobile ? 64000 : 128000 // 移动端降低比特率
      });

      mediaRecorderRef.current.start();

      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null
      }));

      // 开始监控音频级别
      monitorAudioLevel();

      // 移动端反馈
      if (deviceInfo.isMobile) {
        MobileUtils.vibrate(100);
      }

    } catch (error) {
      console.error('开始录音失败:', error);
      setState(prev => ({
        ...prev,
        error: `录音失败: ${error instanceof Error ? error.message : '未知错误'}`
      }));
    }
  }, [requestPermissions, monitorAudioLevel]);

  /**
   * 停止录音
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      recordingLevel: 0
    }));

    // 移动端反馈
    if (deviceInfo.isMobile) {
      MobileUtils.vibrate([50, 50]);
    }
  }, [state.isRecording]);

  /**
   * 切换录音状态
   */
  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  /**
   * 切换静音状态
   */
  const toggleMute = useCallback(() => {
    if (gainNodeRef.current) {
      const newMuteState = !state.isMuted;
      gainNodeRef.current.gain.value = newMuteState ? 0 : volume;
      
      setState(prev => ({
        ...prev,
        isMuted: newMuteState
      }));

      // 移动端反馈
      if (deviceInfo.isMobile) {
        MobileUtils.vibrate(50);
      }
    }
  }, [state.isMuted, volume]);

  /**
   * 播放音频（移动端优化）
   */
  const playAudio = useCallback(async (audioData: ArrayBuffer | Blob): Promise<void> => {
    try {
      if (!audioContextRef.current) {
        await initializeAudioContext();
      }

      if (!audioContextRef.current) {
        throw new Error('音频上下文未就绪');
      }

      setState(prev => ({ ...prev, isPlaying: true }));

      let buffer: ArrayBuffer;
      if (audioData instanceof Blob) {
        buffer = await audioData.arrayBuffer();
      } else {
        buffer = audioData;
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(buffer);
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = state.isMuted ? 0 : volume;

      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      source.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      };

      source.start();

    } catch (error) {
      console.error('播放音频失败:', error);
      setState(prev => ({
        ...prev,
        isPlaying: false,
        error: `播放失败: ${error instanceof Error ? error.message : '未知错误'}`
      }));
    }
  }, [initializeAudioContext, state.isMuted, volume]);

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    // 停止录音
    if (state.isRecording) {
      stopRecording();
    }

    // 取消动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // 关闭媒体流
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // 关闭音频上下文
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // 清理引用
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    gainNodeRef.current = null;

    setState({
      isRecording: false,
      isPlaying: false,
      isMuted: false,
      recordingLevel: 0,
      error: null,
      isInitialized: false,
      audioContext: null,
      mediaStream: null
    });
  }, [state.isRecording, stopRecording]);

  // 处理页面可见性变化（移动端优化）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state.isRecording) {
        // 页面切到后台时停止录音
        stopRecording();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isRecording, stopRecording]);

  // 处理设备方向变化（移动端）
  useEffect(() => {
    if (!deviceInfo.isMobile) return;

    const handleOrientationChange = () => {
      // 方向变化时重新初始化音频上下文
      setTimeout(() => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }, 500);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
    toggleMute,
    playAudio,
    cleanup,
    requestPermissions,
    getAudioLevel
  };
}
