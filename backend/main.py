"""
投资大师圆桌会议后端主应用
"""
import asyncio
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings, ensure_directories
from app.core.logging_config import setup_logging
from app.utils.llm_client import llm_client
from app.api.tts import router as tts_router
from app.api.realtime_chat import router as realtime_router
from app.api.asr_websocket import router as asr_ws_router
from app.api.mentors import router as mentors_router
from app.api.meeting_summary import router as meeting_summary_router
from app.api.user_management import router as user_management_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    print("🚀 启动投资大师圆桌会议系统...")
    
    try:
        # 设置日志配置
        setup_logging()
        
        # 确保目录存在
        ensure_directories()
        print("✅ 目录检查完成")
        
        # 初始化LLM客户端
        await llm_client.initialize()
        print("✅ LLM客户端初始化完成")
        
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
app.include_router(tts_router, prefix="/api")
# 直接按模块内定义前缀挂载（模块内已是 /realtime）
app.include_router(realtime_router)
# 同时兼容历史路径 /api/realtime
app.include_router(realtime_router, prefix="/api")
app.include_router(asr_ws_router, prefix="/api")
app.include_router(mentors_router, prefix="/api")
app.include_router(meeting_summary_router, prefix="/api")
app.include_router(user_management_router, prefix="/api")


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "投资大师圆桌会议 API",
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/health")
async def api_health():
    """API健康检查"""
    try:
        llm_health = await llm_client.health_check()
        return {
            "api_status": "healthy",
            "llm_status": llm_health,
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