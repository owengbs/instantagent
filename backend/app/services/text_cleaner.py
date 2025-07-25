"""
文本清理服务
处理大模型输出，使其适合TTS语音合成
"""
import re
import logging
from typing import List

logger = logging.getLogger(__name__)

class TextCleaner:
    """文本清理器"""
    
    def __init__(self):
        # 需要移除的符号和模式
        self.remove_patterns = [
            # 表情符号和特殊符号
            r'[😀-🙏🌀-🗿]',  # Unicode表情符号
            r'[😀-😿]',  # 更多表情符号
            r'[🚀-🛿]',  # 交通工具表情
            r'[⚡-⚿]',  # 符号表情
            r'[💡-💿]',  # 物品表情
            r'[📱-📿]',  # 设备表情
            r'[🎵-🎿]',  # 娱乐表情
            r'[🏀-🏿]',  # 运动表情
            r'[🌍-🌿]',  # 自然表情
            r'[🍀-🍿]',  # 食物表情
            
            # 标题格式
            r'^#{1,6}\s+',  # Markdown标题
            r'^[一二三四五六七八九十]+、',  # 中文数字标题
            r'^[①②③④⑤⑥⑦⑧⑨⑩]+',  # 圆圈数字
            r'^[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]+',  # 括号数字
            
            # 列表格式
            r'^\d+\.\s+',  # 数字列表
            r'^[•·]\s+',  # 项目符号
            r'^[-*]\s+',  # 短横线列表
            
            # 特殊符号
            r'[【】]',  # 中文方括号
            r'[「」]',  # 中文引号
            r'[『』]',  # 中文书名号
            r'[〈〉]',  # 中文尖括号
            r'[《》]',  # 中文书名号
            r'[（）]',  # 中文括号
            r'[［］]',  # 中文方括号
            r'[｛｝]',  # 中文大括号
            r'[【】]',  # 中文方括号
            
            # 多余的标点符号
            r'[！]{2,}',  # 多个感叹号
            r'[？]{2,}',  # 多个问号
            r'[。]{2,}',  # 多个句号
            r'[，]{2,}',  # 多个逗号
            r'[；]{2,}',  # 多个分号
            r'[：]{2,}',  # 多个冒号
            
            # 特殊字符
            r'[~`!@#$%^&*()_+\-=\[\]{}|\\:";\'<>?,./]',  # 英文特殊符号
            
            # 多余的空格和换行
            r'\n+',  # 多个换行符
            r'\s+',  # 多个空格
        ]
        
        # 需要替换的模式
        self.replace_patterns = [
            # 将某些符号替换为自然语言
            (r'（', '，'),
            (r'）', '，'),
            (r'【', '，'),
            (r'】', '，'),
            (r'《', '，'),
            (r'》', '，'),
            (r'「', '，'),
            (r'」', '，'),
            (r'『', '，'),
            (r'』', '，'),
            (r'〈', '，'),
            (r'〉', '，'),
            (r'［', '，'),
            (r'］', '，'),
            (r'｛', '，'),
            (r'｝', '，'),
            
            # 将列表格式转换为自然语言
            (r'^\d+\.\s+', '第'),
            (r'^[•·]\s+', ''),
            (r'^[-*]\s+', ''),
            
            # 将标题格式转换为自然语言
            (r'^#{1,6}\s+', ''),
            (r'^[一二三四五六七八九十]+、', ''),
            (r'^[①②③④⑤⑥⑦⑧⑨⑩]+', ''),
            (r'^[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]+', ''),
        ]
        
        # 需要保留的标点符号（用于语音停顿）
        self.keep_punctuation = r'[。！？，；：]'
    
    def clean_text(self, text: str) -> str:
        """
        清理文本，使其适合TTS语音合成
        
        Args:
            text: 原始文本
            
        Returns:
            str: 清理后的文本
        """
        if not text:
            return ""
        
        logger.debug(f"🧹 开始清理文本: 原始长度={len(text)}")
        
        # 1. 移除不需要的符号和格式
        cleaned_text = text
        for pattern in self.remove_patterns:
            cleaned_text = re.sub(pattern, '', cleaned_text, flags=re.MULTILINE)
        
        # 2. 替换某些符号为自然语言
        for pattern, replacement in self.replace_patterns:
            cleaned_text = re.sub(pattern, replacement, cleaned_text, flags=re.MULTILINE)
        
        # 3. 处理多余的标点符号
        cleaned_text = re.sub(r'[。！？，；：]{2,}', lambda m: m.group()[0], cleaned_text)
        
        # 4. 处理多余的空格
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
        
        # 5. 处理句子连接
        cleaned_text = self._improve_sentence_flow(cleaned_text)
        
        # 6. 最终清理
        cleaned_text = cleaned_text.strip()
        
        logger.debug(f"✅ 文本清理完成: 清理后长度={len(cleaned_text)}")
        return cleaned_text
    
    def _improve_sentence_flow(self, text: str) -> str:
        """
        改善句子流畅度
        
        Args:
            text: 待处理的文本
            
        Returns:
            str: 改善后的文本
        """
        # 处理句子之间的连接
        text = re.sub(r'([。！？])\s*([一二三四五六七八九十])', r'\1 第\2', text)
        text = re.sub(r'([。！？])\s*([①②③④⑤⑥⑦⑧⑨⑩])', r'\1 第\2', text)
        
        # 处理数字列表
        text = re.sub(r'(\d+)\s*[、，]\s*', r'第\1个，', text)
        
        # 处理项目符号
        text = re.sub(r'[•·]\s*', '，', text)
        
        # 确保句子以合适的标点结尾
        if text and not re.search(r'[。！？]$', text):
            text += '。'
        
        return text
    
    def clean_for_tts(self, text: str) -> str:
        """
        专门为TTS优化的文本清理
        
        Args:
            text: 原始文本
            
        Returns:
            str: 适合TTS的文本
        """
        # 基础清理
        cleaned = self.clean_text(text)
        
        # TTS特定优化
        cleaned = re.sub(r'([。！？])\s*([。！？])', r'\1', cleaned)  # 移除重复标点
        cleaned = re.sub(r'([，；：])\s*([，；：])', r'\1', cleaned)  # 移除重复分隔符
        
        # 确保文本不为空
        if not cleaned.strip():
            return "抱歉，我无法理解您的问题，请重新描述一下。"
        
        return cleaned
    
    def split_into_sentences(self, text: str) -> List[str]:
        """
        将文本分割为句子
        
        Args:
            text: 文本
            
        Returns:
            List[str]: 句子列表
        """
        # 按句号、感叹号、问号分割
        sentences = re.split(r'([。！？])', text)
        
        # 重组句子
        result = []
        current_sentence = ""
        
        for i, part in enumerate(sentences):
            if part in ['。', '！', '？']:
                current_sentence += part
                if current_sentence.strip():
                    result.append(current_sentence.strip())
                current_sentence = ""
            else:
                current_sentence += part
        
        # 处理最后一个句子
        if current_sentence.strip():
            result.append(current_sentence.strip())
        
        return [s for s in result if s.strip()]

# 全局文本清理器实例
text_cleaner = TextCleaner() 