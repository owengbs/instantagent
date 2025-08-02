"""
智能体模块
包含各种智能体的实现
"""

from .customer_agent import customer_agent
from .base_agent import BaseAgent
from .buffett_agent import BuffettAgent
from .soros_agent import SorosAgent
from .agent_manager import agent_manager

__all__ = [
    'customer_agent',
    'BaseAgent',
    'BuffettAgent', 
    'SorosAgent',
    'agent_manager'
] 