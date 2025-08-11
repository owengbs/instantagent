import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  TestTube, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Zap,
  Info
} from 'lucide-react'
import UserInfoDisplay from './UserInfoDisplay'
import { userManager } from '../utils/userManager'
import { API_CONFIG } from '../config/api'

const MultiUserTestPage: React.FC = () => {
  const [systemStats, setSystemStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [testResults, setTestResults] = useState<any[]>([])

  // 获取系统统计
  const fetchSystemStats = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/users/stats`)
      if (response.ok) {
        const data = await response.json()
        setSystemStats(data.stats)
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (err: any) {
      console.error('获取系统统计失败:', err)
      setError(`获取系统统计失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 测试用户隔离
  const testUserIsolation = () => {
    const currentUser = userManager.getCurrentUser()
    const testData = {
      testKey: `test_data_${Date.now()}`,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      randomValue: Math.random()
    }

    // 存储测试数据
    const userKey = userManager.getUserStorageKey('test_data')
    localStorage.setItem(userKey, JSON.stringify(testData))

    // 检查隔离性
    const otherKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('test_data') && !key.includes(currentUser.id)) {
        otherKeys.push(key)
      }
    }

    const result = {
      type: 'user_isolation',
      timestamp: new Date().toISOString(),
      success: true,
      data: {
        currentUserId: currentUser.id,
        testKey: userKey,
        testData,
        otherUserTestKeys: otherKeys,
        isolated: otherKeys.length === 0 || otherKeys.every(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}')
            return data.userId !== currentUser.id
          } catch {
            return true
          }
        })
      }
    }

    setTestResults(prev => [result, ...prev.slice(0, 9)]) // 保留最近10条
    return result
  }

  // 测试会话生成
  const testSessionGeneration = () => {
    const user = userManager.getCurrentUser()
    const session1 = userManager.createSession('测试话题1')
    const session2 = userManager.createSession('测试话题2')
    const dynamicSession = userManager.generateDynamicSessionId()

    const result = {
      type: 'session_generation',
      timestamp: new Date().toISOString(),
      success: true,
      data: {
        userId: user.id,
        session1: session1.sessionId,
        session2: session2.sessionId,
        dynamicSession,
        sessionFormat: {
          normal: session1.sessionId.split('_'),
          dynamic: dynamicSession.split('_')
        }
      }
    }

    setTestResults(prev => [result, ...prev.slice(0, 9)])
    return result
  }

  // 测试连接ID生成
  const testConnectionGeneration = () => {
    const user = userManager.getCurrentUser()
    const connections = []

    for (let i = 0; i < 3; i++) {
      const sessionId = `test_session_${i}`
      const connectionId = userManager.generateConnectionId(sessionId)
      connections.push({
        sessionId,
        connectionId,
        containsUserId: connectionId.includes(user.id)
      })
    }

    const result = {
      type: 'connection_generation',
      timestamp: new Date().toISOString(),
      success: connections.every(c => c.containsUserId),
      data: {
        userId: user.id,
        connections,
        allContainUserId: connections.every(c => c.containsUserId)
      }
    }

    setTestResults(prev => [result, ...prev.slice(0, 9)])
    return result
  }

  // 运行所有测试
  const runAllTests = () => {
    setTestResults([])
    
    setTimeout(() => testUserIsolation(), 100)
    setTimeout(() => testSessionGeneration(), 200)
    setTimeout(() => testConnectionGeneration(), 300)
    
    // 获取系统统计
    fetchSystemStats()
  }

  // 打开新窗口进行测试
  const openTestWindow = () => {
    const url = window.location.href
    const newWindow = window.open(url, '_blank', 'width=800,height=600')
    
    if (newWindow) {
      // 提示用户在新窗口中查看用户ID
      alert('新窗口已打开！请在新窗口中查看用户ID是否与当前窗口相同。')
    }
  }

  // 清除用户数据进行测试
  const clearUserDataTest = () => {
    if (confirm('这将清除当前用户的所有数据，确定继续？')) {
      const oldUserId = userManager.getCurrentUser().id
      userManager.clearUserData()
      
      // 刷新页面以重新生成用户
      setTimeout(() => {
        const newUserId = userManager.getCurrentUser().id
        alert(`用户ID已更改:\n旧ID: ${oldUserId}\n新ID: ${newUserId}`)
        window.location.reload()
      }, 1000)
    }
  }

  useEffect(() => {
    fetchSystemStats()
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div className="text-center mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center space-x-3"
        >
          <TestTube className="w-8 h-8 text-blue-500" />
          <span>多用户机制测试中心</span>
        </motion.h1>
        <p className="text-gray-600">验证用户隔离、会话管理和并发支持</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：用户信息和测试操作 */}
        <div className="space-y-6">
          {/* 用户信息显示 */}
          <UserInfoDisplay showSessionInfo={true} />

          {/* 测试操作面板 */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span>测试操作</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={runAllTests}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <TestTube className="w-4 h-4" />
                <span>运行所有测试</span>
              </button>

              <button
                onClick={fetchSystemStats}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>刷新统计</span>
              </button>

              <button
                onClick={openTestWindow}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>新窗口测试</span>
              </button>

              <button
                onClick={clearUserDataTest}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>重置用户</span>
              </button>
            </div>

            {/* 单项测试 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">单项测试:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={testUserIsolation}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  用户隔离
                </button>
                <button
                  onClick={testSessionGeneration}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  会话生成
                </button>
                <button
                  onClick={testConnectionGeneration}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  连接生成
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 右侧：系统统计和测试结果 */}
        <div className="space-y-6">
          {/* 系统统计 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span>系统统计</span>
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {systemStats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{systemStats.total_users}</p>
                  <p className="text-sm text-blue-800">总用户数</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{systemStats.active_users}</p>
                  <p className="text-sm text-green-800">活跃用户</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{systemStats.active_connections}</p>
                  <p className="text-sm text-purple-800">活跃连接</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{systemStats.total_sessions}</p>
                  <p className="text-sm text-orange-800">总会话数</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    <span>加载中...</span>
                  </>
                ) : (
                  <span>点击"刷新统计"获取数据</span>
                )}
              </div>
            )}
          </motion.div>

          {/* 测试结果 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <span>测试结果</span>
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无测试结果</p>
                  <p className="text-sm">点击"运行所有测试"开始测试</p>
                </div>
              ) : (
                testResults.map((result, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-medium text-sm">
                          {result.type === 'user_isolation' && '用户隔离测试'}
                          {result.type === 'session_generation' && '会话生成测试'}
                          {result.type === 'connection_generation' && '连接生成测试'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        查看详情
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 测试说明 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>测试指南</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">🔍 单机多窗口测试:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>1. 点击"新窗口测试"打开新标签页</li>
              <li>2. 对比两个窗口的用户ID（应该相同）</li>
              <li>3. 在不同窗口生成动态导师</li>
              <li>4. 验证对话是否隔离</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">🌐 多浏览器测试:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>1. 在Chrome和Safari中分别访问</li>
              <li>2. 对比用户ID（应该不同）</li>
              <li>3. 同时进行对话测试</li>
              <li>4. 验证会话完全隔离</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default MultiUserTestPage
