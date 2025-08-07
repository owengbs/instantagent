/**
 * 导师管理组件
 * 支持查看、启用/禁用导师，以及查看导师统计信息
 */
import React, { useState } from 'react'
import { useMentors } from '../hooks/useMentors'
import { Mentor } from '../types/mentor'

interface MentorManagementProps {
  className?: string
}

export const MentorManagement: React.FC<MentorManagementProps> = ({ className = '' }) => {
  const {
    mentors,
    enabledMentors,
    loading,
    error,
    summary,
    getMentors,
    getEnabledMentors,
    enableMentor,
    disableMentor,
    updateMentorConfig,
    fetchAllMentors,
    fetchEnabledMentors
  } = useMentors()

  const [selectedTab, setSelectedTab] = useState<'all' | 'enabled' | 'stats'>('all')
  const [editingMentor, setEditingMentor] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string>('')

  const handleEnableMentor = async (agentId: string) => {
    const success = await enableMentor(agentId)
    if (success) {
      console.log('✅ 导师启用成功:', agentId)
    }
  }

  const handleDisableMentor = async (agentId: string) => {
    const success = await disableMentor(agentId)
    if (success) {
      console.log('✅ 导师禁用成功:', agentId)
    }
  }

  const handleUpdateMentor = async (agentId: string, updates: Partial<Mentor>) => {
    const success = await updateMentorConfig(agentId, {
      name: updates.name,
      description: updates.description,
      priority: updates.priority,
      enabled: updates.enabled,
      voice: updates.voice
    })
    if (success) {
      setEditingMentor(null)
      console.log('✅ 导师配置更新成功:', agentId)
    }
  }

  // 测试动态导师信息传递功能
  const testDynamicMentorInfo = async () => {
    try {
      setTestResult('测试中...')
      
      // 重新获取导师信息
      await fetchAllMentors()
      await fetchEnabledMentors()
      
      const allMentors = getMentors()
      const enabledMentors = getEnabledMentors()
      
      const result = {
        totalMentors: allMentors.length,
        enabledMentors: enabledMentors.length,
        mentorIds: allMentors.map(m => m.id),
        hasKrugman: allMentors.some(m => m.id === 'krugman'),
        krugmanInfo: allMentors.find(m => m.id === 'krugman')
      }
      
      setTestResult(JSON.stringify(result, null, 2))
      console.log('✅ 动态导师信息传递测试成功:', result)
    } catch (error) {
      setTestResult(`测试失败: ${error}`)
      console.error('❌ 动态导师信息传递测试失败:', error)
    }
  }

  const renderMentorCard = (mentor: Mentor) => {
    const isEditing = editingMentor === mentor.id

    return (
      <div key={mentor.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center space-x-4">
          <img 
            src={mentor.avatar} 
            alt={mentor.name}
            className="w-16 h-16 rounded-full border-2 border-gray-200"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">{mentor.name}</h3>
              <span className="px-2 py-1 text-xs font-medium rounded-full"
                    style={{ backgroundColor: mentor.color + '20', color: mentor.color }}>
                {mentor.enabled ? '启用' : '禁用'}
              </span>
            </div>
            <p className="text-sm text-gray-600">{mentor.title}</p>
            <p className="text-sm text-gray-500 mt-1">{mentor.description}</p>
          </div>
          <div className="flex space-x-2">
            {mentor.enabled ? (
              <button
                onClick={() => handleDisableMentor(mentor.id)}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                禁用
              </button>
            ) : (
              <button
                onClick={() => handleEnableMentor(mentor.id)}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                启用
              </button>
            )}
            <button
              onClick={() => setEditingMentor(isEditing ? null : mentor.id)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              {isEditing ? '取消' : '编辑'}
            </button>
          </div>
        </div>

        {isEditing && (
          <MentorEditForm 
            mentor={mentor}
            onSave={(updates) => handleUpdateMentor(mentor.id, updates)}
            onCancel={() => setEditingMentor(null)}
          />
        )}

        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {mentor.expertise.slice(0, 3).map((skill, index) => (
              <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                {skill}
              </span>
            ))}
            {mentor.expertise.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                +{mentor.expertise.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderStats = () => {
    if (!summary) return <div className="text-gray-500">暂无统计数据</div>

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">总导师数</h3>
          <p className="text-3xl font-bold text-blue-600">{summary.total_mentors}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">启用导师</h3>
          <p className="text-3xl font-bold text-green-600">{summary.enabled_mentors}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">禁用导师</h3>
          <p className="text-3xl font-bold text-red-600">{summary.disabled_mentors}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900">启用率</h3>
          <p className="text-3xl font-bold text-purple-600">
            {(summary.enabled_ratio * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载导师信息中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">加载失败</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和标签页 */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">导师管理</h2>
          <div className="flex space-x-1">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              全部导师 ({mentors.length})
            </button>
            <button
              onClick={() => setSelectedTab('enabled')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'enabled'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              启用导师 ({enabledMentors.length})
            </button>
            <button
              onClick={() => setSelectedTab('stats')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'stats'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              统计信息
            </button>
          </div>
        </div>
      </div>

      {/* 测试按钮 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">动态导师信息传递测试</h3>
        <button
          onClick={testDynamicMentorInfo}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          测试动态导师信息传递
        </button>
        {testResult && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">测试结果:</h4>
            <pre className="bg-white border border-gray-200 rounded p-3 text-xs overflow-auto max-h-40">
              {testResult}
            </pre>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="space-y-6">
        {selectedTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getMentors().map(renderMentorCard)}
          </div>
        )}

        {selectedTab === 'enabled' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getEnabledMentors().map(renderMentorCard)}
          </div>
        )}

        {selectedTab === 'stats' && (
          <div className="space-y-6">
            {renderStats()}
            
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">投资风格分布</h3>
                  <div className="space-y-2">
                    {Object.entries(summary.style_distribution).map(([style, count]) => (
                      <div key={style} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{style}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">优先级分布</h3>
                  <div className="space-y-2">
                    {Object.entries(summary.priority_distribution).map(([priority, count]) => (
                      <div key={priority} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">优先级 {priority}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 导师编辑表单组件
interface MentorEditFormProps {
  mentor: Mentor
  onSave: (updates: Partial<Mentor>) => void
  onCancel: () => void
}

const MentorEditForm: React.FC<MentorEditFormProps> = ({ mentor, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: mentor.name,
    description: mentor.description,
    priority: mentor.priority || 1,
    enabled: mentor.enabled,
    voice: mentor.voice || 'Cherry'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">语音</label>
          <select
            value={formData.voice}
            onChange={(e) => setFormData({ ...formData, voice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Cherry">Cherry</option>
            <option value="Ethan">Ethan</option>
            <option value="Chelsie">Chelsie</option>
            <option value="Serena">Serena</option>
            <option value="Dylan">Dylan</option>
            <option value="Jada">Jada</option>
            <option value="Sunny">Sunny</option>
          </select>
        </div>
        
        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">启用导师</span>
          </label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          保存
        </button>
      </div>
    </form>
  )
}
