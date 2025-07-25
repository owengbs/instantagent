// 语音功能检测和测试工具

interface VoiceCapabilities {
  speechRecognition: boolean
  speechSynthesis: boolean
  webAudio: boolean
  mediaDevices: boolean
  userAgent: string
  browserInfo: {
    name: string
    version: string
    isSecure: boolean
  }
}

interface VoiceTestResult {
  success: boolean
  error?: string
  details?: any
}

/**
 * 检测浏览器语音功能支持情况
 */
export function detectVoiceCapabilities(): VoiceCapabilities {
  const userAgent = navigator.userAgent
  
  // 检测浏览器信息
  const getBrowserInfo = () => {
    let name = 'Unknown'
    let version = ''
    
    if (userAgent.includes('Chrome')) {
      name = 'Chrome'
      const match = userAgent.match(/Chrome\/(\d+)/)
      version = match ? match[1] : ''
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox' 
      const match = userAgent.match(/Firefox\/(\d+)/)
      version = match ? match[1] : ''
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari'
      const match = userAgent.match(/Version\/(\d+)/)
      version = match ? match[1] : ''
    } else if (userAgent.includes('Edge')) {
      name = 'Edge'
      const match = userAgent.match(/Edge\/(\d+)/)
      version = match ? match[1] : ''
    }
    
    return {
      name,
      version,
      isSecure: location.protocol === 'https:' || location.hostname === 'localhost'
    }
  }

  return {
    speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    speechSynthesis: !!(window.speechSynthesis && window.SpeechSynthesisUtterance),
    webAudio: !!(window.AudioContext || (window as any).webkitAudioContext),
    mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    userAgent,
    browserInfo: getBrowserInfo()
  }
}

/**
 * 测试语音识别功能
 */
export async function testSpeechRecognition(): Promise<VoiceTestResult> {
  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      return {
        success: false,
        error: '浏览器不支持语音识别API'
      }
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        recognition.stop()
        resolve({
          success: false,
          error: '语音识别测试超时'
        })
      }, 5000)

      recognition.onstart = () => {
        clearTimeout(timeout)
        recognition.stop()
        resolve({
          success: true,
          details: {
            lang: recognition.lang,
            continuous: recognition.continuous,
            interimResults: recognition.interimResults
          }
        })
      }

      recognition.onerror = (event: any) => {
        clearTimeout(timeout)
        resolve({
          success: false,
          error: `语音识别错误: ${event.error}`,
          details: event
        })
      }

      try {
        recognition.start()
      } catch (error) {
        clearTimeout(timeout)
        resolve({
          success: false,
          error: `启动语音识别失败: ${error}`,
          details: error
        })
      }
    })
  } catch (error) {
    return {
      success: false,
      error: `语音识别测试异常: ${error}`,
      details: error
    }
  }
}

/**
 * 测试语音合成功能
 */
export async function testSpeechSynthesis(): Promise<VoiceTestResult> {
  try {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      return {
        success: false,
        error: '浏览器不支持语音合成API'
      }
    }

    // 确保语音列表已加载
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      // 等待语音列表加载
      await new Promise((resolve) => {
        window.speechSynthesis.onvoiceschanged = resolve
        setTimeout(resolve, 1000) // 最多等待1秒
      })
    }

    const finalVoices = window.speechSynthesis.getVoices()
    const chineseVoices = finalVoices.filter(voice => 
      voice.lang.startsWith('zh') || voice.name.toLowerCase().includes('chinese')
    )

    // 不实际播放音频，只检测API可用性
    const utterance = new SpeechSynthesisUtterance('')
    utterance.lang = 'zh-CN'
    utterance.volume = 0 // 静音测试
    utterance.rate = 1
    utterance.pitch = 1

    // 选择合适的中文语音
    if (chineseVoices.length > 0) {
      utterance.voice = chineseVoices[0]
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.speechSynthesis.cancel()
        resolve({
          success: true, // 即使超时也认为是成功，因为API可用
          details: {
            totalVoices: finalVoices.length,
            chineseVoices: chineseVoices.length,
            voiceNames: chineseVoices.map(v => v.name),
            selectedVoice: utterance.voice?.name || 'default',
            note: '静音测试完成，API可用'
          }
        })
      }, 2000)

      utterance.onstart = () => {
        clearTimeout(timeout)
        // 立即停止，避免实际播放
        setTimeout(() => window.speechSynthesis.cancel(), 50)
        
        resolve({
          success: true,
          details: {
            totalVoices: finalVoices.length,
            chineseVoices: chineseVoices.length,
            voiceNames: chineseVoices.map(v => v.name),
            selectedVoice: utterance.voice?.name || 'default',
            note: '语音合成启动成功'
          }
        })
      }

      utterance.onend = () => {
        clearTimeout(timeout)
        resolve({
          success: true,
          details: {
            totalVoices: finalVoices.length,
            chineseVoices: chineseVoices.length,
            voiceNames: chineseVoices.map(v => v.name),
            selectedVoice: utterance.voice?.name || 'default',
            note: '语音合成正常结束'
          }
        })
      }

      utterance.onerror = (event: any) => {
        clearTimeout(timeout)
        
        // 某些错误是正常的（比如取消），不算失败
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve({
            success: true,
            details: {
              totalVoices: finalVoices.length,
              chineseVoices: chineseVoices.length,
              voiceNames: chineseVoices.map(v => v.name),
              selectedVoice: utterance.voice?.name || 'default',
              note: '语音合成被取消（正常）'
            }
          })
        } else {
          resolve({
            success: false,
            error: `语音合成错误: ${event.error}`,
            details: {
              ...event,
              totalVoices: finalVoices.length,
              chineseVoices: chineseVoices.length
            }
          })
        }
      }

      try {
        // 先清除可能存在的语音队列
        window.speechSynthesis.cancel()
        setTimeout(() => {
          window.speechSynthesis.speak(utterance)
        }, 100)
      } catch (error) {
        clearTimeout(timeout)
        resolve({
          success: false,
          error: `启动语音合成失败: ${error}`,
          details: error
        })
      }
    })
  } catch (error) {
    return {
      success: false,
      error: `语音合成测试异常: ${error}`,
      details: error
    }
  }
}

