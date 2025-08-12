/**
 * 设备检测和移动端适配工具
 */

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isIOS: boolean
  isAndroid: boolean
  isSafari: boolean
  isChrome: boolean
  touchSupported: boolean
  screenSize: 'sm' | 'md' | 'lg' | 'xl'
  orientation: 'portrait' | 'landscape'
}

/**
 * 检测设备类型和环境
 */
export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent.toLowerCase()
  const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // 设备类型检测
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent)
  const isDesktop = !isMobile && !isTablet
  
  // 操作系统检测
  const isIOS = /iphone|ipad|ipod/i.test(userAgent)
  const isAndroid = /android/i.test(userAgent)
  
  // 浏览器检测
  const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent)
  const isChrome = /chrome/i.test(userAgent)
  
  // 屏幕尺寸检测
  const getScreenSize = (): 'sm' | 'md' | 'lg' | 'xl' => {
    const width = window.innerWidth
    if (width < 640) return 'sm'
    if (width < 768) return 'md'
    if (width < 1024) return 'lg'
    return 'xl'
  }
  
  // 屏幕方向检测
  const getOrientation = (): 'portrait' | 'landscape' => {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  }
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    touchSupported,
    screenSize: getScreenSize(),
    orientation: getOrientation()
  }
}

/**
 * 移动端相关的hook
 */
export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(getDeviceInfo())
  
  React.useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo())
    }
    
    const handleOrientationChange = () => {
      // iOS需要延迟获取正确的尺寸
      setTimeout(() => {
        setDeviceInfo(getDeviceInfo())
      }, 100)
    }
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])
  
  return deviceInfo
}

/**
 * 触摸手势检测
 */
export interface TouchGesture {
  startX: number
  startY: number
  endX: number
  endY: number
  deltaX: number
  deltaY: number
  distance: number
  direction: 'left' | 'right' | 'up' | 'down' | 'none'
  duration: number
}

export const useTouchGesture = (
  onSwipe?: (gesture: TouchGesture) => void,
  threshold: number = 50
) => {
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number; time: number } | null>(null)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    })
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const endTime = Date.now()
    
    const gesture: TouchGesture = {
      startX: touchStart.x,
      startY: touchStart.y,
      endX: touch.clientX,
      endY: touch.clientY,
      deltaX: touch.clientX - touchStart.x,
      deltaY: touch.clientY - touchStart.y,
      distance: Math.sqrt(
        Math.pow(touch.clientX - touchStart.x, 2) + 
        Math.pow(touch.clientY - touchStart.y, 2)
      ),
      direction: getSwipeDirection(touchStart.x, touchStart.y, touch.clientX, touch.clientY, threshold),
      duration: endTime - touchStart.time
    }
    
    if (gesture.distance > threshold && onSwipe) {
      onSwipe(gesture)
    }
    
    setTouchStart(null)
  }
  
  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  }
}

const getSwipeDirection = (
  startX: number, 
  startY: number, 
  endX: number, 
  endY: number, 
  threshold: number
): 'left' | 'right' | 'up' | 'down' | 'none' => {
  const deltaX = endX - startX
  const deltaY = endY - startY
  
  if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
    return 'none'
  }
  
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? 'right' : 'left'
  } else {
    return deltaY > 0 ? 'down' : 'up'
  }
}

/**
 * 安全区域适配 (iOS刘海屏等)
 */
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement)
  
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
  }
}

/**
 * 移动端性能优化
 */
export const optimizeForMobile = () => {
  // 禁用长按菜单
  document.addEventListener('contextmenu', (e) => {
    if (getDeviceInfo().isMobile) {
      e.preventDefault()
    }
  })
  
  // 优化touch事件
  document.addEventListener('touchstart', () => {}, { passive: true })
  document.addEventListener('touchmove', () => {}, { passive: true })
  
  // 禁用双击缩放
  let lastTouchEnd = 0
  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      e.preventDefault()
    }
    lastTouchEnd = now
  }, false)
  
  // 设置viewport meta
  const viewport = document.querySelector('meta[name=viewport]')
  if (viewport && getDeviceInfo().isMobile) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    )
  }
}

/**
 * 虚拟键盘适配
 */
export const useVirtualKeyboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false)
  
  React.useEffect(() => {
    const initialHeight = window.innerHeight
    
    const handleResize = () => {
      const currentHeight = window.innerHeight
      const heightDiff = initialHeight - currentHeight
      
      // 高度变化超过150px认为是键盘弹出
      setIsKeyboardOpen(heightDiff > 150)
    }
    
    // 使用 Visual Viewport API (现代浏览器)
    if ('visualViewport' in window) {
      const visualViewport = window.visualViewport!
      const handleViewportChange = () => {
        const heightDiff = window.screen.height - visualViewport.height
        setIsKeyboardOpen(heightDiff > 150)
      }
      
      visualViewport.addEventListener('resize', handleViewportChange)
      return () => {
        visualViewport.removeEventListener('resize', handleViewportChange)
      }
    } else {
      // 降级方案
      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])
  
  return isKeyboardOpen
}

// React import for hooks
import React from 'react'
