// 简单的语音功能调试工具

export async function quickVoiceCheck() {
  console.log('🔍 快速语音功能检查')
  
  // 1. 检查浏览器支持
  const hasRecognition = !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition)
  const hasSynthesis = !!(window.speechSynthesis && window.SpeechSynthesisUtterance)
  const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  
  console.log('📊 基础支持检查:')
  console.log('  - 语音识别API:', hasRecognition ? '✅' : '❌')
  console.log('  - 语音合成API:', hasSynthesis ? '✅' : '❌')  
  console.log('  - 媒体设备API:', hasMediaDevices ? '✅' : '❌')
  console.log('  - 浏览器:', navigator.userAgent)
  console.log('  - 协议:', location.protocol)
  console.log('  - 域名:', location.hostname)
  
  // 2. 检查麦克风权限
  if (hasMediaDevices) {
    try {
      console.log('🎤 检查麦克风权限...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('✅ 麦克风权限获取成功')
      
      // 立即关闭流
      stream.getTracks().forEach(track => track.stop())
      
      // 3. 测试语音识别创建
      if (hasRecognition) {
        try {
          const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
          const recognition = new SpeechRecognition()
          console.log('✅ 语音识别对象创建成功')
          
          recognition.lang = 'zh-CN'
          recognition.continuous = false
          recognition.interimResults = true
          
          console.log('📝 语音识别配置:')
          console.log('  - 语言:', recognition.lang)
          console.log('  - 连续模式:', recognition.continuous)
          console.log('  - 中间结果:', recognition.interimResults)
          
        } catch (recError) {
          console.error('❌ 创建语音识别对象失败:', recError)
        }
      }
      
    } catch (micError: any) {
      console.error('❌ 麦克风权限获取失败:', micError)
      
      if (micError.name === 'NotAllowedError') {
        console.log('💡 建议: 请在浏览器地址栏左侧点击🔒图标，允许麦克风访问')
      } else if (micError.name === 'NotFoundError') {
        console.log('💡 建议: 请检查麦克风设备是否连接')
      }
    }
  }
  
  // 4. 快速语音合成测试
  if (hasSynthesis) {
    try {
      console.log('🗣️ 测试语音合成...')
      const utterance = new SpeechSynthesisUtterance('')
      utterance.volume = 0
      utterance.lang = 'zh-CN'
      
      const voices = speechSynthesis.getVoices()
      console.log(`✅ 发现 ${voices.length} 个可用语音`)
      
      const chineseVoices = voices.filter(v => v.lang.startsWith('zh'))
      console.log(`📢 中文语音数量: ${chineseVoices.length}`)
      
      if (chineseVoices.length > 0) {
        console.log('🎯 推荐中文语音:', chineseVoices[0].name)
      }
      
    } catch (synthError) {
      console.error('❌ 语音合成测试失败:', synthError)
    }
  }
  
  console.log('\n🎯 检查完成! 如果有问题，请查看上面的错误信息和建议。')
}

// 自动挂载到全局
if (typeof window !== 'undefined') {
  (window as any).quickVoiceCheck = quickVoiceCheck
} 