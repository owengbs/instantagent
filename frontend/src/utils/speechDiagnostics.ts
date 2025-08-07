// 语音合成详细诊断工具

export interface SpeechDiagnostics {
  browserSupport: boolean
  autoplayPolicy: string
  userGestureRequired: boolean
  speechSynthesisReady: boolean
  voicesAvailable: number
  chineseVoices: number
  canPlayAudio: boolean
}

/**
 * 检测浏览器的语音合成和自动播放策略
 */
export async function diagnoseSpeechSynthesis(): Promise<SpeechDiagnostics> {
  const diagnostics: SpeechDiagnostics = {
    browserSupport: false,
    autoplayPolicy: 'unknown',
    userGestureRequired: true,
    speechSynthesisReady: false,
    voicesAvailable: 0,
    chineseVoices: 0,
    canPlayAudio: false
  }

  // 1. 检查基础支持
  diagnostics.browserSupport = !!(window.speechSynthesis && window.SpeechSynthesisUtterance)
  
  if (!diagnostics.browserSupport) {
    console.log('❌ 浏览器不支持语音合成API')
    return diagnostics
  }

  // 2. 检查语音合成状态
  diagnostics.speechSynthesisReady = !window.speechSynthesis.speaking && !window.speechSynthesis.pending

  // 3. 获取可用语音
  const voices = window.speechSynthesis.getVoices()
  diagnostics.voicesAvailable = voices.length
  diagnostics.chineseVoices = voices.filter(voice => 
    voice.lang.startsWith('zh') || voice.name.toLowerCase().includes('chinese')
  ).length

  // 4. 检测自动播放策略 (Chrome/Edge)
  try {
    // @ts-ignore
    if (navigator.getAutoplayPolicy) {
      // @ts-ignore
      diagnostics.autoplayPolicy = navigator.getAutoplayPolicy('mediaelement')
    }
  } catch (e) {
    console.log('⚠️ 无法检测自动播放策略:', e)
  }

  // 5. 测试音频播放能力
  try {
    const audio = new Audio()
    audio.volume = 0
    const playPromise = audio.play()
    
    if (playPromise) {
      await playPromise
      audio.pause()
      diagnostics.canPlayAudio = true
    }
  } catch (e) {
    console.log('⚠️ 音频播放被阻止:', e)
    diagnostics.userGestureRequired = true
  }

  // 6. 如果语音列表为空，等待加载
  if (diagnostics.voicesAvailable === 0) {
    console.log('🔄 等待语音列表加载...')
    await new Promise(resolve => {
      const checkVoices = () => {
        const newVoices = window.speechSynthesis.getVoices()
        if (newVoices.length > 0) {
          diagnostics.voicesAvailable = newVoices.length
          diagnostics.chineseVoices = newVoices.filter(voice => 
            voice.lang.startsWith('zh') || voice.name.toLowerCase().includes('chinese')
          ).length
          resolve(true)
        } else {
          setTimeout(checkVoices, 100)
        }
      }
      
      window.speechSynthesis.onvoiceschanged = checkVoices
      setTimeout(() => resolve(false), 2000) // 最多等待2秒
    })
  }

  console.log('🔍 语音合成诊断结果:', diagnostics)
  return diagnostics
}

/**
 * 测试语音合成实际播放能力
 */
export async function testSpeechSynthesisPlayback(text: string = '测试'): Promise<{
  success: boolean
  error?: string
  events: string[]
  duration: number
}> {
  const startTime = Date.now()
  const events: string[] = []
  
  return new Promise((resolve) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      resolve({
        success: false,
        error: '浏览器不支持语音合成',
        events,
        duration: Date.now() - startTime
      })
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 2 // 快速播放
    utterance.volume = 0.1 // 小音量

    const timeout = setTimeout(() => {
      events.push('timeout')
      window.speechSynthesis.cancel()
      resolve({
        success: false,
        error: '播放超时',
        events,
        duration: Date.now() - startTime
      })
    }, 5000)

    utterance.onstart = () => {
      events.push('start')
      console.log('✅ 语音合成开始播放（测试）')
    }

    utterance.onend = () => {
      events.push('end')
      clearTimeout(timeout)
      console.log('✅ 语音合成播放完成（测试）')
      resolve({
        success: true,
        events,
        duration: Date.now() - startTime
      })
    }

    utterance.onerror = (event: any) => {
      events.push(`error:${event.error}`)
      clearTimeout(timeout)
      console.log('❌ 语音合成测试错误:', event.error)
      resolve({
        success: false,
        error: event.error,
        events,
        duration: Date.now() - startTime
      })
    }

    utterance.onpause = () => events.push('pause')
    utterance.onresume = () => events.push('resume')

    try {
      events.push('speak_called')
      console.log('🎯 开始语音合成测试播放...')
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      clearTimeout(timeout)
      events.push('speak_error')
      resolve({
        success: false,
        error: `调用失败: ${error}`,
        events,
        duration: Date.now() - startTime
      })
    }
  })
}

/**
 * 运行完整的语音合成诊断
 */
export async function runFullSpeechDiagnosis() {
  console.log('🏥 开始完整语音合成诊断...')
  
  // 1. 基础诊断
  const diagnostics = await diagnoseSpeechSynthesis()
  
  // 2. 播放测试
  const playbackTest = await testSpeechSynthesisPlayback()
  
  // 3. 生成诊断报告
  const report = {
    diagnostics,
    playbackTest,
    recommendations: generateSpeechRecommendations(diagnostics, playbackTest),
    timestamp: new Date().toISOString()
  }

  console.log('📋 完整语音合成诊断报告:', report)
  return report
}

/**
 * 生成语音合成问题解决建议
 */
function generateSpeechRecommendations(
  diagnostics: SpeechDiagnostics, 
  playbackTest: any
): string[] {
  const recommendations: string[] = []

  if (!diagnostics.browserSupport) {
    recommendations.push('❌ 浏览器不支持语音合成，请使用Chrome、Edge或Safari')
    return recommendations
  }

  if (diagnostics.voicesAvailable === 0) {
    recommendations.push('⚠️ 没有可用的语音，请检查系统语音设置')
  } else if (diagnostics.chineseVoices === 0) {
    recommendations.push('⚠️ 没有中文语音，可能影响发音效果')
  }

  if (!playbackTest.success) {
    if (playbackTest.error === 'not-allowed' || playbackTest.error === 'canceled') {
      recommendations.push('🔒 浏览器阻止了自动播放，需要用户手动点击播放按钮')
      recommendations.push('💡 解决方案：点击播放按钮手动启动语音合成')
    } else if (playbackTest.error === 'timeout' || playbackTest.error === '播放超时') {
      recommendations.push('⏰ 语音合成启动超时，可能被浏览器策略阻止')
      recommendations.push('💡 解决方案：需要在用户点击事件中直接调用语音合成')
    } else {
      recommendations.push(`❌ 语音合成错误: ${playbackTest.error}`)
    }
  } else {
    recommendations.push('✅ 语音合成功能正常，可以正常播放')
  }

  if (diagnostics.autoplayPolicy === 'require-user-activation') {
    recommendations.push('🎮 浏览器要求用户激活后才能播放音频')
    recommendations.push('💡 建议：所有语音播放都通过用户点击按钮触发')
  }

  return recommendations
}

// 挂载到全局
if (typeof window !== 'undefined') {
  (window as any).runFullSpeechDiagnosis = runFullSpeechDiagnosis
  ;(window as any).testSpeechPlayback = (text: string = '测试') => testSpeechSynthesisPlayback(text)
} 