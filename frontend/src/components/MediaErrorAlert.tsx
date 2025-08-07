import React from 'react'
import { AlertCircle, Mic, Shield, Settings, RefreshCw } from 'lucide-react'
import { checkMediaSupport, getMediaErrorInfo } from '../utils/mediaUtils'

interface MediaErrorAlertProps {
  error: string | null
  onRetry?: () => void
  className?: string
}

const MediaErrorAlert: React.FC<MediaErrorAlertProps> = ({ error, onRetry, className = '' }) => {
  if (!error) return null

  const supportInfo = checkMediaSupport()
  const errorInfo = getMediaErrorInfo(new Error(error))

  const getErrorIcon = () => {
    const errorLower = error.toLowerCase()
    
    if (errorLower.includes('https') || errorLower.includes('secure')) {
      return <Shield className="w-5 h-5 text-orange-500" />
    }
    if (errorLower.includes('permission') || errorLower.includes('denied')) {
      return <Mic className="w-5 h-5 text-red-500" />
    }
    if (errorLower.includes('not supported') || errorLower.includes('undefined')) {
      return <Settings className="w-5 h-5 text-purple-500" />
    }
    
    return <AlertCircle className="w-5 h-5 text-red-500" />
  }

  const getErrorType = (): 'security' | 'permission' | 'compatibility' | 'device' | 'general' => {
    const errorLower = error.toLowerCase()
    
    if (errorLower.includes('https') || errorLower.includes('secure')) return 'security'
    if (errorLower.includes('permission') || errorLower.includes('denied')) return 'permission'
    if (errorLower.includes('not supported') || errorLower.includes('undefined')) return 'compatibility'
    if (errorLower.includes('device') || errorLower.includes('notfound')) return 'device'
    
    return 'general'
  }

  const errorType = getErrorType()

  const getBackgroundColor = () => {
    switch (errorType) {
      case 'security': return 'bg-orange-50 border-orange-200'
      case 'permission': return 'bg-red-50 border-red-200'
      case 'compatibility': return 'bg-purple-50 border-purple-200'
      case 'device': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${getBackgroundColor()} ${className}`}>
      <div className="flex items-start space-x-3">
        {getErrorIcon()}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            {errorInfo.message}
          </h3>
          
          {/* 解决方案列表 */}
          <div className="space-y-2">
            <p className="text-xs text-gray-600 font-medium">解决方案：</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {errorInfo.solutions.map((solution, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{solution}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 技术详情（可展开） */}
          <details className="mt-3">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              技术详情
            </summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
              <div className="space-y-1">
                <div>错误信息: {error}</div>
                <div>安全上下文: {supportInfo.isSecureContext ? '✅' : '❌'}</div>
                <div>媒体设备API: {supportInfo.hasMediaDevices ? '✅' : '❌'}</div>
                <div>getUserMedia: {supportInfo.hasGetUserMedia ? '✅' : '❌'}</div>
                <div>当前协议: {window.location.protocol}</div>
                <div>当前域名: {window.location.hostname}</div>
              </div>
            </div>
          </details>

          {/* 重试按钮 */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center space-x-1 text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>重试</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MediaErrorAlert
