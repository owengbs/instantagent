import React, { useState, useEffect } from 'react'
import API_CONFIG from '../config/api'

const WebSocketTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('未连接')
  const [wsUrl, setWsUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    // 显示当前配置
    const httpUrl = API_CONFIG.getHttpBaseUrl()
    const wsUrl = API_CONFIG.getWsBaseUrl()
    const host = API_CONFIG.getHost()
    
    setWsUrl(wsUrl)
    addLog(`HTTP Base URL: ${httpUrl}`)
    addLog(`WebSocket Base URL: ${wsUrl}`)
    addLog(`Host: ${host}`)
    addLog(`User Agent: ${navigator.userAgent}`)
    addLog(`Location: ${window.location.href}`)
  }, [])

  const testWebSocket = async () => {
    try {
      setConnectionStatus('连接中...')
      setError('')
      addLog('开始测试WebSocket连接...')

      const testUrl = `${wsUrl}/realtime/ws/test_${Date.now()}`
      addLog(`尝试连接: ${testUrl}`)

      const ws = new WebSocket(testUrl)

      ws.onopen = () => {
        setConnectionStatus('连接成功')
        addLog('✅ WebSocket连接成功')
        ws.close()
      }

      ws.onerror = (error) => {
        setConnectionStatus('连接失败')
        setError('WebSocket连接错误')
        addLog(`❌ WebSocket连接错误: ${error}`)
      }

      ws.onclose = () => {
        addLog('WebSocket连接已关闭')
      }

      // 5秒超时
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          setConnectionStatus('连接超时')
          setError('连接超时')
          addLog('⏰ 连接超时')
        }
      }, 5000)

    } catch (err) {
      setConnectionStatus('连接失败')
      setError(`连接异常: ${err}`)
      addLog(`❌ 连接异常: ${err}`)
    }
  }

  const testHttp = async () => {
    try {
      addLog('开始测试HTTP连接...')
      const httpUrl = API_CONFIG.getHttpBaseUrl()
      const response = await fetch(`${httpUrl}/api/health`, { 
        method: 'GET',
        mode: 'cors'
      })
      
      if (response.ok) {
        addLog('✅ HTTP连接成功')
      } else {
        addLog(`⚠️ HTTP连接异常: ${response.status}`)
      }
    } catch (err) {
      addLog(`❌ HTTP连接失败: ${err}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">WebSocket连接测试</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">当前配置</h3>
          <p><strong>HTTP:</strong> {API_CONFIG.getHttpBaseUrl()}</p>
          <p><strong>WebSocket:</strong> {wsUrl}</p>
          <p><strong>Host:</strong> {API_CONFIG.getHost()}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">连接状态</h3>
          <p><strong>状态:</strong> {connectionStatus}</p>
          {error && <p className="text-red-600"><strong>错误:</strong> {error}</p>}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={testWebSocket}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          测试WebSocket
        </button>
        <button
          onClick={testHttp}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          测试HTTP
        </button>
        <button
          onClick={clearLogs}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          清空日志
        </button>
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
        <h3 className="font-semibold mb-2 text-white">连接日志</h3>
        <div className="max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">故障排除提示</h3>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• 确保手机和电脑在同一个WiFi网络下</li>
          <li>• 检查防火墙是否阻止了8000端口</li>
          <li>• 验证后端服务是否正常运行</li>
          <li>• 如果使用内网穿透，确保配置正确</li>
        </ul>
      </div>
    </div>
  )
}

export default WebSocketTest
