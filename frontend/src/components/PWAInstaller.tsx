import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  Smartphone, 
  X, 
  CheckCircle, 
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const PWAInstaller: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [swStatus, setSWStatus] = useState<'installing' | 'waiting' | 'active' | 'error' | null>(null)

  useEffect(() => {
    // 检查是否已安装
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isWebAPK = 'navigator' in window && 'standalone' in (window.navigator as any)
      setIsInstalled(isStandalone || isWebAPK)
    }

    checkInstalled()

    // 监听安装提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
    }

    // 监听网络状态
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 注册Service Worker
    registerServiceWorker()

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        setSWStatus('installing')
        const registration = await navigator.serviceWorker.register('/sw.js')
        setSwRegistration(registration)

        if (registration.installing) {
          setSWStatus('installing')
          registration.installing.addEventListener('statechange', () => {
            if (registration.installing?.state === 'installed') {
              setSWStatus('waiting')
            }
          })
        } else if (registration.waiting) {
          setSWStatus('waiting')
        } else if (registration.active) {
          setSWStatus('active')
        }

        registration.addEventListener('updatefound', () => {
          setSWStatus('installing')
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setSWStatus('waiting')
              }
            })
          }
        })

        console.log('✅ Service Worker registered successfully')
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error)
        setSWStatus('error')
      }
    }
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted the install prompt')
        setIsInstalled(true)
      } else {
        console.log('❌ User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallBanner(false)
    } catch (error) {
      console.error('❌ Install failed:', error)
    }
  }

  const handleUpdateSW = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        platform: 'iOS Safari',
        steps: [
          '点击底部分享按钮 📤',
          '选择"添加到主屏幕"',
          '点击"添加"完成安装'
        ]
      }
    } else if (userAgent.includes('android')) {
      return {
        platform: 'Android Chrome',
        steps: [
          '点击右上角菜单 ⋮',
          '选择"添加到主屏幕"',
          '点击"添加"完成安装'
        ]
      }
    } else {
      return {
        platform: 'Desktop',
        steps: [
          '点击地址栏右侧的安装图标',
          '或使用 Ctrl+Shift+A',
          '点击"安装"完成安装'
        ]
      }
    }
  }

  const instructions = getInstallInstructions()

  if (isInstalled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-green-500 text-white p-3 rounded-full shadow-lg"
        >
          <CheckCircle className="w-6 h-6" />
        </motion.div>
      </div>
    )
  }

  return (
    <>
      {/* 网络状态指示器 */}
      <div className="fixed top-4 left-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm ${
            isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span>{isOnline ? '在线' : '离线'}</span>
        </motion.div>
      </div>

      {/* Service Worker状态 */}
      {swStatus && swStatus !== 'active' && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm flex items-center space-x-2"
          >
            {swStatus === 'installing' && (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>正在安装...</span>
              </>
            )}
            {swStatus === 'waiting' && (
              <>
                <Download className="w-4 h-4" />
                <span>有更新可用</span>
                <button
                  onClick={handleUpdateSW}
                  className="ml-2 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                >
                  更新
                </button>
              </>
            )}
            {swStatus === 'error' && (
              <>
                <X className="w-4 h-4" />
                <span>安装失败</span>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* 安装横幅 */}
      <AnimatePresence>
        {showInstallBanner && deferredPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 z-50 shadow-lg"
          >
            <div className="max-w-md mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-6 h-6" />
                <div>
                  <p className="font-medium text-sm">安装圆桌会议APP</p>
                  <p className="text-xs opacity-90">获得更好的移动体验</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleInstall}
                  className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
                >
                  安装
                </button>
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 手动安装说明（当浏览器不支持自动安装时） */}
      {!deferredPrompt && !isInstalled && (
        <div className="fixed bottom-4 right-4 z-40">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium text-sm">安装APP</h3>
            </div>
            
            <p className="text-xs text-gray-600 mb-2">
              在{instructions.platform}上：
            </p>
            
            <ul className="text-xs text-gray-600 space-y-1">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-1">
                  <span className="text-blue-500 font-medium">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => setShowInstallBanner(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </>
  )
}

export default PWAInstaller
