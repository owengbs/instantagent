import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { runCompleteVoiceTest, detectVoiceCapabilities } from '../utils/voiceTest'
import { quickVoiceCheck } from '../utils/debugVoice'
import { testWebSocketConnection } from '../utils/testConnection'
import { testDirectSpeechSynthesis } from '../utils/speechTest'
import { Mic, MicOff, Volume2, VolumeX, TestTube, Play, Stethoscope, Zap } from 'lucide-react'

const VoiceTest: React.FC = () => {
  const [testText, setTestText] = useState('您好，这是语音合成测试。投资大师圆桌会议系统已经准备就绪！')
  const [voiceTestResult, setVoiceTestResult] = useState<any>(null)
  const [isRunningTest, setIsRunningTest] = useState(false)
  
  // 语音识别
  const {
    isSupported: recognitionSupported,
    isListening,
    finalTranscript,
    interimTranscript,
    error: recognitionError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    language: 'zh-CN',
    continuous: false,
    interimResults: true
  })

  // 语音合成
  const {
    isSupported: synthesisSupported,
    isSpeaking,
    speak,
    stop: stopSpeaking,
    voices,
    error: synthesisError
  } = useSpeechSynthesis({
    rate: 1,
    pitch: 1,
    volume: 1,
    language: 'zh-CN'
  })

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  const handleSpeakClick = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else {
      speak(testText)
    }
  }

  const currentTranscript = finalTranscript + interimTranscript

  // 运行完整语音测试
  const runFullTest = async () => {
    if (isRunningTest) return
    
    setIsRunningTest(true)
    setVoiceTestResult(null)
    
    try {
      console.log('🚀 开始运行完整语音功能测试...')
      const result = await runCompleteVoiceTest()
      setVoiceTestResult(result)
    } catch (error) {
      console.error('测试运行失败:', error)
      setVoiceTestResult({
        error: `测试运行失败: ${error}`,
        capabilities: detectVoiceCapabilities()
      })
    } finally {
      setIsRunningTest(false)
    }
  }

  // 快速检查功能
  const runQuickCheck = async () => {
    console.log('🔄 运行快速语音功能检查...')
    await quickVoiceCheck()
  }

  // WebSocket连接测试
  const runConnectionTest = async () => {
    console.log('🔄 运行WebSocket连接测试...')
    try {
      const result = await testWebSocketConnection()
      console.log('✅ 连接测试成功:', result)
      alert(`✅ 连接测试成功！收到回复: ${(result as any).response}`)
    } catch (error) {
      console.error('❌ 连接测试失败:', error)
      alert(`❌ 连接测试失败: ${error}`)
    }
  }

  // 深度语音诊断
  const runSpeechDiagnosis = async () => {
    console.log('🏥 运行深度语音诊断...')
    try {
      // 动态导入以避免打包错误
      const { runFullSpeechDiagnosis } = await import('../utils/speechDiagnostics')
      const result = await runFullSpeechDiagnosis()
      
      const summary = [
        `浏览器支持: ${result.diagnostics.browserSupport ? '✅' : '❌'}`,
        `可用语音: ${result.diagnostics.voicesAvailable}个`,
        `中文语音: ${result.diagnostics.chineseVoices}个`,
        `播放测试: ${result.playbackTest.success ? '✅' : '❌'}`,
        `自动播放策略: ${result.diagnostics.autoplayPolicy}`,
        '',
        '建议:',
        ...result.recommendations
      ].join('\n')
      
      alert(`🏥 语音诊断报告:\n\n${summary}`)
    } catch (error) {
      console.error('❌ 语音诊断失败:', error)
      alert(`❌ 语音诊断失败: ${error}`)
    }
  }

  // 直接语音测试
  const runDirectSpeechTest = async () => {
    console.log('⚡ 运行直接语音合成测试...')
    try {
      const result = await testDirectSpeechSynthesis('你好，这是直接语音合成测试')
      
      const summary = [
        `测试结果: ${result.success ? '✅ 成功' : '❌ 失败'}`,
        `持续时间: ${result.duration}ms`,
        `事件序列: ${result.events.join(' → ')}`,
        '',
        '浏览器状态变化:',
        ...result.browserStates.map(state => 
          `${state.timestamp}ms: ${state.label} (speaking:${state.speaking}, pending:${state.pending})`
        )
      ].join('\n')
      
      alert(`⚡ 直接语音测试报告:\n\n${summary}`)
    } catch (error) {
      console.error('❌ 直接语音测试失败:', error)
      alert(`❌ 直接语音测试失败: ${error}`)
    }
  }

  // 组件加载时自动检测基本功能
  useEffect(() => {
    const capabilities = detectVoiceCapabilities()
    console.log('🔍 语音功能基本检测:', capabilities)
    
    // 自动运行快速检查
    setTimeout(() => {
      quickVoiceCheck()
    }, 1000)
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center space-x-2 mb-6">
        <TestTube className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-800">语音功能测试</h2>
      </div>

      {/* 支持状态 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${recognitionSupported ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className="font-medium text-gray-800 mb-2">语音识别</h3>
          <div className={`flex items-center space-x-2 ${recognitionSupported ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-3 h-3 rounded-full ${recognitionSupported ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{recognitionSupported ? '支持' : '不支持'}</span>
          </div>
        </div>

        <div className={`p-4 rounded-lg ${synthesisSupported ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className="font-medium text-gray-800 mb-2">语音合成</h3>
          <div className={`flex items-center space-x-2 ${synthesisSupported ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-3 h-3 rounded-full ${synthesisSupported ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{synthesisSupported ? '支持' : '不支持'}</span>
          </div>
          {synthesisSupported && (
            <p className="text-xs text-gray-500 mt-1">可用语音: {voices.length}</p>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {(recognitionError || synthesisError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">
            ⚠️ {recognitionError || synthesisError}
          </p>
        </div>
      )}

      {/* 语音识别测试 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">语音识别测试</h3>
        
        <div className="flex items-center justify-center mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMicClick}
            disabled={!recognitionSupported}
            className={`p-6 rounded-full transition-all duration-200 ${
              isListening 
                ? 'bg-red-500 text-white shadow-xl scale-110 mic-pulse' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </motion.button>
        </div>

        <div className="text-center mb-4">
          <span className={`text-sm font-medium ${
            isListening ? 'text-red-600' : 'text-gray-600'
          }`}>
            {isListening ? '正在听取您的话语...' : '点击麦克风开始录音'}
          </span>
        </div>

        {/* 识别结果 */}
        {currentTranscript && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">识别结果：</h4>
            <p className="text-gray-800">
              {finalTranscript}
              <span className="text-gray-400">{interimTranscript}</span>
            </p>
          </div>
        )}
      </div>

      {/* 语音合成测试 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">语音合成测试</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            测试文本：
          </label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="输入要合成的文本..."
          />
        </div>

        <div className="flex items-center justify-center mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSpeakClick}
            disabled={!synthesisSupported || !testText.trim()}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
              isSpeaking 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span>{isSpeaking ? '停止播放' : '开始播放'}</span>
          </motion.button>
        </div>

        <div className="text-center">
          <span className={`text-sm font-medium ${
            isSpeaking ? 'text-green-600' : 'text-gray-600'
          }`}>
            {isSpeaking ? '正在播放语音...' : '点击按钮测试语音合成'}
          </span>
        </div>
      </div>

      {/* 快速检查 */}
      <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-orange-800">快速故障排查</h4>
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={runQuickCheck}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 text-sm"
            >
              <TestTube className="w-4 h-4" />
              <span>语音检查</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={runConnectionTest}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 text-sm"
            >
              <TestTube className="w-4 h-4" />
              <span>连接测试</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={runSpeechDiagnosis}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 text-sm"
            >
              <Stethoscope className="w-4 h-4" />
              <span>深度诊断</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={runDirectSpeechTest}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all duration-200 text-sm"
            >
              <Zap className="w-4 h-4" />
              <span>直接测试</span>
            </motion.button>
          </div>
        </div>
        
        <p className="text-sm text-orange-700 mb-2">
          快速诊断语音功能和后端连接问题。
        </p>
        <div className="text-xs text-orange-600 space-y-1">
          <p>💡 <strong>语音检查</strong>: 基础功能检测</p>
          <p>🔗 <strong>连接测试</strong>: 后端通信测试</p>
          <p>🏥 <strong>深度诊断</strong>: 语音合成问题详细分析</p>
          <p>⚡ <strong>直接测试</strong>: 绕过hook直接测试浏览器API</p>
        </div>
      </div>

      {/* 完整测试 */}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-purple-800">完整功能测试</h4>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runFullTest}
            disabled={isRunningTest}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              isRunningTest 
                ? 'bg-purple-300 text-purple-700 cursor-not-allowed' 
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>{isRunningTest ? '测试中...' : '运行完整测试'}</span>
          </motion.button>
        </div>
        
        <p className="text-sm text-purple-700 mb-4">
          运行完整的语音功能测试，包括浏览器兼容性、麦克风权限、语音识别和合成测试。
        </p>

        {voiceTestResult && (
          <div className="bg-white rounded-lg p-4 border">
            <h5 className="font-medium text-gray-800 mb-2">测试结果</h5>
            {voiceTestResult.error ? (
              <div className="text-red-600 text-sm">
                ❌ {voiceTestResult.error}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">浏览器:</span> {voiceTestResult.capabilities?.browserInfo?.name} {voiceTestResult.capabilities?.browserInfo?.version}
                </div>
                <div>
                  <span className="font-medium">HTTPS:</span> {voiceTestResult.capabilities?.browserInfo?.isSecure ? '✅' : '❌'}
                </div>
                <div>
                  <span className="font-medium">语音识别:</span> {voiceTestResult.tests?.speechRecognition?.success ? '✅' : '❌'}
                </div>
                <div>
                  <span className="font-medium">语音合成:</span> {voiceTestResult.tests?.speechSynthesis?.success ? '✅' : '❌'}
                </div>
                <div>
                  <span className="font-medium">麦克风权限:</span> {voiceTestResult.tests?.microphone?.success ? '✅' : '❌'}
                </div>
                {voiceTestResult.recommendations && voiceTestResult.recommendations.length > 0 && (
                  <div>
                    <span className="font-medium">建议:</span>
                    <ul className="ml-4 mt-1 space-y-1">
                      {voiceTestResult.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-xs text-gray-600">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">使用说明 & 故障排查</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <div>
            <strong>基本要求:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• 支持的浏览器: Chrome 25+, Safari 14.1+, Edge 79+</li>
              <li>• 需要HTTPS连接或localhost环境</li>
              <li>• 首次使用需要授权麦克风权限</li>
            </ul>
          </div>
          
          <div>
            <strong>语音输入没反应时:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• 点击上方"快速检查"按钮，查看控制台日志</li>
              <li>• 确保浏览器地址栏🔒旁没有被禁用的麦克风图标</li>
              <li>• 检查系统麦克风设备是否正常工作</li>
              <li>• 刷新页面重新授权麦克风权限</li>
            </ul>
          </div>
          
          <div>
            <strong>高级调试:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• 控制台运行: <code className="bg-blue-100 px-1 rounded">quickVoiceCheck()</code></li>
              <li>• 控制台运行: <code className="bg-blue-100 px-1 rounded">runVoiceTest()</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceTest 