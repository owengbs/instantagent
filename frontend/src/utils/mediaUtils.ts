/**
 * 媒体设备检查和兼容性工具
 */

export interface MediaSupportInfo {
  isSupported: boolean
  isSecureContext: boolean
  hasMediaDevices: boolean
  hasGetUserMedia: boolean
  errorMessage?: string
  recommendations: string[]
}

/**
 * 检查浏览器是否支持媒体设备访问
 */
export function checkMediaSupport(): MediaSupportInfo {
  const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost'
  const hasMediaDevices = !!(navigator.mediaDevices)
  const hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia)
  
  const recommendations: string[] = []
  let errorMessage: string | undefined
  
  // 检查基本支持
  if (!hasMediaDevices) {
    errorMessage = '浏览器不支持媒体设备API'
    recommendations.push('请使用现代浏览器（Chrome 53+、Firefox 53+、Safari 11+）')
  } else if (!hasGetUserMedia) {
    errorMessage = '浏览器不支持getUserMedia API'
    recommendations.push('请更新浏览器到最新版本')
  }
  
  // 检查安全上下文
  if (!isSecureContext) {
    if (!errorMessage) {
      errorMessage = '需要HTTPS环境才能访问麦克风'
    }
    recommendations.push('请使用HTTPS协议访问本站点')
    recommendations.push('或在localhost环境下测试')
  }
  
  // 添加通用建议
  if (recommendations.length === 0) {
    recommendations.push('确保已授予麦克风权限')
    recommendations.push('检查麦克风是否被其他应用占用')
  }
  
  const isSupported = hasMediaDevices && hasGetUserMedia && isSecureContext
  
  return {
    isSupported,
    isSecureContext,
    hasMediaDevices,
    hasGetUserMedia,
    errorMessage,
    recommendations
  }
}

/**
 * 获取用户友好的错误信息和解决方案
 */
export function getMediaErrorInfo(error: Error): { message: string, solutions: string[] } {
  const errorMessage = error.message.toLowerCase()
  
  // HTTPS相关错误
  if (errorMessage.includes('https') || errorMessage.includes('secure context')) {
    return {
      message: '需要HTTPS环境才能访问麦克风',
      solutions: [
        '请使用HTTPS协议访问本站点',
        '或在localhost环境下测试',
        '确保URL以https://开头'
      ]
    }
  }
  
  // 权限相关错误
  if (errorMessage.includes('permission') || errorMessage.includes('denied') || errorMessage.includes('notallowed')) {
    return {
      message: '麦克风权限被拒绝',
      solutions: [
        '点击浏览器地址栏的麦克风图标，允许访问',
        '在浏览器设置中检查站点权限',
        '刷新页面重新申请权限'
      ]
    }
  }
  
  // 设备占用错误
  if (errorMessage.includes('notreadable') || errorMessage.includes('tracksourceerror')) {
    return {
      message: '麦克风设备被其他应用占用',
      solutions: [
        '关闭其他正在使用麦克风的应用',
        '检查是否有其他浏览器标签页在使用麦克风',
        '重新插拔麦克风设备'
      ]
    }
  }
  
  // 设备未找到错误
  if (errorMessage.includes('notfound') || errorMessage.includes('devicenotfound')) {
    return {
      message: '未找到麦克风设备',
      solutions: [
        '确保麦克风设备已正确连接',
        '检查系统音频设置',
        '尝试重新连接麦克风设备'
      ]
    }
  }
  
  // 浏览器兼容性错误
  if (errorMessage.includes('not supported') || errorMessage.includes('undefined')) {
    return {
      message: '浏览器不支持语音功能',
      solutions: [
        '请使用现代浏览器（Chrome、Firefox、Safari最新版）',
        '确保浏览器已启用媒体功能',
        '尝试更新浏览器到最新版本'
      ]
    }
  }
  
  // 通用错误
  return {
    message: '麦克风访问失败',
    solutions: [
      '检查麦克风权限设置',
      '尝试刷新页面重新授权',
      '使用HTTPS协议访问',
      '确保麦克风设备正常工作'
    ]
  }
}

/**
 * 检查是否有可用的音频输入设备
 */
export async function checkAudioInputDevices(): Promise<{ hasDevices: boolean, deviceCount: number }> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { hasDevices: false, deviceCount: 0 }
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter(device => device.kind === 'audioinput')
    
    return {
      hasDevices: audioInputs.length > 0,
      deviceCount: audioInputs.length
    }
  } catch (error) {
    console.warn('检查音频设备失败:', error)
    return { hasDevices: false, deviceCount: 0 }
  }
}
