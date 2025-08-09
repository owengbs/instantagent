"""
导师信息API
支持动态获取导师信息、导师配置管理等功能
"""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..agents.agent_manager import agent_manager
from ..core.config import settings

logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/mentors", tags=["mentors"])

# 数据模型
class MentorInfo(BaseModel):
    """导师信息模型"""
    agent_id: str
    name: str
    title: str
    description: str
    voice: str
    expertise: List[str]
    personality_traits: List[str]
    investment_style: str
    famous_quotes: List[str]
    color: str
    avatar: str
    enabled: bool
    priority: int
    registered_at: str

class MentorConfig(BaseModel):
    """导师配置模型"""
    agent_id: str
    name: str
    description: str
    priority: int
    enabled: bool
    voice: str

class MentorUpdateRequest(BaseModel):
    """导师更新请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    enabled: Optional[bool] = None
    voice: Optional[str] = None

class DynamicMentorRequest(BaseModel):
    """动态导师生成请求模型"""
    topic: str
    session_id: str

class DynamicMentorResponse(BaseModel):
    """动态导师生成响应模型"""
    mentors: List[MentorInfo]
    topic: str
    session_id: str
    generated_at: str

# 导师颜色映射
MENTOR_COLORS = {
    'buffett': '#3B82F6',      # 蓝色 - 价值投资
    'soros': '#10B981',        # 绿色 - 宏观投资
    'munger': '#8B5CF6',       # 紫色 - 多元思维
    'krugman': '#F59E0B',      # 橙色 - 宏观经济
}

# 导师头像映射
MENTOR_AVATARS = {
    'buffett': 'https://api.dicebear.com/7.x/adventurer/svg?seed=warren-buffett',
    'soros': 'https://api.dicebear.com/7.x/avataaars/svg?seed=george-soros',
    'munger': 'https://api.dicebear.com/7.x/big-ears/svg?seed=charlie-munger',
    'krugman': 'https://api.dicebear.com/7.x/croodles/svg?seed=paul-krugman',
}

def get_mentor_color(agent_id: str) -> str:
    """获取导师颜色"""
    if agent_id in MENTOR_COLORS:
        return MENTOR_COLORS[agent_id]
    # 为动态导师生成颜色
    colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#8B5A2B']
    color_index = hash(agent_id) % len(colors)
    return colors[color_index]

def get_mentor_avatar(agent_id: str) -> str:
    """获取导师头像"""
    if agent_id in MENTOR_AVATARS:
        return MENTOR_AVATARS[agent_id]
    # 为动态导师生成头像
    avatar_styles = ['adventurer', 'avataaars', 'big-ears', 'croodles', 'fun-emoji', 'lorelei']
    style_index = hash(agent_id) % len(avatar_styles)
    return f'https://api.dicebear.com/7.x/{avatar_styles[style_index]}/svg?seed={agent_id}'

@router.get("/", response_model=List[MentorInfo])
async def get_all_mentors():
    """
    获取所有导师信息
    
    Returns:
        导师信息列表
    """
    try:
        logger.info("📋 获取所有导师信息")
        
        mentors = []
        for agent_id, agent in agent_manager.agents.items():
            agent_config = agent_manager.agent_configs.get(agent_id, {})
            agent_info = agent.get_agent_info()
            
            mentor_info = MentorInfo(
                agent_id=agent_id,
                name=agent_config.get('name', agent_info.get('name', agent_id)),
                title=agent_info.get('title', ''),
                description=agent_config.get('description', ''),
                voice=agent_config.get('voice', agent_info.get('voice', 'Cherry')),
                expertise=agent_info.get('expertise', []),
                personality_traits=agent_info.get('personality_traits', []),
                investment_style=agent_info.get('investment_style', ''),
                famous_quotes=agent_info.get('famous_quotes', []),
                color=get_mentor_color(agent_id),
                avatar=get_mentor_avatar(agent_id),
                enabled=agent_config.get('enabled', True),
                priority=agent_config.get('priority', 1),
                registered_at=agent_config.get('registered_at', datetime.now().isoformat())
            )
            mentors.append(mentor_info)
        
        # 按优先级排序
        mentors.sort(key=lambda x: x.priority)
        
        logger.info(f"✅ 成功获取 {len(mentors)} 个导师信息")
        return mentors
        
    except Exception as e:
        logger.error(f"❌ 获取导师信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取导师信息失败: {str(e)}")

@router.get("/enabled", response_model=List[MentorInfo])
async def get_enabled_mentors():
    """
    获取所有启用的导师信息
    
    Returns:
        启用的导师信息列表
    """
    try:
        logger.info("📋 获取启用的导师信息")
        
        mentors = []
        enabled_agents = agent_manager.get_enabled_agents()
        
        for agent_id, agent in enabled_agents.items():
            agent_config = agent_manager.agent_configs.get(agent_id, {})
            agent_info = agent.get_agent_info()
            
            mentor_info = MentorInfo(
                agent_id=agent_id,
                name=agent_config.get('name', agent_info.get('name', agent_id)),
                title=agent_info.get('title', ''),
                description=agent_config.get('description', ''),
                voice=agent_config.get('voice', agent_info.get('voice', 'Cherry')),
                expertise=agent_info.get('expertise', []),
                personality_traits=agent_info.get('personality_traits', []),
                investment_style=agent_info.get('investment_style', ''),
                famous_quotes=agent_info.get('famous_quotes', []),
                color=MENTOR_COLORS.get(agent_id, '#6B7280'),
                avatar=MENTOR_AVATARS.get(agent_id, f'https://api.dicebear.com/7.x/adventurer/svg?seed={agent_id}'),
                enabled=True,
                priority=agent_config.get('priority', 1),
                registered_at=agent_config.get('registered_at', datetime.now().isoformat())
            )
            mentors.append(mentor_info)
        
        # 按优先级排序
        mentors.sort(key=lambda x: x.priority)
        
        logger.info(f"✅ 成功获取 {len(mentors)} 个启用的导师信息")
        return mentors
        
    except Exception as e:
        logger.error(f"❌ 获取启用的导师信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取启用的导师信息失败: {str(e)}")

@router.get("/{agent_id}", response_model=MentorInfo)
async def get_mentor_by_id(agent_id: str):
    """
    根据ID获取导师信息
    
    Args:
        agent_id: 导师ID
        
    Returns:
        导师信息
    """
    try:
        logger.info(f"📋 获取导师信息: {agent_id}")
        
        agent = agent_manager.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail=f"导师 {agent_id} 不存在")
        
        agent_config = agent_manager.agent_configs.get(agent_id, {})
        agent_info = agent.get_agent_info()
        
        mentor_info = MentorInfo(
            agent_id=agent_id,
            name=agent_config.get('name', agent_info.get('name', agent_id)),
            title=agent_info.get('title', ''),
            description=agent_config.get('description', ''),
            voice=agent_config.get('voice', agent_info.get('voice', 'Cherry')),
            expertise=agent_info.get('expertise', []),
            personality_traits=agent_info.get('personality_traits', []),
            investment_style=agent_info.get('investment_style', ''),
            famous_quotes=agent_info.get('famous_quotes', []),
            color=MENTOR_COLORS.get(agent_id, '#6B7280'),
            avatar=MENTOR_AVATARS.get(agent_id, f'https://api.dicebear.com/7.x/adventurer/svg?seed={agent_id}'),
            enabled=agent_config.get('enabled', True),
            priority=agent_config.get('priority', 1),
            registered_at=agent_config.get('registered_at', datetime.now().isoformat())
        )
        
        logger.info(f"✅ 成功获取导师信息: {agent_id}")
        return mentor_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 获取导师信息失败: {agent_id}, error: {e}")
        raise HTTPException(status_code=500, detail=f"获取导师信息失败: {str(e)}")

@router.get("/{agent_id}/config", response_model=MentorConfig)
async def get_mentor_config(agent_id: str):
    """
    获取导师配置信息
    
    Args:
        agent_id: 导师ID
        
    Returns:
        导师配置信息
    """
    try:
        logger.info(f"📋 获取导师配置: {agent_id}")
        
        agent_config = agent_manager.agent_configs.get(agent_id)
        if not agent_config:
            raise HTTPException(status_code=404, detail=f"导师 {agent_id} 配置不存在")
        
        config = MentorConfig(
            agent_id=agent_id,
            name=agent_config.get('name', agent_id),
            description=agent_config.get('description', ''),
            priority=agent_config.get('priority', 1),
            enabled=agent_config.get('enabled', True),
            voice=agent_config.get('voice', 'Cherry')
        )
        
        logger.info(f"✅ 成功获取导师配置: {agent_id}")
        return config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 获取导师配置失败: {agent_id}, error: {e}")
        raise HTTPException(status_code=500, detail=f"获取导师配置失败: {str(e)}")

@router.put("/{agent_id}/config")
async def update_mentor_config(agent_id: str, update_request: MentorUpdateRequest):
    """
    更新导师配置
    
    Args:
        agent_id: 导师ID
        update_request: 更新请求
        
    Returns:
        更新结果
    """
    try:
        logger.info(f"📋 更新导师配置: {agent_id}")
        
        agent_config = agent_manager.agent_configs.get(agent_id)
        if not agent_config:
            raise HTTPException(status_code=404, detail=f"导师 {agent_id} 配置不存在")
        
        # 更新配置
        if update_request.name is not None:
            agent_config['name'] = update_request.name
        if update_request.description is not None:
            agent_config['description'] = update_request.description
        if update_request.priority is not None:
            agent_config['priority'] = update_request.priority
        if update_request.enabled is not None:
            agent_config['enabled'] = update_request.enabled
        if update_request.voice is not None:
            agent_config['voice'] = update_request.voice
        
        # 更新注册时间
        agent_config['updated_at'] = datetime.now().isoformat()
        
        logger.info(f"✅ 成功更新导师配置: {agent_id}")
        return {
            "message": "导师配置更新成功",
            "agent_id": agent_id,
            "updated_at": agent_config['updated_at']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 更新导师配置失败: {agent_id}, error: {e}")
        raise HTTPException(status_code=500, detail=f"更新导师配置失败: {str(e)}")

@router.post("/{agent_id}/enable")
async def enable_mentor(agent_id: str):
    """
    启用导师
    
    Args:
        agent_id: 导师ID
        
    Returns:
        启用结果
    """
    try:
        logger.info(f"📋 启用导师: {agent_id}")
        
        agent_config = agent_manager.agent_configs.get(agent_id)
        if not agent_config:
            raise HTTPException(status_code=404, detail=f"导师 {agent_id} 不存在")
        
        agent_config['enabled'] = True
        agent_config['updated_at'] = datetime.now().isoformat()
        
        logger.info(f"✅ 成功启用导师: {agent_id}")
        return {
            "message": "导师启用成功",
            "agent_id": agent_id,
            "enabled": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 启用导师失败: {agent_id}, error: {e}")
        raise HTTPException(status_code=500, detail=f"启用导师失败: {str(e)}")

@router.post("/{agent_id}/disable")
async def disable_mentor(agent_id: str):
    """
    禁用导师
    
    Args:
        agent_id: 导师ID
        
    Returns:
        禁用结果
    """
    try:
        logger.info(f"📋 禁用导师: {agent_id}")
        
        agent_config = agent_manager.agent_configs.get(agent_id)
        if not agent_config:
            raise HTTPException(status_code=404, detail=f"导师 {agent_id} 不存在")
        
        agent_config['enabled'] = False
        agent_config['updated_at'] = datetime.now().isoformat()
        
        logger.info(f"✅ 成功禁用导师: {agent_id}")
        return {
            "message": "导师禁用成功",
            "agent_id": agent_id,
            "enabled": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 禁用导师失败: {agent_id}, error: {e}")
        raise HTTPException(status_code=500, detail=f"禁用导师失败: {str(e)}")

@router.get("/stats/summary")
async def get_mentors_summary():
    """
    获取导师统计摘要
    
    Returns:
        导师统计信息
    """
    try:
        logger.info("📊 获取导师统计摘要")
        
        total_mentors = len(agent_manager.agents)
        enabled_mentors = len(agent_manager.get_enabled_agents())
        disabled_mentors = total_mentors - enabled_mentors
        
        # 按投资风格统计
        style_stats = {}
        for agent_id, agent in agent_manager.agents.items():
            agent_info = agent.get_agent_info()
            style = agent_info.get('investment_style', '未知')
            style_stats[style] = style_stats.get(style, 0) + 1
        
        # 按优先级统计
        priority_stats = {}
        for agent_id, config in agent_manager.agent_configs.items():
            priority = config.get('priority', 1)
            priority_stats[priority] = priority_stats.get(priority, 0) + 1
        
        summary = {
            "total_mentors": total_mentors,
            "enabled_mentors": enabled_mentors,
            "disabled_mentors": disabled_mentors,
            "enabled_ratio": enabled_mentors / total_mentors if total_mentors > 0 else 0,
            "style_distribution": style_stats,
            "priority_distribution": priority_stats,
            "last_updated": datetime.now().isoformat()
        }
        
        logger.info(f"✅ 成功获取导师统计摘要: 总数={total_mentors}, 启用={enabled_mentors}")
        return summary
        
    except Exception as e:
        logger.error(f"❌ 获取导师统计摘要失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取导师统计摘要失败: {str(e)}")

@router.get("/templates/expertise")
async def get_expertise_templates():
    """
    获取专业领域模板
    
    Returns:
        专业领域模板列表
    """
    try:
        logger.info("📋 获取专业领域模板")
        
        # 从所有导师中收集专业领域
        all_expertise = set()
        for agent in agent_manager.agents.values():
            agent_info = agent.get_agent_info()
            expertise = agent_info.get('expertise', [])
            all_expertise.update(expertise)
        
        templates = {
            "available_expertise": sorted(list(all_expertise)),
            "popular_expertise": [
                "价值投资", "宏观投资", "多元思维", "宏观经济分析",
                "技术分析", "基本面分析", "风险管理", "资产配置"
            ],
            "expertise_categories": {
                "投资策略": ["价值投资", "成长投资", "指数投资", "量化投资"],
                "分析方法": ["技术分析", "基本面分析", "宏观分析", "行为分析"],
                "风险管理": ["风险管理", "资产配置", "投资组合", "对冲策略"],
                "专业领域": ["宏观经济", "国际贸易", "货币政策", "金融危机"]
            }
        }
        
        logger.info(f"✅ 成功获取专业领域模板: {len(templates['available_expertise'])} 个领域")
        return templates
        
    except Exception as e:
        logger.error(f"❌ 获取专业领域模板失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取专业领域模板失败: {str(e)}")

@router.get("/templates/personality")
async def get_personality_templates():
    """
    获取性格特征模板
    
    Returns:
        性格特征模板列表
    """
    try:
        logger.info("📋 获取性格特征模板")
        
        # 从所有导师中收集性格特征
        all_traits = set()
        for agent in agent_manager.agents.values():
            agent_info = agent.get_agent_info()
            traits = agent_info.get('personality_traits', [])
            all_traits.update(traits)
        
        templates = {
            "available_traits": sorted(list(all_traits)),
            "personality_categories": {
                "投资风格": ["谨慎", "激进", "理性", "直觉", "耐心", "敏锐"],
                "沟通方式": ["幽默", "严肃", "直率", "委婉", "开放", "保守"],
                "思维方式": ["批判性", "创新性", "系统性", "发散性", "逻辑性", "创造性"],
                "工作态度": ["严谨", "灵活", "专注", "全面", "务实", "理想主义"]
            }
        }
        
        logger.info(f"✅ 成功获取性格特征模板: {len(templates['available_traits'])} 个特征")
        return templates
        
    except Exception as e:
        logger.error(f"❌ 获取性格特征模板失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取性格特征模板失败: {str(e)}")

@router.post("/dynamic/generate", response_model=DynamicMentorResponse)
async def generate_dynamic_mentors(request: DynamicMentorRequest):
    """
    根据议题生成动态导师
    
    Args:
        request: 动态导师生成请求
        
    Returns:
        生成的导师信息
    """
    try:
        logger.info(f"🎯 收到动态导师生成请求: 议题='{request.topic}', 会话='{request.session_id}'")
        
        # 生成动态导师
        mentors = await agent_manager.generate_dynamic_mentors(request.topic, request.session_id)
        
        # 转换为MentorInfo格式
        mentor_infos = []
        for mentor in mentors:
            mentor_info = MentorInfo(
                agent_id=mentor['agent_id'],
                name=mentor['name'],
                title=mentor.get('title', ''),
                description=mentor.get('description', ''),
                voice=mentor.get('voice', 'Cherry'),
                expertise=mentor.get('expertise', []),
                personality_traits=mentor.get('personality_traits', []),
                investment_style=mentor.get('investment_style', ''),
                famous_quotes=mentor.get('famous_quotes', []),
                color=get_mentor_color(mentor['agent_id']),
                avatar=get_mentor_avatar(mentor['agent_id']),
                enabled=True,
                priority=2,
                registered_at=mentor.get('created_at', datetime.now().isoformat())
            )
            mentor_infos.append(mentor_info)
        
        response = DynamicMentorResponse(
            mentors=mentor_infos,
            topic=request.topic,
            session_id=request.session_id,
            generated_at=datetime.now().isoformat()
        )
        
        logger.info(f"✅ 成功生成 {len(mentor_infos)} 位动态导师")
        return response
        
    except Exception as e:
        logger.error(f"❌ 生成动态导师失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成动态导师失败: {str(e)}")

@router.get("/dynamic/{session_id}")
async def get_session_dynamic_mentors(session_id: str):
    """
    获取会话的动态导师
    
    Args:
        session_id: 会话ID
        
    Returns:
        动态导师信息列表
    """
    try:
        logger.info(f"📋 获取会话 {session_id} 的动态导师")
        
        mentors = agent_manager.get_session_dynamic_mentors(session_id)
        topic = agent_manager.get_session_topic(session_id)
        
        return {
            "mentors": mentors,
            "topic": topic,
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"❌ 获取会话动态导师失败: {e}")
        raise HTTPException(status_code=500, detail="获取会话动态导师失败")

@router.delete("/dynamic/{session_id}")
async def cleanup_session_mentors(session_id: str):
    """
    清理会话的动态导师
    
    Args:
        session_id: 会话ID
    """
    try:
        logger.info(f"🗑️ 清理会话 {session_id} 的动态导师")
        
        agent_manager.cleanup_dynamic_mentors(session_id)
        
        return {"message": "动态导师清理成功"}
        
    except Exception as e:
        logger.error(f"❌ 清理动态导师失败: {e}")
        raise HTTPException(status_code=500, detail="清理动态导师失败")
