// 简单的语音合成测试工具

/**
 * 直接测试浏览器语音合成API
 */
export async function testDirectSpeechSynthesis(text: string = '你好，这是语音测试'): Promise<{
  success: boolean
  events: string[]
  duration: number
  browserStates: any[]
}> {
  console.log('🧪 开始直接语音合成测试...')
  
  const startTime = Date.now()
  const events: string[] = []
  const browserStates: any[] = []
  
  // 记录浏览器状态的函数
  const recordState = (label: string) => {
    const state = {
      label,
      timestamp: Date.now() - startTime,
      speaking: window.speechSynthesis.speaking,
      pending: window.speechSynthesis.pending,
      paused: window.speechSynthesis.paused
    }
    browserStates.push(state)
    console.log(`📊 ${label}:`, state)
  }

  return new Promise((resolve) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      resolve({
        success: false,
        events: ['no_support'],
        duration: Date.now() - startTime,
        browserStates
      })
      return
    }

    // 清空队列
    window.speechSynthesis.cancel()
    
    recordState('初始状态')

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1.5
    utterance.volume = 0.3

    const timeout = setTimeout(() => {
      events.push('timeout')
      recordState('超时')
      window.speechSynthesis.cancel()
      resolve({
        success: false,
        events,
        duration: Date.now() - startTime,
        browserStates
      })
    }, 10000)

    utterance.onstart = () => {
      events.push('start')
      recordState('开始播放')
      console.log('✅ onstart 事件触发')
    }

    utterance.onend = () => {
      events.push('end')
      recordState('播放结束')
      clearTimeout(timeout)
      console.log('✅ onend 事件触发')
      resolve({
        success: true,
        events,
        duration: Date.now() - startTime,
        browserStates
      })
    }

    utterance.onerror = (event: any) => {
      events.push(`error:${event.error}`)
      recordState(`错误:${event.error}`)
      clearTimeout(timeout)
      console.log('❌ onerror 事件触发:', event.error)
      resolve({
        success: false,
        events,
        duration: Date.now() - startTime,
        browserStates
      })
    }

    utterance.onpause = () => {
      events.push('pause')
      recordState('暂停')
    }

    utterance.onresume = () => {
      events.push('resume')
      recordState('恢复')
    }

    // 开始播放
    try {
      events.push('speak_called')
      recordState('调用speak')
      console.log('🎯 调用 speechSynthesis.speak()...')
      window.speechSynthesis.speak(utterance)
      
      // 短暂延迟后检查状态
      setTimeout(() => {
        recordState('调用后100ms')
      }, 100)
      
      setTimeout(() => {
        recordState('调用后500ms')
      }, 500)
      
    } catch (error) {
      events.push('speak_error')
      recordState('调用失败')
      clearTimeout(timeout)
      resolve({
        success: false,
        events,
        duration: Date.now() - startTime,
        browserStates
      })
    }
  })
}

// 挂载到全局
if (typeof window !== 'undefined') {
  (window as any).testDirectSpeech = testDirectSpeechSynthesis
} 