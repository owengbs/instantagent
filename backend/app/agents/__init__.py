"""
智能体模块
包含各种智能体的实现
"""

from .base_agent import BaseAgent
from .buffett_agent import BuffettAgent
from .soros_agent import SorosAgent
from .munger_agent import MungerAgent
from .krugman_agent import KrugmanAgent
from .agent_manager import agent_manager

__all__ = [
    'BaseAgent',
    'BuffettAgent', 
    'SorosAgent',
    'MungerAgent',
    'KrugmanAgent',
    'agent_manager'
] 