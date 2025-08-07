import React from 'react'
import { motion } from 'framer-motion'
import { Check, Star, Users, TrendingUp, X } from 'lucide-react'
import { Mentor } from '../types/mentor'

interface MentorCardProps {
  mentor: Mentor
  isSelected: boolean
  onToggleSelect: (mentor: Mentor) => void
  onRemove?: (mentor: Mentor) => void
  className?: string
}

const MentorCard: React.FC<MentorCardProps> = ({ 
  mentor, 
  isSelected, 
  onToggleSelect, 
  onRemove,
  className = '' 
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative bg-white rounded-xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
        isSelected 
          ? 'border-blue-500 ring-4 ring-blue-100' 
          : 'border-gray-200 hover:border-gray-300'
      } ${className}`}
    >
      {/* 选中状态指示器 */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 z-10"
        >
          <Check className="w-4 h-4" />
        </motion.div>
      )}

      {/* 自定义导师的删除按钮 */}
      {mentor.isCustom && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(mentor)
          }}
          className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 z-10 hover:bg-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div 
        className="p-6 cursor-pointer"
        onClick={() => onToggleSelect(mentor)}
      >
        {/* 头像和基本信息 */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="relative">
            <img
              src={mentor.avatar}
              alt={mentor.name}
              className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
              style={{ borderColor: mentor.color }}
            />
            {mentor.isCustom && (
              <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white rounded-full p-1">
                <Star className="w-3 h-3" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {mentor.name}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {mentor.title}
            </p>
            <div 
              className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white mt-1"
              style={{ backgroundColor: mentor.color }}
            >
              {mentor.investmentStyle}
            </div>
          </div>
        </div>

        {/* 描述 */}
        <p className="text-gray-700 text-sm mb-4 leading-relaxed">
          {mentor.description}
        </p>

        {/* 专业领域 */}
        <div className="mb-4">
          <div className="flex items-center space-x-1 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              专业领域
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {mentor.expertise.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
              >
                {skill}
              </span>
            ))}
            {mentor.expertise.length > 3 && (
              <span className="text-xs text-gray-500 self-center">
                +{mentor.expertise.length - 3} 更多
              </span>
            )}
          </div>
        </div>

        {/* 性格特点 */}
        <div className="mb-4">
          <div className="flex items-center space-x-1 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              性格特点
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {mentor.personalityTraits.slice(0, 4).map((trait, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* 经典语录 */}
        {mentor.famousQuotes && mentor.famousQuotes.length > 0 && (
          <div className="border-t pt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <div className="text-gray-400 text-lg leading-none">"</div>
                <p className="text-gray-600 text-xs italic leading-relaxed flex-1">
                  {mentor.famousQuotes[0]}
                </p>
                <div className="text-gray-400 text-lg leading-none">"</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default MentorCard
