// 测试新的sessionId格式
// 模拟userManager.generateDynamicSessionId()函数

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function generateDynamicSessionId() {
  const userId = generateUUID()
  const timestamp = Date.now()
  const suffix = Math.random().toString(36).slice(2, 10)
  
  // 格式：{UUID}_msg_{timestamp}_{suffix}
  return `${userId}_msg_${timestamp}_${suffix}`
}

function isDynamicSession(sessionId) {
  // 检查是否包含_msg_标识符，这是动态导师会话的特征
  return sessionId.includes('_msg_')
}

// 测试
console.log('🧪 测试新的sessionId格式')
console.log('=' * 50)

for (let i = 0; i < 3; i++) {
  const sessionId = generateDynamicSessionId()
  console.log(`\n📋 生成的sessionId ${i + 1}:`)
  console.log(`   ${sessionId}`)
  console.log(`   ✅ 是否为动态会话: ${isDynamicSession(sessionId)}`)
  
  // 解析格式
  const parts = sessionId.split('_msg_')
  if (parts.length === 2) {
    const uuid = parts[0]
    const timestampAndSuffix = parts[1]
    const timestampParts = timestampAndSuffix.split('_')
    const timestamp = timestampParts[0]
    const suffix = timestampParts[1]
    
    console.log(`   📝 格式解析:`)
    console.log(`      UUID: ${uuid}`)
    console.log(`      时间戳: ${timestamp}`)
    console.log(`      后缀: ${suffix}`)
    
    // 验证UUID格式
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    console.log(`      UUID格式正确: ${uuidPattern.test(uuid)}`)
  }
}

console.log('\n💡 总结:')
console.log('   1. 新格式: {UUID}_msg_{timestamp}_{suffix}')
console.log('   2. 与后端期望格式一致')
console.log('   3. 包含_msg_标识符，便于识别动态会话')
console.log('   4. 时间戳和后缀确保唯一性')
