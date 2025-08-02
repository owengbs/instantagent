"""
智能交易客服Agent后端主应用
"""
import asyncio
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings, ensure_directories
from app.core.logging_config import setup_logging
from app.knowledge.knowledge_base import knowledge_base
from app.agents.customer_agent import customer_agent
from app.api.chat import router as chat_router
from app.api.tts import router as tts_router
from app.api.realtime_chat import router as realtime_router

from app.api.asr_websocket import router as asr_ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    print("🚀 启动智能交易客服Agent...")
    
    try:
        # 设置日志配置
        setup_logging()
        
        # 确保目录存在
        ensure_directories()
        print("✅ 目录检查完成")
        
        # 初始化知识库
        await knowledge_base.initialize()
        print("✅ 知识库初始化完成")
        
        # 初始化客服Agent
        await customer_agent.initialize()
        print("✅ 客服Agent初始化完成")
        
        print(f"🎉 服务器启动成功！运行在 http://{settings.host}:{settings.port}")
        
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        raise
    
    yield
    
    # 关闭时执行
    print("🛑 正在关闭服务器...")


# 创建FastAPI应用
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="基于LangGraph的智能交易客服对话系统",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chat_router, prefix="/api")
app.include_router(tts_router, prefix="/api")
app.include_router(realtime_router, prefix="/api")

app.include_router(asr_ws_router, prefix="/api")


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "智能交易客服Agent API",
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/health")
async def api_health():
    """API健康检查"""
    try:
        agent_health = await customer_agent.health_check()
        return {
            "api_status": "healthy",
            "agent_status": agent_health,
            "version": settings.app_version
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "api_status": "unhealthy",
                "error": str(e),
                "version": settings.app_version
            }
        )


if __name__ == "__main__":
    # 运行服务器
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    ) 