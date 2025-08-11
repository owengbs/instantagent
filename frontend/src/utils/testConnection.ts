// WebSocket连接测试工具
import { API_CONFIG } from '../config/api'

export async function testWebSocketConnection() {
  console.log('🧪 开始测试WebSocket连接...')
  
  return new Promise((resolve, reject) => {
    const wsUrl = API_CONFIG.endpoints.chatWs('test-session')
    
    console.log('🔗 连接URL:', wsUrl)
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('✅ WebSocket连接成功')
      
      // 发送测试消息
      const testMessage = {
        message: '你好，这是一个测试消息',
        user_id: 'test-user',
        session_id: 'test-session'
      }
      
      console.log('📤 发送测试消息:', testMessage)
      ws.send(JSON.stringify(testMessage))
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 收到消息:', data)
        
        if (data.type === 'response') {
          console.log('🎉 收到AI回复:', data.message)
          ws.close()
          resolve({
            success: true,
            response: data.message
          })
        }
      } catch (error) {
        console.error('❌ 解析消息失败:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket错误:', error)
      reject(error)
    }
    
    ws.onclose = (event) => {
      console.log('🔌 WebSocket连接关闭:', event.code, event.reason)
    }
    
    // 设置超时
    setTimeout(() => {
      if (ws.readyState !== WebSocket.CLOSED) {
        console.log('⏰ 测试超时，关闭连接')
        ws.close()
        reject(new Error('测试超时'))
      }
    }, 10000)
  })
}

// 挂载到全局方便调用
if (typeof window !== 'undefined') {
  (window as any).testWebSocket = testWebSocketConnection
} 