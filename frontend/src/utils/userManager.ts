/**
 * 用户管理器 - 多用户支持
 * 负责用户身份识别、会话管理和状态隔离
 */

import { v4 as uuidv4 } from 'uuid'

export interface UserInfo {
  id: string
  nickname?: string
  avatar?: string
  createdAt: string
  lastActiveAt: string
}

export interface UserSession {
  sessionId: string
  userId: string
  topic?: string
  createdAt: string
  isActive: boolean
}

class UserManager {
  private static instance: UserManager
  private currentUser: UserInfo | null = null
  private currentSession: UserSession | null = null

  private constructor() {
    this.loadUserFromStorage()
  }

  static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager()
    }
    return UserManager.instance
  }

  /**
   * 获取或创建当前用户
   */
  getCurrentUser(): UserInfo {
    if (!this.currentUser) {
      this.currentUser = this.createNewUser()
      this.saveUserToStorage()
    }
    
    // 更新最后活跃时间
    this.currentUser.lastActiveAt = new Date().toISOString()
    this.saveUserToStorage()
    
    return this.currentUser
  }

  /**
   * 创建新用户
   */
  private createNewUser(): UserInfo {
    const userId = uuidv4()
    const now = new Date().toISOString()
    
    return {
      id: userId,
      nickname: `用户${userId.slice(0, 8)}`,
      createdAt: now,
      lastActiveAt: now
    }
  }

  /**
   * 更新用户信息
   */
  updateUser(updates: Partial<UserInfo>): void {
    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        ...updates,
        lastActiveAt: new Date().toISOString()
      }
      this.saveUserToStorage()
    }
  }

  /**
   * 创建新会话
   */
  createSession(topic?: string): UserSession {
    const user = this.getCurrentUser()
    const sessionId = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    this.currentSession = {
      sessionId,
      userId: user.id,
      topic,
      createdAt: new Date().toISOString(),
      isActive: true
    }
    
    this.saveSessionToStorage()
    return this.currentSession
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession
  }

  /**
   * 设置当前会话
   */
  setCurrentSession(session: UserSession): void {
    this.currentSession = session
    this.saveSessionToStorage()
  }

  /**
   * 结束当前会话
   */
  endCurrentSession(): void {
    if (this.currentSession) {
      this.currentSession.isActive = false
      this.saveSessionToStorage()
      this.currentSession = null
    }
  }

  /**
   * 生成用户专属的WebSocket连接ID
   * 对于动态会话，直接使用sessionId作为连接ID
   * 对于普通会话，使用 user.id_session 格式
   */
  generateConnectionId(sessionId?: string): string {
    const user = this.getCurrentUser()
    const session = sessionId || this.currentSession?.sessionId || 'default'
    
    // 如果是动态会话（包含_msg_），直接使用sessionId
    if (this.isDynamicSession(session)) {
      console.log('🔗 动态会话，直接使用sessionId作为连接ID:', session)
      return session
    }
    
    // 普通会话使用复合格式
    const connectionId = `${user.id}_${session}`
    console.log('🔗 普通会话，使用复合连接ID:', connectionId)
    return connectionId
  }

  /**
   * 生成动态导师会话ID
   * 格式：{UUID}_msg_{timestamp}_{suffix}
   * 与后端期望的格式保持一致
   */
  generateDynamicSessionId(): string {
    const user = this.getCurrentUser()
    // 生成UUID格式的用户ID
    const userId = user.id || this.generateUUID()
    const timestamp = Date.now()
    const suffix = Math.random().toString(36).slice(2, 10)
    
    // 格式：{UUID}_msg_{timestamp}_{suffix}
    return `${userId}_msg_${timestamp}_${suffix}`
  }

  /**
   * 生成UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * 检查是否为动态导师会话
   * 新格式：{UUID}_msg_{timestamp}_{suffix}
   */
  isDynamicSession(sessionId: string): boolean {
    // 检查是否包含_msg_标识符，这是动态导师会话的特征
    return sessionId.includes('_msg_')
  }

  /**
   * 从sessionId提取用户ID
   */
  extractUserIdFromSession(sessionId: string): string | null {
    const parts = sessionId.split('_')
    if (parts.length >= 2) {
      return parts[1] // 用户ID总是在第二个位置
    }
    return null
  }

  /**
   * 获取用户特定的存储key
   */
  getUserStorageKey(key: string): string {
    const user = this.getCurrentUser()
    return `user_${user.id}_${key}`
  }

  /**
   * 清除用户数据（注销功能）
   */
  clearUserData(): void {
    const user = this.getCurrentUser()
    
    // 清除用户相关的localStorage数据
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes(`user_${user.id}_`)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    localStorage.removeItem('current_user')
    localStorage.removeItem('current_session')
    
    this.currentUser = null
    this.currentSession = null
  }

  /**
   * 从本地存储加载用户信息
   */
  private loadUserFromStorage(): void {
    try {
      const userStr = localStorage.getItem('current_user')
      if (userStr) {
        this.currentUser = JSON.parse(userStr)
      }

      const sessionStr = localStorage.getItem('current_session')
      if (sessionStr) {
        this.currentSession = JSON.parse(sessionStr)
      }
    } catch (error) {
      console.warn('加载用户信息失败:', error)
      this.currentUser = null
      this.currentSession = null
    }
  }

  /**
   * 保存用户信息到本地存储
   */
  private saveUserToStorage(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem('current_user', JSON.stringify(this.currentUser))
      }
    } catch (error) {
      console.warn('保存用户信息失败:', error)
    }
  }

  /**
   * 保存会话信息到本地存储
   */
  private saveSessionToStorage(): void {
    try {
      if (this.currentSession) {
        localStorage.setItem('current_session', JSON.stringify(this.currentSession))
      }
    } catch (error) {
      console.warn('保存会话信息失败:', error)
    }
  }

  /**
   * 获取用户统计信息
   */
  getUserStats(): {
    userId: string
    nickname: string
    accountAge: string
    sessionsToday: number
  } {
    const user = this.getCurrentUser()
    const accountAge = this.getAccountAge(user.createdAt)
    
    return {
      userId: user.id,
      nickname: user.nickname || '未设置',
      accountAge,
      sessionsToday: this.getTodaySessionCount()
    }
  }

  private getAccountAge(createdAt: string): string {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return '今天注册'
    if (diffDays === 1) return '1天前注册'
    return `${diffDays}天前注册`
  }

  private getTodaySessionCount(): number {
    // 简化实现，实际项目中可能需要更复杂的统计
    const sessions = localStorage.getItem(this.getUserStorageKey('sessions_today'))
    return sessions ? JSON.parse(sessions).length : 0
  }
}

// 导出单例实例
export const userManager = UserManager.getInstance()

// 全局可用（开发调试）
if (typeof window !== 'undefined') {
  (window as any).userManager = userManager
}
