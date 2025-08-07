/**
 * 默认投资导师配置
 */
import { Mentor } from '../types/mentor'

// 投资风格颜色主题
export const MENTOR_COLORS = {
  blue: '#3B82F6',      // 蓝色 - 价值投资
  green: '#10B981',     // 绿色 - 宏观投资  
  purple: '#8B5CF6',    // 紫色 - 多元思维
  orange: '#F59E0B',    // 橙色 - 行为经济学
  red: '#EF4444',       // 红色 - 激进投资
  indigo: '#6366F1',    // 靛蓝 - 量化投资
  pink: '#EC4899',      // 粉色 - 创新投资
  teal: '#14B8A6',      // 青色 - 可持续投资
}

// 头像生成配置
export const AVATAR_STYLES = [
  'adventurer',
  'avataaars', 
  'big-ears',
  'big-smile',
  'croodles',
  'fun-emoji',
  'icons',
  'identicon',
  'initials',
  'lorelei',
  'micah',
  'miniavs',
  'open-peeps',
  'personas',
  'pixel-art'
]

// 生成随机头像URL
export function generateAvatarUrl(seed: string, style?: string): string {
  const selectedStyle = style || AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)]
  return `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${encodeURIComponent(seed)}`
}

// 默认投资导师配置
export const DEFAULT_MENTORS: Mentor[] = [
  {
    id: 'buffett',
    name: '沃伦·巴菲特',
    title: '伯克希尔·哈撒韦CEO',
    description: '价值投资之父，被誉为"奥马哈的先知"',
    expertise: ['价值投资', '长期持有', '企业分析', '护城河理论'],
    avatar: generateAvatarUrl('warren-buffett', 'adventurer'),
    color: MENTOR_COLORS.blue,
    personalityTraits: ['谦逊', '耐心', '理性', '幽默'],
    investmentStyle: '价值投资',
    famousQuotes: [
      '当别人恐惧时我贪婪，当别人贪婪时我恐惧',
      '时间是优秀企业的朋友，是平庸企业的敌人',
      '价格是你付出的，价值是你得到的'
    ],
    background: '从小展现出商业天赋，建立了投资界最成功的记录之一。通过伯克希尔·哈撒韦公司管理超过7000亿美元资产。'
  },
  {
    id: 'soros',
    name: '乔治·索罗斯',
    title: '量子基金创始人',
    description: '金融大鳄，以宏观经济投资和市场时机把握著称',
    expertise: ['宏观投资', '货币政策', '反身性理论', '市场时机'],
    avatar: generateAvatarUrl('george-soros', 'avataaars'),
    color: MENTOR_COLORS.green,
    personalityTraits: ['敏锐', '果断', '思辨', '前瞻'],
    investmentStyle: '宏观投资',
    famousQuotes: [
      '金融市场天生就不稳定',
      '重要的不是你是否正确，而是你正确时赚了多少钱，错误时亏了多少钱',
      '市场参与者的认知天生就是有缺陷的'
    ],
    background: '哲学出身的投资大师，以"反身性理论"闻名。1992年成功做空英镑，被称为"击败英格兰银行的人"。'
  },
  {
    id: 'munger',
    name: '查理·芒格',
    title: '伯克希尔·哈撒韦副主席',
    description: '多元思维模型倡导者，巴菲特的黄金搭档',
    expertise: ['多元思维', '跨学科分析', '理性决策', '心理学'],
    avatar: generateAvatarUrl('charlie-munger', 'big-ears'),
    color: MENTOR_COLORS.purple,
    personalityTraits: ['睿智', '直率', '博学', '独立'],
    investmentStyle: '多元思维投资',
    famousQuotes: [
      '获得智慧是一种道德责任',
      '如果你想要说服别人，要诉诸利益，而非理性',
      '学会学习如何正确地思考，这是最重要的技能'
    ],
    background: '律师出身，以跨学科思维著称。与巴菲特合作超过50年，被称为"行走的书库"。'
  },
  {
    id: 'krugman',
    name: '保罗·克鲁格曼',
    title: '诺贝尔经济学奖得主',
    description: '新贸易理论和新经济地理学创始人，经济政策分析专家',
    expertise: ['宏观经济学', '国际贸易', '货币政策', '经济周期'],
    avatar: generateAvatarUrl('paul-krugman', 'croodles'),
    color: MENTOR_COLORS.orange,
    personalityTraits: ['学术严谨', '批判思维', '数据驱动', '政策敏感'],
    investmentStyle: '宏观经济分析',
    famousQuotes: [
      '经济学不是一门精确科学，但它仍然是一门科学',
      '市场可能在很长时间内保持非理性',
      '政策制定者需要基于证据而非意识形态做决策'
    ],
    background: 'MIT教授，2008年诺贝尔经济学奖得主。以其对国际贸易和经济地理学的贡献而闻名，同时也是著名的经济政策评论家。'
  }
]

// 导师模板（用于创建自定义导师的参考）
export const MENTOR_TEMPLATES = {
  expertise: [
    '价值投资', '成长投资', '指数投资', '量化投资', '技术分析',
    '基本面分析', '宏观投资', '微观分析', '风险管理', '资产配置',
    '行为金融学', '市场心理学', '企业分析', '财务分析', '估值方法',
    '衍生品', '固定收益', '另类投资', 'ESG投资', '科技投资'
  ],
  personalityTraits: [
    '谨慎', '激进', '理性', '直觉', '耐心', '敏锐', '创新', '保守',
    '幽默', '严肃', '乐观', '悲观', '务实', '理想主义', '批判性', '开放性'
  ],
  investmentStyles: [
    '价值投资', '成长投资', '动量投资', '逆向投资', '指数投资',
    '量化投资', '宏观投资', '事件驱动', '套利投资', '长期投资',
    '短期交易', '技术分析', '基本面分析', '多元化投资', '集中投资'
  ]
}

// 获取可用的颜色（排除已使用的）
export function getAvailableColors(usedColors: string[]): string[] {
  const allColors = Object.values(MENTOR_COLORS)
  return allColors.filter(color => !usedColors.includes(color))
}

// 为新导师分配颜色
export function assignMentorColor(existingMentors: Mentor[]): string {
  const usedColors = existingMentors.map(mentor => mentor.color)
  const availableColors = getAvailableColors(usedColors)
  
  if (availableColors.length > 0) {
    return availableColors[0]
  }
  
  // 如果所有颜色都被使用，随机选择一个
  const allColors = Object.values(MENTOR_COLORS)
  return allColors[Math.floor(Math.random() * allColors.length)]
}
