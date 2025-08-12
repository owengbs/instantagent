/**
 * 移动端检测和设备信息工具
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isWechat: boolean;
  isApp: boolean; // PWA或原生应用
  screenSize: 'small' | 'medium' | 'large';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  hasTouch: boolean;
  supportsWebRTC: boolean;
  supportsServiceWorker: boolean;
}

/**
 * 检测设备类型
 */
export function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const standalone = (window.navigator as any).standalone;
  const isStandalone = standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  
  // 基础设备检测
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);
  
  // 浏览器检测
  const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
  const isChrome = /chrome/i.test(userAgent);
  const isWechat = /micromessenger/i.test(userAgent);
  
  // 屏幕尺寸检测
  const screenWidth = window.screen.width;
  let screenSize: 'small' | 'medium' | 'large';
  if (screenWidth < 768) {
    screenSize = 'small';
  } else if (screenWidth < 1024) {
    screenSize = 'medium';
  } else {
    screenSize = 'large';
  }
  
  // 方向检测
  const orientation = window.screen.orientation?.angle === 90 || window.screen.orientation?.angle === 270
    ? 'landscape' 
    : 'portrait';
  
  // 功能支持检测
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const supportsWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const supportsServiceWorker = 'serviceWorker' in navigator;
  
  return {
    isMobile: isMobile && !isTablet,
    isTablet,
    isDesktop: !isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isWechat,
    isApp: isStandalone,
    screenSize,
    orientation,
    pixelRatio: window.devicePixelRatio || 1,
    hasTouch,
    supportsWebRTC,
    supportsServiceWorker
  };
}

/**
 * 检测网络连接
 */
export function getNetworkInfo() {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    online: navigator.onLine,
    type: connection?.type || 'unknown',
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false
  };
}

/**
 * 检测浏览器兼容性
 */
export function checkCompatibility() {
  return {
    webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    webSockets: 'WebSocket' in window,
    localStorage: 'localStorage' in window,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notifications: 'Notification' in window,
    geolocation: 'geolocation' in navigator,
    deviceMotion: 'DeviceMotionEvent' in window,
    vibration: 'vibrate' in navigator,
    share: 'share' in navigator,
    webShare: navigator.share !== undefined,
    clipboard: navigator.clipboard !== undefined
  };
}

/**
 * 移动端专用工具函数
 */
export class MobileUtils {
  /**
   * 防止页面滚动
   */
  static preventScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }
  
  /**
   * 恢复页面滚动
   */
  static enableScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
  
  /**
   * 震动反馈
   */
  static vibrate(pattern: number | number[] = 100) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
  
  /**
   * 隐藏地址栏（iOS Safari）
   */
  static hideAddressBar() {
    if (window.scrollY === 0) {
      setTimeout(() => {
        window.scrollTo(0, 1);
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 0);
      }, 1000);
    }
  }
  
  /**
   * 检测虚拟键盘状态
   */
  static detectVirtualKeyboard(callback: (isOpen: boolean) => void) {
    const initialViewport = window.visualViewport?.height || window.innerHeight;
    
    const handleResize = () => {
      const currentViewport = window.visualViewport?.height || window.innerHeight;
      const isKeyboardOpen = currentViewport < initialViewport * 0.75;
      callback(isKeyboardOpen);
    };
    
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }
  
  /**
   * 设置状态栏颜色（PWA）
   */
  static setStatusBarColor(color: string, style: 'default' | 'black-translucent' = 'default') {
    // 设置主题色
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', color);
    
    // 设置状态栏样式（iOS）
    let metaStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaStatus) {
      metaStatus = document.createElement('meta');
      metaStatus.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(metaStatus);
    }
    metaStatus.setAttribute('content', style);
  }
  
  /**
   * 全屏显示
   */
  static async requestFullscreen(element: HTMLElement = document.documentElement) {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.warn('无法进入全屏模式:', error);
    }
  }
  
  /**
   * 退出全屏
   */
  static async exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.warn('无法退出全屏模式:', error);
    }
  }
  
  /**
   * 检测手势方向
   */
  static detectSwipe(
    element: HTMLElement,
    onSwipe: (direction: 'up' | 'down' | 'left' | 'right', distance: number) => void,
    threshold: number = 50
  ) {
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > threshold) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // 水平滑动
          if (deltaX > 0) {
            onSwipe('right', distance);
          } else {
            onSwipe('left', distance);
          }
        } else {
          // 垂直滑动
          if (deltaY > 0) {
            onSwipe('down', distance);
          } else {
            onSwipe('up', distance);
          }
        }
      }
    };
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }
}

/**
 * 性能优化工具
 */
export class PerformanceUtils {
  /**
   * 防抖函数
   */
  static debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    }) as T;
  }
  
  /**
   * 节流函数
   */
  static throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let lastCall = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(null, args);
      }
    }) as T;
  }
  
  /**
   * 懒加载图片
   */
  static lazyLoadImages(selector: string = 'img[data-src]') {
    const images = document.querySelectorAll(selector);
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });
    
    images.forEach((img) => imageObserver.observe(img));
    return imageObserver;
  }
  
  /**
   * 内存清理
   */
  static cleanup() {
    // 清理事件监听器
    window.removeEventListener('resize', () => {});
    window.removeEventListener('orientationchange', () => {});
    
    // 强制垃圾回收（如果支持）
    if ('gc' in window) {
      (window as any).gc();
    }
  }
}

// 导出单例设备信息
export const deviceInfo = detectDevice();
export const networkInfo = getNetworkInfo();
export const compatibility = checkCompatibility();
