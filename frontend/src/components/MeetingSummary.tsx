import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Download, 
  Users, 
  Calendar, 
  Clock, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Quote,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Star
} from 'lucide-react'

interface MeetingSummaryProps {
  summaryData: any
  onClose: () => void
  onDownload?: () => void
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
}

const CollapsibleSection: React.FC<SectionProps> = ({ 
  title, 
  icon, 
  children, 
  defaultExpanded = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
      >
        <div className="flex items-center space-x-3">
          {icon}
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const MeetingSummary: React.FC<MeetingSummaryProps> = ({ 
  summaryData, 
  onClose, 
  onDownload 
}) => {
  const [isLoading, setIsLoading] = useState(false)
  
  const { meeting_info, participants, summary } = summaryData

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">会议纪要</h1>
                <p className="text-blue-100 mt-1">{meeting_info?.topic || '投资圆桌讨论'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200"
                >
                  <Download className="w-5 h-5" />
                  <span>导出</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* 会议基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">日期</span>
              </div>
              <p className="text-gray-800 font-semibold">{meeting_info?.date}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">时长</span>
              </div>
              <p className="text-gray-800 font-semibold">{meeting_info?.duration}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">参与者</span>
              </div>
              <p className="text-gray-800 font-semibold">{meeting_info?.participants_count}位</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">消息数</span>
              </div>
              <p className="text-gray-800 font-semibold">{meeting_info?.messages_count}条</p>
            </div>
          </div>

          {/* 参与者列表 */}
          <CollapsibleSection
            title="参与者"
            icon={<Users className="w-5 h-5 text-blue-600" />}
            defaultExpanded={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {participants?.map((participant: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {participant.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{participant.name}</p>
                    <p className="text-sm text-gray-600">{participant.role}</p>
                    <p className="text-xs text-gray-500">{participant.message_count}条发言</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* 核心要点总结 */}
          {summary?.executive_summary && (
            <CollapsibleSection
              title="会议要点"
              icon={<BookOpen className="w-5 h-5 text-green-600" />}
            >
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed text-base">
                  {summary.executive_summary}
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* 关键洞察 */}
          {summary?.key_insights && summary.key_insights.length > 0 && (
            <CollapsibleSection
              title="关键洞察"
              icon={<Lightbulb className="w-5 h-5 text-yellow-600" />}
            >
              <div className="space-y-4">
                {summary.key_insights.map((insight: any, index: number) => (
                  <div key={index} className="border-l-4 border-yellow-400 pl-4">
                    <h4 className="font-semibold text-gray-800 mb-2">{insight.topic}</h4>
                    <ul className="space-y-1">
                      {insight.insights?.map((point: string, pointIndex: number) => (
                        <li key={pointIndex} className="text-gray-700 flex items-start space-x-2">
                          <span className="text-yellow-500 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    {insight.participants && insight.participants.length > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        参与讨论：{insight.participants.join('、')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* 导师观点 */}
          {summary?.mentor_perspectives && summary.mentor_perspectives.length > 0 && (
            <CollapsibleSection
              title="导师观点"
              icon={<Quote className="w-5 h-5 text-purple-600" />}
            >
              <div className="space-y-6">
                {summary.mentor_perspectives.map((mentor: any, index: number) => (
                  <div key={index} className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">
                        {mentor.mentor?.charAt(0) || '?'}
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800">{mentor.mentor}</h4>
                    </div>
                    
                    {mentor.main_points && mentor.main_points.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-700 mb-2">核心观点：</h5>
                        <ul className="space-y-1">
                          {mentor.main_points.map((point: string, pointIndex: number) => (
                            <li key={pointIndex} className="text-gray-700 flex items-start space-x-2">
                              <Star className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {mentor.key_quotes && mentor.key_quotes.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">精彩语录：</h5>
                        <div className="space-y-2">
                          {mentor.key_quotes.map((quote: string, quoteIndex: number) => (
                            <blockquote key={quoteIndex} className="italic text-gray-600 border-l-2 border-purple-300 pl-3">
                              "{quote}"
                            </blockquote>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* 行动建议 */}
          {summary?.actionable_advice && summary.actionable_advice.length > 0 && (
            <CollapsibleSection
              title="行动建议"
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            >
              <div className="space-y-3">
                {summary.actionable_advice.map((advice: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{advice}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* 讨论亮点 */}
          {summary?.discussion_highlights && summary.discussion_highlights.length > 0 && (
            <CollapsibleSection
              title="讨论亮点"
              icon={<Star className="w-5 h-5 text-orange-600" />}
              defaultExpanded={false}
            >
              <div className="space-y-3">
                {summary.discussion_highlights.map((highlight: string, index: number) => (
                  <div key={index} className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                    <p className="text-gray-700">{highlight}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* 共识与分歧 */}
          {summary?.consensus_and_disagreements && (
            <CollapsibleSection
              title="共识与分歧"
              icon={<AlertCircle className="w-5 h-5 text-blue-600" />}
              defaultExpanded={false}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {summary.consensus_and_disagreements.consensus && 
                 summary.consensus_and_disagreements.consensus.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>达成共识</span>
                    </h4>
                    <div className="space-y-2">
                      {summary.consensus_and_disagreements.consensus.map((item: string, index: number) => (
                        <div key={index} className="p-2 bg-green-50 rounded border-l-2 border-green-400">
                          <p className="text-gray-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {summary.consensus_and_disagreements.disagreements && 
                 summary.consensus_and_disagreements.disagreements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-orange-700 mb-3 flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>存在分歧</span>
                    </h4>
                    <div className="space-y-2">
                      {summary.consensus_and_disagreements.disagreements.map((item: string, index: number) => (
                        <div key={index} className="p-2 bg-orange-50 rounded border-l-2 border-orange-400">
                          <p className="text-gray-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default MeetingSummary
