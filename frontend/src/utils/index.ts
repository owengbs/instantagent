import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import zhCN from 'date-fns/locale/zh-CN'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// 样式合并工具
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID
export function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 时间格式化
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  
  if (isToday(date)) {
    return format(date, 'HH:mm')
  } else if (isYesterday(date)) {
    return `昨天 ${format(date, 'HH:mm')}`
  } else {
    return format(date, 'MM-dd HH:mm')
  }
}

// 相对时间格式化
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  return formatDistanceToNow(date, { 
    locale: zhCN, 
    addSuffix: true 
  })
}

// 滚动到底部
export function scrollToBottom(element: HTMLElement, smooth = true): void {
  element.scrollTo({
    top: element.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

// 延迟函数
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, wait)
    }
  }
}

// 本地存储工具
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue ?? null
    } catch {
      return defaultValue ?? null
    }
  },
  
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('存储数据失败:', error)
    }
  },
  
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('删除存储数据失败:', error)
    }
  },
  
  clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.warn('清空存储失败:', error)
    }
  }
}

// URL工具
export const url = {
  // 获取WebSocket URL
  getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = process.env.NODE_ENV === 'development' 
      ? 'localhost:8000' 
      : window.location.host
    return `${protocol}//${host}/api/chat/ws`
  },
  
  // 获取API基础URL
  getApiBaseUrl(): string {
    return process.env.NODE_ENV === 'development'
      ? 'http://localhost:8000/api'
      : '/api'
  }
}

// 消息内容处理
export function processMessageContent(content: string): string {
  // 处理换行
  return content
    .replace(/\n{3,}/g, '\n\n') // 多个换行替换为两个
    .trim()
}

// 检查是否是移动设备
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// 检查是否支持WebSocket
export function supportsWebSocket(): boolean {
  return 'WebSocket' in window
}

// 复制到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // 备用方法
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const success = document.execCommand('copy')
      textArea.remove()
      return success
    }
  } catch {
    return false
  }
}

// 错误处理
export function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return '发生了未知错误'
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// 颜色工具
export const colors = {
  // 获取随机颜色
  random(): string {
    const colors = [
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
      '#d946ef', '#ec4899', '#f43f5e', '#ef4444',
      '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  },
  
  // 获取对比色
  getContrast(hex: string): 'light' | 'dark' {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? 'dark' : 'light'
  }
} 