/**
 * 测试麦克风权限
 */
export async function testMicrophoneAccess(): Promise<VoiceTestResult> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        success: false,
        error: '浏览器不支持mediaDevices API'
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    // 获取音频轨道信息
    const audioTracks = stream.getAudioTracks()
    const trackSettings = audioTracks[0]?.getSettings()

    // 立即停止流
    stream.getTracks().forEach(track => track.stop())

    return {
      success: true,
      details: {
        tracksCount: audioTracks.length,
        trackLabel: audioTracks[0]?.label,
        settings: trackSettings
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: `麦克风访问失败: ${error.name}: ${error.message}`,
      details: {
        name: error.name,
        message: error.message,
        code: error.code
      }
    }
  }
}

/**
 * 运行完整的语音功能测试
 */
export async function runCompleteVoiceTest() {
  const capabilities = detectVoiceCapabilities()
  
  console.log('🔍 语音功能检测结果:')
  console.log('浏览器信息:', capabilities.browserInfo)
  console.log('语音识别支持:', capabilities.speechRecognition)
  console.log('语音合成支持:', capabilities.speechSynthesis)
  console.log('Web Audio支持:', capabilities.webAudio)
  console.log('媒体设备支持:', capabilities.mediaDevices)
  console.log('HTTPS安全连接:', capabilities.browserInfo.isSecure)

  // 测试语音合成
  console.log('\n🗣️ 测试语音合成...')
  const synthesisResult = await testSpeechSynthesis()
  console.log('语音合成测试:', synthesisResult)

  // 测试麦克风权限
  console.log('\n🎤 测试麦克风权限...')
  const micResult = await testMicrophoneAccess()
  console.log('麦克风权限测试:', micResult)

  // 测试语音识别
  if (micResult.success) {
    console.log('\n👂 测试语音识别...')
    const recognitionResult = await testSpeechRecognition()
    console.log('语音识别测试:', recognitionResult)
  } else {
    console.log('\n❌ 跳过语音识别测试 (麦克风权限失败)')
  }

  // 总结报告
  const report = {
    capabilities,
    tests: {
      speechSynthesis: synthesisResult,
      microphone: micResult,
      speechRecognition: micResult.success ? await testSpeechRecognition() : { success: false, error: '麦克风权限不足' }
    },
    recommendations: generateRecommendations(capabilities, synthesisResult, micResult)
  }

  console.log('\n📋 完整测试报告:', report)
  return report
}

/**
 * 生成使用建议
 */
function generateRecommendations(
  capabilities: VoiceCapabilities, 
  synthesisResult: VoiceTestResult, 
  micResult: VoiceTestResult
): string[] {
  const recommendations: string[] = []

  if (!capabilities.browserInfo.isSecure) {
    recommendations.push('建议使用HTTPS协议以获得最佳语音功能支持')
  }

  if (!capabilities.speechRecognition) {
    recommendations.push('当前浏览器不支持语音识别，建议使用Chrome、Edge或Safari最新版')
  }

  if (!capabilities.speechSynthesis) {
    recommendations.push('当前浏览器不支持语音合成，建议使用现代浏览器')
  }

  if (!micResult.success) {
    if (micResult.error?.includes('NotAllowedError') || micResult.error?.includes('Permission denied')) {
      recommendations.push('请允许浏览器访问麦克风权限，然后刷新页面重试')
    } else if (micResult.error?.includes('NotFoundError')) {
      recommendations.push('未检测到麦克风设备，请确保麦克风已连接')
    } else {
      recommendations.push('麦克风访问失败，请检查设备和权限设置')
    }
  }

  if (capabilities.browserInfo.name === 'Chrome' && parseInt(capabilities.browserInfo.version) < 25) {
    recommendations.push('建议升级Chrome浏览器至25版本以上以获得更好的语音支持')
  }

  if (capabilities.browserInfo.name === 'Safari' && parseInt(capabilities.browserInfo.version) < 14) {
    recommendations.push('建议升级Safari浏览器至14.1版本以上以获得更好的语音支持')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ 您的浏览器完全支持语音功能，可以正常使用语音交互')
  }

  return recommendations
}

// 扩展Window接口（使用新的命名避免冲突）
declare global {
  interface Window {
    runVoiceTest?: () => Promise<any>
  }
}

// 将测试函数挂载到全局，方便在控制台调用
if (typeof window !== 'undefined') {
  window.runVoiceTest = runCompleteVoiceTest
} 