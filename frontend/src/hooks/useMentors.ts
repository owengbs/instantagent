/**
 * 导师信息管理Hook
 * 支持从后端动态获取导师信息
 */
import { useState, useEffect, useCallback } from 'react'
import { Mentor } from '../types/mentor'
import { API_CONFIG } from '../config/api'

interface MentorInfo {
  agent_id: string
  name: string
  title: string
  description: string
  voice: string
  expertise: string[]
  personality_traits: string[]
  investment_style: string
  famous_quotes: string[]
  color: string
  avatar: string
  enabled: boolean
  priority: number
  registered_at: string
}

interface MentorConfig {
  agent_id: string
  name: string
  description: string
  priority: number
  enabled: boolean
  voice: string
}

interface MentorsSummary {
  total_mentors: number
  enabled_mentors: number
  disabled_mentors: number
  enabled_ratio: number
  style_distribution: Record<string, number>
  priority_distribution: Record<string, number>
  last_updated: string
}

interface ExpertiseTemplates {
  available_expertise: string[]
  popular_expertise: string[]
  expertise_categories: Record<string, string[]>
}

interface PersonalityTemplates {
  available_traits: string[]
  personality_categories: Record<string, string[]>
}

export const useMentors = () => {
  const [mentors, setMentors] = useState<MentorInfo[]>([])
  const [enabledMentors, setEnabledMentors] = useState<MentorInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<MentorsSummary | null>(null)
  const [expertiseTemplates, setExpertiseTemplates] = useState<ExpertiseTemplates | null>(null)
  const [personalityTemplates, setPersonalityTemplates] = useState<PersonalityTemplates | null>(null)

  // 获取所有导师信息
  const fetchAllMentors = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setMentors(data)
      console.log('✅ 获取所有导师信息成功:', data.length, '个导师')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取导师信息失败'
      setError(errorMessage)
      console.error('❌ 获取所有导师信息失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取启用的导师信息
  const fetchEnabledMentors = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/enabled`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setEnabledMentors(data)
      console.log('✅ 获取启用的导师信息成功:', data.length, '个导师')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取启用的导师信息失败'
      setError(errorMessage)
      console.error('❌ 获取启用的导师信息失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取导师统计摘要
  const fetchMentorsSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/stats/summary`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setSummary(data)
      console.log('✅ 获取导师统计摘要成功:', data)
    } catch (err) {
      console.error('❌ 获取导师统计摘要失败:', err)
    }
  }, [])

  // 获取专业领域模板
  const fetchExpertiseTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/templates/expertise`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setExpertiseTemplates(data)
      console.log('✅ 获取专业领域模板成功:', data)
    } catch (err) {
      console.error('❌ 获取专业领域模板失败:', err)
    }
  }, [])

  // 获取性格特征模板
  const fetchPersonalityTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/templates/personality`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setPersonalityTemplates(data)
      console.log('✅ 获取性格特征模板成功:', data)
    } catch (err) {
      console.error('❌ 获取性格特征模板失败:', err)
    }
  }, [])

  // 获取单个导师信息
  const fetchMentorById = useCallback(async (agentId: string): Promise<MentorInfo | null> => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/${agentId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('✅ 获取导师信息成功:', agentId, data)
      return data
    } catch (err) {
      console.error('❌ 获取导师信息失败:', agentId, err)
      return null
    }
  }, [])

  // 获取导师配置
  const fetchMentorConfig = useCallback(async (agentId: string): Promise<MentorConfig | null> => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/${agentId}/config`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('✅ 获取导师配置成功:', agentId, data)
      return data
    } catch (err) {
      console.error('❌ 获取导师配置失败:', agentId, err)
      return null
    }
  }, [])

  // 更新导师配置
  const updateMentorConfig = useCallback(async (
    agentId: string, 
    updates: Partial<MentorConfig>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/${agentId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('✅ 更新导师配置成功:', agentId, data)
      
      // 重新获取导师信息
      await fetchAllMentors()
      await fetchEnabledMentors()
      
      return true
    } catch (err) {
      console.error('❌ 更新导师配置失败:', agentId, err)
      return false
    }
  }, [fetchAllMentors, fetchEnabledMentors])

  // 启用导师
  const enableMentor = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/${agentId}/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('✅ 启用导师成功:', agentId, data)
      
      // 重新获取导师信息
      await fetchAllMentors()
      await fetchEnabledMentors()
      
      return true
    } catch (err) {
      console.error('❌ 启用导师失败:', agentId, err)
      return false
    }
  }, [fetchAllMentors, fetchEnabledMentors])

  // 禁用导师
  const disableMentor = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_CONFIG.getHttpBaseUrl()}/api/mentors/${agentId}/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('✅ 禁用导师成功:', agentId, data)
      
      // 重新获取导师信息
      await fetchAllMentors()
      await fetchEnabledMentors()
      
      return true
    } catch (err) {
      console.error('❌ 禁用导师失败:', agentId, err)
      return false
    }
  }, [fetchAllMentors, fetchEnabledMentors])

  // 将后端导师信息转换为前端Mentor格式
  const convertToMentor = useCallback((mentorInfo: MentorInfo): Mentor => {
    return {
      id: mentorInfo.agent_id,
      name: mentorInfo.name,
      title: mentorInfo.title,
      description: mentorInfo.description,
      expertise: mentorInfo.expertise,
      avatar: mentorInfo.avatar,
      color: mentorInfo.color,
      personalityTraits: mentorInfo.personality_traits,
      investmentStyle: mentorInfo.investment_style,
      famousQuotes: mentorInfo.famous_quotes,
      background: mentorInfo.description, // 使用description作为background
      voice: mentorInfo.voice,
      enabled: mentorInfo.enabled,
      priority: mentorInfo.priority
    }
  }, [])

  // 获取转换后的导师列表
  const getMentors = useCallback((): Mentor[] => {
    return mentors.map(convertToMentor)
  }, [mentors, convertToMentor])

  // 获取转换后的启用导师列表
  const getEnabledMentors = useCallback((): Mentor[] => {
    return enabledMentors.map(convertToMentor)
  }, [enabledMentors, convertToMentor])

  // 根据ID获取导师
  const getMentorById = useCallback((id: string): Mentor | undefined => {
    const mentorInfo = mentors.find(m => m.agent_id === id)
    return mentorInfo ? convertToMentor(mentorInfo) : undefined
  }, [mentors, convertToMentor])

  // 根据ID获取启用的导师
  const getEnabledMentorById = useCallback((id: string): Mentor | undefined => {
    const mentorInfo = enabledMentors.find(m => m.agent_id === id)
    return mentorInfo ? convertToMentor(mentorInfo) : undefined
  }, [enabledMentors, convertToMentor])

  // 初始化时获取数据
  useEffect(() => {
    fetchAllMentors()
    fetchEnabledMentors()
    fetchMentorsSummary()
    fetchExpertiseTemplates()
    fetchPersonalityTemplates()
  }, [fetchAllMentors, fetchEnabledMentors, fetchMentorsSummary, fetchExpertiseTemplates, fetchPersonalityTemplates])

  return {
    // 状态
    mentors,
    enabledMentors,
    loading,
    error,
    summary,
    expertiseTemplates,
    personalityTemplates,
    
    // 转换后的数据
    getMentors,
    getEnabledMentors,
    getMentorById,
    getEnabledMentorById,
    
    // 操作方法
    fetchAllMentors,
    fetchEnabledMentors,
    fetchMentorsSummary,
    fetchExpertiseTemplates,
    fetchPersonalityTemplates,
    fetchMentorById,
    fetchMentorConfig,
    updateMentorConfig,
    enableMentor,
    disableMentor,
    
    // 工具方法
    convertToMentor
  }
}
