import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Sparkles, User, BookOpen, Target, Brain } from 'lucide-react'
import { CustomMentorForm as CustomMentorFormType, Mentor } from '../types/mentor'
import { MENTOR_TEMPLATES, assignMentorColor, generateAvatarUrl } from '../config/mentors'

interface CustomMentorFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (mentor: Mentor) => void
  existingMentors: Mentor[]
}

const CustomMentorForm: React.FC<CustomMentorFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingMentors
}) => {
  const [formData, setFormData] = useState<CustomMentorFormType>({
    name: '',
    title: '',
    description: '',
    expertise: [],
    investmentStyle: '',
    personalityTraits: [],
    background: ''
  })

  const [newExpertise, setNewExpertise] = useState('')
  const [newTrait, setNewTrait] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.title.trim() || !formData.description.trim()) {
      alert('请填写必填字段')
      return
    }

    const newMentor: Mentor = {
      id: `custom-${Date.now()}`,
      name: formData.name.trim(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      expertise: formData.expertise,
      avatar: generateAvatarUrl(formData.name),
      color: assignMentorColor(existingMentors),
      personalityTraits: formData.personalityTraits,
      investmentStyle: formData.investmentStyle || '综合投资',
      famousQuotes: [],
      isCustom: true,
      background: formData.background
    }

    onSubmit(newMentor)
    handleReset()
    onClose()
  }

  const handleReset = () => {
    setFormData({
      name: '',
      title: '',
      description: '',
      expertise: [],
      investmentStyle: '',
      personalityTraits: [],
      background: ''
    })
    setNewExpertise('')
    setNewTrait('')
  }

  const addExpertise = (skill: string) => {
    if (skill.trim() && !formData.expertise.includes(skill.trim())) {
      setFormData(prev => ({
        ...prev,
        expertise: [...prev.expertise, skill.trim()]
      }))
    }
  }

  const removeExpertise = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.filter(s => s !== skill)
    }))
  }

  const addTrait = (trait: string) => {
    if (trait.trim() && !formData.personalityTraits.includes(trait.trim())) {
      setFormData(prev => ({
        ...prev,
        personalityTraits: [...prev.personalityTraits, trait.trim()]
      }))
    }
  }

  const removeTrait = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personalityTraits: prev.personalityTraits.filter(t => t !== trait)
    }))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">创建自定义导师</h2>
                <p className="text-sm text-gray-600">设计您专属的投资顾问</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <User className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="例如：约翰·博格"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    职位/头衔 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="例如：先锋集团创始人"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  投资风格
                </label>
                <select
                  value={formData.investmentStyle}
                  onChange={(e) => setFormData(prev => ({ ...prev, investmentStyle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">选择投资风格</option>
                  {MENTOR_TEMPLATES.investmentStyles.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  简介 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="用一段话描述这位导师的投资理念和特色..."
                />
              </div>
            </div>

            {/* 专业领域 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Target className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">专业领域</h3>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {formData.expertise.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeExpertise(skill)}
                      className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addExpertise(newExpertise)
                      setNewExpertise('')
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="添加专业领域，按回车确认"
                />
                <button
                  type="button"
                  onClick={() => {
                    addExpertise(newExpertise)
                    setNewExpertise('')
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MENTOR_TEMPLATES.expertise.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addExpertise(skill)}
                    disabled={formData.expertise.includes(skill)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      formData.expertise.includes(skill)
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* 性格特点 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Brain className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">性格特点</h3>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {formData.personalityTraits.map((trait, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    <span>{trait}</span>
                    <button
                      type="button"
                      onClick={() => removeTrait(trait)}
                      className="ml-1 p-0.5 hover:bg-purple-200 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTrait(newTrait)
                      setNewTrait('')
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="添加性格特点，按回车确认"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTrait(newTrait)
                    setNewTrait('')
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {MENTOR_TEMPLATES.personalityTraits.map(trait => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => addTrait(trait)}
                    disabled={formData.personalityTraits.includes(trait)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      formData.personalityTraits.includes(trait)
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            {/* 背景介绍（可选） */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <BookOpen className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">背景介绍（可选）</h3>
              </div>

              <textarea
                value={formData.background}
                onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="详细介绍这位导师的背景、经历、成就等..."
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                创建导师
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CustomMentorForm
