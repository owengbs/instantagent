/**
 * 动态导师信息传递测试组件
 */
import React, { useState } from 'react'
import { useMentors } from '../hooks/useMentors'

export const DynamicMentorTest: React.FC = () => {
  const {
    getMentors,
    getEnabledMentors,
    fetchAllMentors,
    fetchEnabledMentors,
    loading,
    error
  } = useMentors()

  const [testResult, setTestResult] = useState<string>('')

  const runTest = async () => {
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
        krugmanInfo: allMentors.find(m => m.id === 'krugman'),
        allMentors: allMentors.map(m => ({
          id: m.id,
          name: m.name,
          title: m.title,
          enabled: m.enabled
        }))
      }
      
      setTestResult(JSON.stringify(result, null, 2))
      console.log('✅ 动态导师信息传递测试成功:', result)
    } catch (error) {
      setTestResult(`测试失败: ${error}`)
      console.error('❌ 动态导师信息传递测试失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-800">加载失败</h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">动态导师信息传递测试</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">测试说明</h2>
        <p className="text-blue-800 mb-4">
          这个测试验证动态导师信息传递功能是否正常工作：
        </p>
        <ul className="text-blue-800 list-disc list-inside space-y-2">
          <li>从后端API获取最新的导师信息</li>
          <li>验证克鲁格曼导师是否正确添加</li>
          <li>检查导师信息的完整性</li>
          <li>验证启用/禁用状态</li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">测试结果</h2>
          <button
            onClick={runTest}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            运行测试
          </button>
        </div>

        {testResult && (
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">测试结果:</h3>
            <pre className="text-xs overflow-auto max-h-96 bg-white border border-gray-200 rounded p-3">
              {testResult}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">当前导师列表</h3>
          <div className="space-y-2">
            {getMentors().map(mentor => (
              <div key={mentor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{mentor.name}</span>
                  <span className="text-sm text-gray-500 ml-2">({mentor.id})</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  mentor.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {mentor.enabled ? '启用' : '禁用'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API端点测试</h3>
          <div className="space-y-3">
            <a 
              href="http://localhost:8000/api/mentors/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
            >
              获取所有导师信息
            </a>
            <a 
              href="http://localhost:8000/api/mentors/enabled" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block px-4 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
            >
              获取启用的导师信息
            </a>
            <a 
              href="http://localhost:8000/api/mentors/stats/summary" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block px-4 py-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
            >
              获取导师统计信息
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
