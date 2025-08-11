import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Activity, 
  MessageSquare, 
  Clock, 
  UserCheck,
  Settings,
  Trash2,
  RefreshCw,
  BarChart3,
  Crown
} from 'lucide-react'
import { userManager } from '../utils/userManager'
import { API_CONFIG } from '../config/api'

interface SystemStats {
  total_users: number
  active_users: number
  total_sessions: number
  active_connections: number
  total_messages: number
  uptime: string
}

interface UserSession {
  session_id: string
  topic?: string
  created_at: string
  last_active_at: string
  is_active: boolean
  message_count: number
  selected_mentors: string[]
  dynamic_mentors: string[]
}

const UserManagementPanel: React.FC = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [userSessions, setUserSessions] = useState<UserSession[]>([])
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currentUser = userManager.getCurrentUser()
  const userStats = userManager.getUserStats()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 获取系统统计
      const statsResponse = await fetch(`${API_CONFIG.getHttpBaseUrl()}/users/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setSystemStats(statsData.stats)
      }

      // 获取活跃用户
      const activeResponse = await fetch(`${API_CONFIG.getHttpBaseUrl()}/users/active`)
      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        setActiveUsers(activeData.active_users)
      }

      // 获取当前用户会话
      const sessionsResponse = await fetch(`${API_CONFIG.getHttpBaseUrl()}/users/${currentUser.id}/sessions`)
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        setUserSessions(sessionsData.sessions)
      }

    } catch (err: any) {
      console.error('加载数据失败:', err)
      setError('加载数据失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/users/cleanup`, {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('清理完成')
        loadData()
      } else {
        alert('清理失败')
      }
    } catch (err) {
      alert('清理失败')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('确定要删除这个会话吗？')) {
      return
    }

    try {
      const response = await fetch(
        `${API_CONFIG.getHttpBaseUrl()}/users/${currentUser.id}/sessions/${sessionId}`,
        { method: 'DELETE' }
      )
      
      if (response.ok) {
        alert('会话已删除')
        loadData()
      } else {
        alert('删除失败')
      }
    } catch (err) {
      alert('删除失败')
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>加载中...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">多用户管理面板</h1>
        <p className="text-gray-600">系统状态监控和用户会话管理</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* 当前用户信息 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{userStats.nickname}</h2>
              <p className="text-blue-100">用户ID: {userStats.userId}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">账户年龄</p>
            <p className="font-semibold">{userStats.accountAge}</p>
          </div>
        </div>
      </motion.div>

      {/* 系统统计 */}
      {systemStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-4 rounded-lg border border-gray-200 text-center"
          >
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{systemStats.total_users}</p>
            <p className="text-sm text-gray-600">总用户数</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 rounded-lg border border-gray-200 text-center"
          >
            <UserCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{systemStats.active_users}</p>
            <p className="text-sm text-gray-600">活跃用户</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-lg border border-gray-200 text-center"
          >
            <Activity className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{systemStats.active_connections}</p>
            <p className="text-sm text-gray-600">活跃连接</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-4 rounded-lg border border-gray-200 text-center"
          >
            <BarChart3 className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{systemStats.total_sessions}</p>
            <p className="text-sm text-gray-600">总会话数</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-4 rounded-lg border border-gray-200 text-center"
          >
            <MessageSquare className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{systemStats.total_messages}</p>
            <p className="text-sm text-gray-600">总消息数</p>
          </motion.div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>刷新数据</span>
        </button>
        
        <button
          onClick={handleCleanup}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>清理会话</span>
        </button>
      </div>

      {/* 我的会话列表 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">我的会话记录</h3>
          <p className="text-gray-600">管理您的对话会话</p>
        </div>

        <div className="divide-y divide-gray-200">
          {userSessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              暂无会话记录
            </div>
          ) : (
            userSessions.map((session, index) => (
              <motion.div 
                key={session.session_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <h4 className="font-medium text-gray-900">
                        {session.topic || '未知主题'}
                      </h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {session.message_count} 条消息
                      </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>创建: {formatDate(session.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Activity className="w-4 h-4" />
                        <span>最后活跃: {formatDate(session.last_active_at)}</span>
                      </div>
                    </div>

                    {(session.selected_mentors.length > 0 || session.dynamic_mentors.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {session.selected_mentors.map(mentor => (
                          <span key={mentor} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {mentor}
                          </span>
                        ))}
                        {session.dynamic_mentors.map(mentor => (
                          <span key={mentor} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            动态: {mentor}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteSession(session.session_id)}
                    className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除会话"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* 活跃用户列表 */}
      {activeUsers.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">当前活跃用户</h3>
            <p className="text-gray-600">系统中的其他在线用户</p>
          </div>

          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {activeUsers.map((userId, index) => (
                <motion.span 
                  key={userId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    userId === currentUser.id 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {userId === currentUser.id ? `${userId} (您)` : userId}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default UserManagementPanel
