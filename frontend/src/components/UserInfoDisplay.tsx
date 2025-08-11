import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Clock, 
  Hash, 
  Globe, 
  Monitor,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Activity
} from 'lucide-react'
import { userManager } from '../utils/userManager'

interface UserInfoDisplayProps {
  compact?: boolean
  showSessionInfo?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const UserInfoDisplay: React.FC<UserInfoDisplayProps> = ({
  compact = false,
  showSessionInfo = true,
  autoRefresh = false,
  refreshInterval = 5000
}) => {
  const [userInfo, setUserInfo] = useState(userManager.getCurrentUser())
  const [currentSession, setCurrentSession] = useState(userManager.getCurrentSession())
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [copied, setCopied] = useState<string | null>(null)

  // 获取浏览器和设备信息
  const getBrowserInfo = () => {
    const ua = navigator.userAgent
    let browser = 'Unknown'
    let os = 'Unknown'

    // 检测浏览器
    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Edge')) browser = 'Edge'

    // 检测操作系统
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS')) os = 'iOS'

    return { browser, os }
  }

  const browserInfo = getBrowserInfo()

  // 刷新用户信息
  const refreshUserInfo = () => {
    setUserInfo(userManager.getCurrentUser())
    setCurrentSession(userManager.getCurrentSession())
    setLastRefresh(new Date())
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  // 计算账户年龄
  const getAccountAge = () => {
    const created = new Date(userInfo.createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}天前创建`
    if (diffHours > 0) return `${diffHours}小时前创建`
    if (diffMinutes > 0) return `${diffMinutes}分钟前创建`
    return '刚刚创建'
  }

  // 获取存储信息
  const getStorageInfo = () => {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) keys.push(key)
    }
    
    return {
      totalKeys: keys.length,
      userKeys: keys.filter(key => key.includes(userInfo.id)).length,
      allKeys: keys
    }
  }

  const storageInfo = getStorageInfo()

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshUserInfo, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  if (compact) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{userInfo.nickname}</span>
            <button
              onClick={() => copyToClipboard(userInfo.id, 'userId')}
              className="text-gray-400 hover:text-gray-600"
              title="复制用户ID"
            >
              {copied === 'userId' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <button 
            onClick={refreshUserInfo}
            className="text-gray-400 hover:text-gray-600"
            title="刷新"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        
        <div className="mt-1 text-gray-500 text-xs">
          ID: {userInfo.id.slice(0, 8)}... | {browserInfo.browser} | {getAccountAge()}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
    >
      {/* 标题栏 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{userInfo.nickname}</h3>
              <p className="text-blue-100 text-sm">多用户测试面板</p>
            </div>
          </div>
          
          <button 
            onClick={refreshUserInfo}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="刷新信息"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 用户身份信息 */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
            <Hash className="w-4 h-4" />
            <span>用户身份</span>
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-600">用户ID</label>
                  <p className="font-mono text-sm text-gray-900 break-all">{userInfo.id}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(userInfo.id, 'userId')}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="复制用户ID"
                >
                  {copied === 'userId' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-sm text-gray-600">创建时间</label>
                <p className="text-sm text-gray-900">{formatTime(userInfo.createdAt)}</p>
                <p className="text-xs text-gray-500">{getAccountAge()}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-sm text-gray-600">最后活跃</label>
                <p className="text-sm text-gray-900">{formatTime(userInfo.lastActiveAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 环境信息 */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
            <Monitor className="w-4 h-4" />
            <span>环境信息</span>
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-sm text-gray-600">浏览器</label>
              <p className="text-sm text-gray-900">{browserInfo.browser}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-sm text-gray-600">操作系统</label>
              <p className="text-sm text-gray-900">{browserInfo.os}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-sm text-gray-600">localStorage键数量</label>
              <p className="text-sm text-gray-900">{storageInfo.totalKeys} (用户相关: {storageInfo.userKeys})</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-sm text-gray-600">最后刷新</label>
              <p className="text-sm text-gray-900">{lastRefresh.toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        {/* 会话信息 */}
        {showSessionInfo && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>当前会话</span>
            </h4>
            
            {currentSession ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-800">活跃会话</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">会话ID:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-xs text-gray-900">{currentSession.sessionId.slice(0, 20)}...</span>
                      <button
                        onClick={() => copyToClipboard(currentSession.sessionId, 'sessionId')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {copied === 'sessionId' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  
                  {currentSession.topic && (
                    <div>
                      <span className="text-gray-600">话题:</span>
                      <span className="ml-2 text-gray-900">{currentSession.topic}</span>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-gray-600">创建时间:</span>
                    <span className="ml-2 text-gray-900">{formatTime(currentSession.createdAt)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-800">暂无活跃会话</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 存储详情 */}
        <details className="space-y-2">
          <summary className="font-semibold text-gray-900 cursor-pointer flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>存储详情</span>
          </summary>
          
          <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
            <p className="text-sm text-gray-600 mb-2">localStorage 键列表:</p>
            <div className="space-y-1">
              {storageInfo.allKeys.map((key, index) => (
                <div key={index} className={`text-xs p-1 rounded ${
                  key.includes(userInfo.id) ? 'bg-blue-100 text-blue-800' : 'text-gray-600'
                }`}>
                  {key}
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">多用户测试说明:</p>
              <ul className="text-xs space-y-1 text-blue-700">
                <li>• 同一浏览器的不同标签页共享用户ID</li>
                <li>• 不同浏览器会生成不同的用户ID</li>
                <li>• 清除浏览器数据会重置用户身份</li>
                <li>• 用户数据存储在localStorage中</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default UserInfoDisplay
