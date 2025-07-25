"""
知识库管理模块
"""
import os
import json
import asyncio
from typing import List, Dict, Optional, Any
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from sentence_transformers import SentenceTransformer

from ..core.config import settings


class KnowledgeBase:
    """知识库管理类"""
    
    def __init__(self):
        self.client = None
        self.collection = None
        self.embeddings = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len,
            separators=["\n\n", "\n", "。", "！", "？", "；", " ", ""]
        )
        
    async def initialize(self):
        """初始化知识库"""
        try:
            # 创建必要的目录
            os.makedirs(settings.database.chroma_persist_directory, exist_ok=True)
            os.makedirs(settings.database.knowledge_base_path, exist_ok=True)
            
            # 初始化ChromaDB客户端
            self.client = chromadb.PersistentClient(
                path=settings.database.chroma_persist_directory,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            
            # 获取或创建集合
            try:
                self.collection = self.client.get_collection(
                    name=settings.database.collection_name
                )
                print(f"已加载现有知识库集合: {settings.database.collection_name}")
            except Exception:
                self.collection = self.client.create_collection(
                    name=settings.database.collection_name
                )
                print(f"已创建新的知识库集合: {settings.database.collection_name}")
            
            # 初始化嵌入模型
            self.embeddings = SentenceTransformer('all-MiniLM-L6-v2')
            
            # 如果集合为空，加载默认知识库
            if self.collection.count() == 0:
                await self.load_default_knowledge()
                
            print(f"知识库初始化完成，包含 {self.collection.count()} 个文档片段")
            
        except Exception as e:
            print(f"知识库初始化失败: {e}")
            raise
    
    async def load_default_knowledge(self):
        """加载默认知识库数据"""
        default_knowledge = [
            {
                "title": "账户注册",
                "content": "新用户注册流程：1. 下载并安装交易APP 2. 点击'立即注册'按钮 3. 输入手机号码并获取验证码 4. 设置登录密码（6-20位，包含数字和字母） 5. 完善个人信息 6. 上传身份证照片进行实名认证 7. 风险测评 8. 开通资金账户。整个流程约5-10分钟完成。",
                "category": "账户管理"
            },
            {
                "title": "实名认证",
                "content": "实名认证要求：1. 需要二代身份证，确保在有效期内 2. 身份证照片要清晰，四角完整，无反光 3. 认证人年龄需在18-65岁之间 4. 一个身份证只能开通一个账户 5. 认证通常在1-3个工作日内完成 6. 如有疑问可联系在线客服。",
                "category": "账户管理"
            },
            {
                "title": "资金充值",
                "content": "资金充值方式：1. 银行卡转账：支持工商银行、建设银行、农业银行等主要银行 2. 第三方支付：支持支付宝、微信支付 3. 充值时间：工作日9:00-15:30实时到账，其他时间会有延迟 4. 充值限额：单日最高50万元 5. 首次充值建议小额测试。",
                "category": "资金管理"
            },
            {
                "title": "资金提取",
                "content": "资金提取说明：1. 只能提取到本人实名认证的银行卡 2. 提取时间：工作日9:00-15:30，当日到账；其他时间次日到账 3. 提取限额：单日最高100万元 4. 需要输入交易密码确认 5. 提取手续费：1万元以下免费，超过部分按0.1%收取。",
                "category": "资金管理"
            },
            {
                "title": "股票买入",
                "content": "股票买入操作：1. 登录APP进入交易界面 2. 搜索或选择要买入的股票 3. 点击'买入'按钮 4. 输入买入价格和数量（A股最少100股） 5. 确认订单信息 6. 输入交易密码 7. 提交订单。注意：买入价格不能超过涨停价，资金要充足。",
                "category": "交易操作"
            },
            {
                "title": "股票卖出",
                "content": "股票卖出操作：1. 在持仓中找到要卖出的股票 2. 点击'卖出'按钮 3. 输入卖出价格和数量 4. 确认订单信息 5. 输入交易密码 6. 提交订单。注意：当日买入的股票当日不能卖出（T+1制度），卖出价格不能低于跌停价。",
                "category": "交易操作"
            },
            {
                "title": "交易时间",
                "content": "A股交易时间：周一至周五（法定节假日除外）上午9:30-11:30，下午13:00-15:00。集合竞价时间：9:15-9:25。科创板和创业板另有盘后固定价格交易：15:05-15:30。节假日前后交易时间可能调整，请关注公告。",
                "category": "交易规则"
            },
            {
                "title": "交易费用",
                "content": "A股交易费用包括：1. 佣金：双向收取，一般万2.5-万3，最低5元 2. 印花税：卖出时收取千分之一 3. 过户费：双向收取万0.2 4. 规费：双向收取，很少 5. 总体来说买入1万元股票大约需要3-5元手续费。",
                "category": "交易规则"
            },
            {
                "title": "密码设置",
                "content": "密码设置要求：1. 登录密码：6-20位，建议包含数字、字母和特殊字符 2. 交易密码：6位数字，不能是生日、手机号等简单数字 3. 两个密码不能相同 4. 定期更换密码，提高安全性 5. 忘记密码可通过手机验证码重置。",
                "category": "安全设置"
            },
            {
                "title": "APP功能介绍",
                "content": "主要功能模块：1. 首页：市场行情、热门股票、资讯 2. 交易：买卖股票、查看委托、持仓管理 3. 行情：实时价格、K线图、技术指标 4. 资讯：财经新闻、公司公告、研报 5. 我的：账户信息、资产查询、设置等。界面简洁易用，新手也能快速上手。",
                "category": "功能介绍"
            }
        ]
        
        print("正在加载默认知识库...")
        await self.add_documents(default_knowledge)
        print("默认知识库加载完成")
    
    async def add_documents(self, documents: List[Dict[str, Any]]):
        """添加文档到知识库"""
        try:
            texts = []
            metadatas = []
            ids = []
            
            for i, doc in enumerate(documents):
                # 分割长文档
                chunks = self.text_splitter.split_text(doc["content"])
                
                for j, chunk in enumerate(chunks):
                    chunk_id = f"{doc.get('title', 'doc')}_{i}_{j}"
                    texts.append(chunk)
                    metadatas.append({
                        "title": doc.get("title", ""),
                        "category": doc.get("category", ""),
                        "source": doc.get("source", "default"),
                        "chunk_index": j
                    })
                    ids.append(chunk_id)
            
            if texts:
                # 生成嵌入向量
                embeddings = self.embeddings.encode(texts).tolist()
                
                # 添加到ChromaDB
                self.collection.add(
                    documents=texts,
                    metadatas=metadatas,
                    ids=ids,
                    embeddings=embeddings
                )
                
                print(f"成功添加 {len(texts)} 个文档片段到知识库")
                
        except Exception as e:
            print(f"添加文档失败: {e}")
            raise
    
    async def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """搜索相关文档"""
        try:
            if not self.collection:
                return []
            
            # 生成查询向量
            query_embedding = self.embeddings.encode([query]).tolist()
            
            # 搜索相似文档
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            
            # 格式化结果
            formatted_results = []
            if results["documents"]:
                for i in range(len(results["documents"][0])):
                    formatted_results.append({
                        "content": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i],
                        "score": 1 - results["distances"][0][i]  # 转换为相似度分数
                    })
            
            return formatted_results
            
        except Exception as e:
            print(f"搜索文档失败: {e}")
            return []
    
    async def load_knowledge_files(self, directory_path: str = None):
        """从文件加载知识库"""
        if directory_path is None:
            directory_path = settings.database.knowledge_base_path
        
        directory = Path(directory_path)
        if not directory.exists():
            print(f"知识库目录不存在: {directory_path}")
            return
        
        documents = []
        
        # 支持的文件格式
        supported_extensions = {'.txt', '.md', '.json'}
        
        for file_path in directory.rglob("*"):
            if file_path.suffix.lower() in supported_extensions:
                try:
                    content = ""
                    if file_path.suffix.lower() == '.json':
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if isinstance(data, list):
                                documents.extend(data)
                            else:
                                documents.append(data)
                    else:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            documents.append({
                                "title": file_path.stem,
                                "content": content,
                                "category": "文档",
                                "source": str(file_path)
                            })
                except Exception as e:
                    print(f"读取文件失败 {file_path}: {e}")
        
        if documents:
            await self.add_documents(documents)
            print(f"从 {directory_path} 加载了 {len(documents)} 个文档")
        else:
            print(f"在 {directory_path} 中没有找到有效的文档")


# 全局知识库实例
knowledge_base = KnowledgeBase() 