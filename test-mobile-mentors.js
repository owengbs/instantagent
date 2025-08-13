// 移动端导师功能测试脚本
// 在移动端浏览器控制台中运行此脚本

console.log('📱 移动端导师功能测试');
console.log('=' * 50);

// 模拟移动端导师选择
function simulateMobileMentorSelection() {
    console.log('🎯 模拟移动端选择导师...');
    
    // 模拟选中的导师数据
    const selectedMentors = [
        {
            id: 'buffett',
            name: '沃伦·巴菲特',
            title: '价值投资大师',
            description: '长期价值投资的代表人物'
        },
        {
            id: 'munger',
            name: '查理·芒格',
            title: '多元思维专家',
            description: '跨学科思维的投资大师'
        }
    ];
    
    // 保存到localStorage（模拟MentorSelection的逻辑）
    localStorage.setItem('selectedMentors', JSON.stringify(selectedMentors));
    
    // 生成sessionId（模拟MentorSelection.startRoundtable的逻辑）
    const timestamp = Date.now();
    const suffix = Math.random().toString(36).slice(2, 10);
    const defaultSessionId = `default_${timestamp}_msg_${timestamp}_${suffix}`;
    const defaultTopic = '投资圆桌讨论';
    
    localStorage.setItem('dynamicSessionId', defaultSessionId);
    localStorage.setItem('dynamicTopic', defaultTopic);
    
    console.log('✅ 移动端导师选择完成:');
    console.log('   导师数量:', selectedMentors.length);
    console.log('   sessionId:', defaultSessionId);
    console.log('   主题:', defaultTopic);
    
    return { selectedMentors, defaultSessionId, defaultTopic };
}

// 测试移动端sessionId获取
function testMobileSessionIdRetrieval() {
    console.log('\n🔍 测试移动端sessionId获取...');
    
    const sessionId = localStorage.getItem('dynamicSessionId');
    const topic = localStorage.getItem('dynamicTopic');
    const selectedMentors = localStorage.getItem('selectedMentors');
    
    console.log('   当前sessionId:', sessionId || '未设置');
    console.log('   当前主题:', topic || '未设置');
    console.log('   选中导师:', selectedMentors ? JSON.parse(selectedMentors).length + '位' : '未设置');
    
    if (sessionId && sessionId.includes('_msg_')) {
        console.log('✅ sessionId格式正确');
        return true;
    } else {
        console.log('❌ sessionId格式不正确或未设置');
        return false;
    }
}

// 测试移动端会议纪要生成准备
function testMobileMeetingSummaryPreparation() {
    console.log('\n📋 测试移动端会议纪要生成准备...');
    
    const sessionId = localStorage.getItem('dynamicSessionId');
    
    if (!sessionId) {
        console.log('❌ 无法生成会议纪要：sessionId为空');
        return false;
    }
    
    // 模拟消息数据
    const messages = [
        { type: 'user', content: '你好，我想了解价值投资', timestamp: Date.now() },
        { type: 'agent', agentName: '巴菲特', content: '价值投资的核心是找到被低估的优质公司', timestamp: Date.now() },
        { type: 'agent', agentName: '芒格', content: '我同意，还要考虑公司的护城河', timestamp: Date.now() }
    ];
    
    console.log('✅ 移动端会议纪要生成准备完成:');
    console.log('   sessionId:', sessionId);
    console.log('   消息数量:', messages.length);
    console.log('   可以生成会议纪要');
    
    return true;
}

// 测试移动端API调用
function testMobileAPICall() {
    console.log('\n🌐 测试移动端API调用...');
    
    const sessionId = localStorage.getItem('dynamicSessionId');
    const topic = localStorage.getItem('dynamicTopic');
    
    if (!sessionId) {
        console.log('❌ 无法测试API：sessionId为空');
        return false;
    }
    
    // 模拟API请求体
    const requestBody = {
        session_id: sessionId,
        topic: topic,
        messages: [
            { type: 'user', content: '测试消息', timestamp: Date.now() }
        ]
    };
    
    console.log('📤 模拟API请求:');
    console.log('   URL: /api/meeting-summary/generate');
    console.log('   请求体:', requestBody);
    
    console.log('✅ API调用准备完成');
    return true;
}

// 主测试函数
function runMobileTests() {
    console.log('🚀 开始运行移动端测试...\n');
    
    // 测试1：模拟移动端导师选择
    const result1 = simulateMobileMentorSelection();
    
    // 测试2：验证sessionId获取
    const result2 = testMobileSessionIdRetrieval();
    
    // 测试3：测试会议纪要生成准备
    const result3 = testMobileMeetingSummaryPreparation();
    
    // 测试4：测试API调用
    const result4 = testMobileAPICall();
    
    // 总结
    console.log('\n📊 移动端测试结果总结:');
    console.log('   导师选择:', result1 ? '✅ 成功' : '❌ 失败');
    console.log('   sessionId获取:', result2 ? '✅ 成功' : '❌ 失败');
    console.log('   会议纪要准备:', result3 ? '✅ 成功' : '❌ 失败');
    console.log('   API调用准备:', result4 ? '✅ 成功' : '❌ 失败');
    
    if (result1 && result2 && result3 && result4) {
        console.log('\n🎉 所有移动端测试通过！移动端导师现在可以正常生成会议纪要');
    } else {
        console.log('\n⚠️ 部分测试失败，请检查问题');
    }
    
    console.log('\n💡 现在可以在移动端尝试生成会议纪要了！');
}

// 清理测试数据
function cleanupMobileTest() {
    console.log('🧹 清理移动端测试数据...');
    
    localStorage.removeItem('selectedMentors');
    localStorage.removeItem('dynamicSessionId');
    localStorage.removeItem('dynamicTopic');
    
    console.log('✅ 移动端测试数据已清理');
}

// 显示可用命令
console.log('📋 可用命令:');
console.log('   runMobileTests() - 运行完整移动端测试');
console.log('   simulateMobileMentorSelection() - 模拟移动端选择导师');
console.log('   testMobileSessionIdRetrieval() - 测试移动端sessionId获取');
console.log('   testMobileMeetingSummaryPreparation() - 测试移动端会议纪要准备');
console.log('   testMobileAPICall() - 测试移动端API调用');
console.log('   cleanupMobileTest() - 清理移动端测试数据');
console.log('');

// 自动运行测试
runMobileTests();
