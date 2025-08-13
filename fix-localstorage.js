// localStorage检查和修复脚本
// 在浏览器控制台中运行此脚本

console.log('🔧 localStorage检查和修复工具');
console.log('=' * 50);

// 检查当前会话信息
function checkSessionInfo() {
    console.log('📋 检查当前会话信息:');
    
    const sessionId = localStorage.getItem('dynamicSessionId');
    const topic = localStorage.getItem('dynamicTopic');
    const selectedMentors = localStorage.getItem('selectedMentors');
    
    console.log('   dynamicSessionId:', sessionId || '未设置');
    console.log('   dynamicTopic:', topic || '未设置');
    console.log('   selectedMentors:', selectedMentors || '未设置');
    
    if (!sessionId) {
        console.log('❌ 主要问题：缺少dynamicSessionId');
        return false;
    }
    
    // 检查sessionId格式
    if (sessionId.includes('_msg_')) {
        console.log('✅ sessionId格式正确');
        return true;
    } else {
        console.log('⚠️ sessionId格式可能不正确');
        console.log('💡 期望格式：{UUID}_msg_{timestamp}_{suffix}');
        return false;
    }
}

// 修复sessionId格式
function fixSessionId() {
    console.log('🔧 尝试修复sessionId格式...');
    
    const currentSessionId = localStorage.getItem('dynamicSessionId');
    if (!currentSessionId) {
        console.log('❌ 无法修复：没有找到dynamicSessionId');
        return false;
    }
    
    // 如果已经是正确格式，不需要修复
    if (currentSessionId.includes('_msg_')) {
        console.log('✅ sessionId已经是正确格式，无需修复');
        return true;
    }
    
    // 尝试修复格式
    let newSessionId;
    
    if (currentSessionId.startsWith('dynamic_')) {
        // 旧格式：dynamic_{user.id}_{timestamp}_{random}
        const parts = currentSessionId.split('_');
        if (parts.length >= 4) {
            const userId = parts[1];
            const timestamp = parts[2];
            const suffix = parts[3];
            
            // 转换为新格式：{UUID}_msg_{timestamp}_{suffix}
            newSessionId = `${userId}_msg_${timestamp}_${suffix}`;
            console.log('🔄 从旧格式转换:', currentSessionId, '->', newSessionId);
        }
    } else {
        // 其他格式，生成新的
        const timestamp = Date.now();
        const suffix = Math.random().toString(36).slice(2, 10);
        newSessionId = `${currentSessionId}_msg_${timestamp}_${suffix}`;
        console.log('🔄 生成新格式:', newSessionId);
    }
    
    if (newSessionId) {
        localStorage.setItem('dynamicSessionId', newSessionId);
        console.log('✅ sessionId已修复');
        return true;
    }
    
    return false;
}

// 创建新的测试会话
function createNewSession() {
    console.log('🧪 创建新的测试会话...');
    
    // 生成新的sessionId
    const timestamp = Date.now();
    const suffix = Math.random().toString(36).slice(2, 10);
    const newSessionId = `test-${timestamp}_msg_${timestamp}_${suffix}`;
    
    // 设置localStorage
    localStorage.setItem('dynamicSessionId', newSessionId);
    localStorage.setItem('dynamicTopic', '测试投资议题');
    
    console.log('✅ 新会话已创建:');
    console.log('   sessionId:', newSessionId);
    console.log('   topic: 测试投资议题');
    
    return newSessionId;
}

// 清除所有会话信息
function clearAllSessions() {
    console.log('🗑️ 清除所有会话信息...');
    
    localStorage.removeItem('dynamicSessionId');
    localStorage.removeItem('dynamicTopic');
    localStorage.removeItem('selectedMentors');
    
    console.log('✅ 会话信息已清除');
}

// 主函数
function main() {
    console.log('🔍 开始检查...');
    
    const isHealthy = checkSessionInfo();
    
    if (!isHealthy) {
        console.log('\n🔧 尝试自动修复...');
        const fixed = fixSessionId();
        
        if (!fixed) {
            console.log('\n💡 建议手动修复：');
            console.log('   1. 重新创建动态导师会话');
            console.log('   2. 或者运行 createNewSession() 创建测试会话');
        }
    } else {
        console.log('\n✅ 会话信息正常，无需修复');
    }
    
    console.log('\n📋 可用命令:');
    console.log('   checkSessionInfo() - 检查会话信息');
    console.log('   fixSessionId() - 修复sessionId格式');
    console.log('   createNewSession() - 创建新测试会话');
    console.log('   clearAllSessions() - 清除所有会话');
}

// 运行主函数
main();
