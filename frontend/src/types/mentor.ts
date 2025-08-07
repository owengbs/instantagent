/**
 * 投资导师相关类型定义
 */

export interface Mentor {
  id: string
  name: string
  title: string
  description: string
  expertise: string[]
  avatar: string
  color: string
  personalityTraits: string[]
  investmentStyle: string
  famousQuotes: string[]
  isCustom?: boolean
  background?: string
}

export interface MentorSelection {
  selectedMentors: Mentor[]
  sessionId: string
  createdAt: string
}

export interface CustomMentorForm {
  name: string
  title: string
  description: string
  expertise: string[]
  investmentStyle: string
  personalityTraits: string[]
  background?: string
}
