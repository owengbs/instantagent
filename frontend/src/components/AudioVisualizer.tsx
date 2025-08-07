import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AudioVisualizerProps {
  isActive: boolean
  type?: 'recording' | 'speaking'
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  type = 'recording',
  size = 'medium',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // 尺寸配置
  const sizeConfig = {
    small: { width: 60, height: 30, barCount: 8 },
    medium: { width: 120, height: 60, barCount: 16 },
    large: { width: 200, height: 100, barCount: 32 }
  }

  const { width, height, barCount } = sizeConfig[size]

  // 初始化音频上下文
  useEffect(() => {
    if (!isActive || type !== 'recording') {
      return
    }

    const initAudio = async () => {
      try {
        // 获取麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        
        mediaStreamRef.current = stream

        // 创建音频上下文
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContextRef.current.createMediaStreamSource(stream)
        
        // 创建分析器
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        analyserRef.current.smoothingTimeConstant = 0.8
        
        source.connect(analyserRef.current)
        
        // 创建数据数组
        const bufferLength = analyserRef.current.frequencyBinCount
        dataArrayRef.current = new Uint8Array(bufferLength)
        
        // 开始动画
        draw()
      } catch (err) {
        console.error('无法访问麦克风:', err)
      }
    }

    initAudio()

    return () => {
      // 清理资源
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [isActive, type])

  // 绘制音频可视化
  const draw = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 获取音频数据
    analyserRef.current.getByteFrequencyData(dataArrayRef.current)

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 设置样式
    const gradient = ctx.createLinearGradient(0, height, 0, 0)
    if (type === 'recording') {
      gradient.addColorStop(0, '#3b82f6')
      gradient.addColorStop(0.5, '#6366f1')
      gradient.addColorStop(1, '#8b5cf6')
    } else {
      gradient.addColorStop(0, '#10b981')
      gradient.addColorStop(0.5, '#06d6a0')
      gradient.addColorStop(1, '#59e0bd')
    }

    ctx.fillStyle = gradient

    // 计算条形参数
    const barWidth = width / barCount
    const maxBarHeight = height * 0.8

    // 绘制音频条
    for (let i = 0; i < barCount; i++) {
      // 从频率数据中取样
      const dataIndex = Math.floor((i / barCount) * dataArrayRef.current.length)
      const amplitude = dataArrayRef.current[dataIndex] / 255

      // 计算条形高度（添加一些随机性使其更生动）
      const barHeight = Math.max(
        amplitude * maxBarHeight + Math.random() * 5,
        2
      )

      // 计算位置
      const x = i * barWidth + barWidth * 0.1
      const y = height - barHeight
      const actualBarWidth = barWidth * 0.8

      // 绘制圆角矩形
      ctx.beginPath()
      ctx.roundRect(x, y, actualBarWidth, barHeight, actualBarWidth / 4)
      ctx.fill()
    }

    // 继续动画
    if (isActive) {
      animationRef.current = requestAnimationFrame(draw)
    }
  }

  // 简单的动画效果（当没有实际音频数据时）
  const renderSimpleAnimation = () => {
    const bars = Array.from({ length: barCount }, (_, i) => (
      <motion.div
        key={i}
        className={`rounded-full ${type === 'recording' ? 'bg-blue-500' : 'bg-green-500'}`}
        style={{
          width: `${100 / barCount * 0.6}%`,
          minHeight: '20%'
        }}
        animate={{
          height: isActive ? [
            '20%',
            `${30 + Math.random() * 50}%`,
            '20%',
            `${40 + Math.random() * 40}%`,
            '20%'
          ] : '20%'
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: i * 0.1,
          ease: "easeInOut"
        }}
      />
    ))

    return (
      <div 
        className={`flex items-end justify-center space-x-1 ${className}`}
        style={{ width, height }}
      >
        {bars}
      </div>
    )
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className={`relative ${className}`}
        >
          {type === 'recording' && typeof navigator !== 'undefined' && navigator.mediaDevices ? (
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="rounded-lg"
              style={{ width, height }}
            />
          ) : (
            renderSimpleAnimation()
          )}
          
          {/* 状态指示器 */}
          <div className="absolute -top-2 -right-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className={`w-3 h-3 rounded-full ${
                type === 'recording' ? 'bg-red-500' : 'bg-green-500'
              }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AudioVisualizer 