/**
 * 移动端分享管理器
 * 支持原生分享API、社交媒体分享、剪贴板分享等
 */

import { deviceInfo } from './mobileDetection';

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface ShareOptions {
  platform?: 'native' | 'clipboard' | 'qr' | 'social';
  socialPlatform?: 'wechat' | 'weibo' | 'qq' | 'twitter' | 'facebook';
  includeQR?: boolean;
  customMessage?: string;
}

interface ShareResult {
  success: boolean;
  method: string;
  error?: string;
}

class ShareManager {
  private supportedFeatures: {
    nativeShare: boolean;
    clipboard: boolean;
    qrCode: boolean;
    socialShare: boolean;
  };

  constructor() {
    this.supportedFeatures = {
      nativeShare: 'share' in navigator && deviceInfo.isMobile,
      clipboard: 'clipboard' in navigator && 'writeText' in navigator.clipboard,
      qrCode: true, // 总是支持生成二维码
      socialShare: deviceInfo.isWechat || deviceInfo.isMobile
    };

    console.log('📤 Share Manager initialized:', this.supportedFeatures);
  }

  /**
   * 智能分享 - 自动选择最佳分享方式
   */
  async smartShare(data: ShareData, options: ShareOptions = {}): Promise<ShareResult> {
    try {
      // 1. 优先使用原生分享API（移动端）
      if (this.supportedFeatures.nativeShare && options.platform !== 'clipboard') {
        const result = await this.nativeShare(data);
        if (result.success) {
          return result;
        }
      }

      // 2. 微信环境特殊处理
      if (deviceInfo.isWechat) {
        return await this.wechatShare(data, options);
      }

      // 3. 社交媒体分享
      if (options.socialPlatform && this.supportedFeatures.socialShare) {
        return await this.socialShare(data, options.socialPlatform);
      }

      // 4. 剪贴板分享
      if (this.supportedFeatures.clipboard) {
        return await this.clipboardShare(data, options);
      }

      // 5. 降级到二维码分享
      return await this.qrCodeShare(data, options);

    } catch (error) {
      console.error('❌ Smart share failed:', error);
      return {
        success: false,
        method: 'error',
        error: error instanceof Error ? error.message : '分享失败'
      };
    }
  }

  /**
   * 原生分享API
   */
  async nativeShare(data: ShareData): Promise<ShareResult> {
    try {
      if (!this.supportedFeatures.nativeShare) {
        throw new Error('原生分享不支持');
      }

      const shareData: any = {
        title: data.title || '投资大师圆桌会议',
        text: data.text || '与AI投资大师进行深度对话，获取专业投资见解',
        url: data.url || window.location.href
      };

      // 添加文件分享（如果支持）
      if (data.files && data.files.length > 0) {
        shareData.files = data.files;
      }

      await navigator.share(shareData);

      return {
        success: true,
        method: 'native'
      };
    } catch (error) {
      // 用户取消分享不算错误
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          error: '用户取消分享'
        };
      }

      console.error('❌ Native share failed:', error);
      return {
        success: false,
        method: 'native',
        error: error instanceof Error ? error.message : '原生分享失败'
      };
    }
  }

  /**
   * 微信分享
   */
  async wechatShare(data: ShareData, options: ShareOptions): Promise<ShareResult> {
    try {
      // 微信环境下的分享提示
      this.showWechatShareGuide(data);
      
      return {
        success: true,
        method: 'wechat-guide'
      };
    } catch (error) {
      console.error('❌ WeChat share failed:', error);
      return {
        success: false,
        method: 'wechat',
        error: '微信分享失败'
      };
    }
  }

  /**
   * 显示微信分享指引
   */
  private showWechatShareGuide(data: ShareData) {
    // 创建分享指引遮罩
    const overlay = document.createElement('div');
    overlay.className = 'share-guide-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 20px;
    `;

    const guide = document.createElement('div');
    guide.className = 'share-guide';
    guide.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin: 20px;
      text-align: center;
      max-width: 300px;
      position: relative;
    `;

    guide.innerHTML = `
      <div style="margin-bottom: 16px;">
        <svg width="24" height="24" fill="currentColor" style="color: #07C160;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4z"/>
        </svg>
      </div>
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #333;">分享到微信</h3>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #666; line-height: 1.4;">
        点击右上角菜单按钮<br/>
        选择"分享给朋友"或"分享到朋友圈"
      </p>
      <button id="share-guide-close" style="
        background: #07C160;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
      ">知道了</button>
    `;

    overlay.appendChild(guide);
    document.body.appendChild(overlay);

    // 添加关闭事件
    const closeBtn = guide.querySelector('#share-guide-close');
    const closeGuide = () => {
      document.body.removeChild(overlay);
    };

    closeBtn?.addEventListener('click', closeGuide);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeGuide();
      }
    });

    // 5秒后自动关闭
    setTimeout(closeGuide, 5000);
  }

  /**
   * 社交媒体分享
   */
  async socialShare(data: ShareData, platform: string): Promise<ShareResult> {
    try {
      const shareUrl = this.buildSocialShareUrl(data, platform);
      
      if (deviceInfo.isMobile) {
        // 移动端直接跳转
        window.location.href = shareUrl;
      } else {
        // 桌面端打开新窗口
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }

      return {
        success: true,
        method: `social-${platform}`
      };
    } catch (error) {
      console.error(`❌ Social share (${platform}) failed:`, error);
      return {
        success: false,
        method: `social-${platform}`,
        error: `${platform}分享失败`
      };
    }
  }

  /**
   * 构建社交媒体分享URL
   */
  private buildSocialShareUrl(data: ShareData, platform: string): string {
    const url = encodeURIComponent(data.url || window.location.href);
    const title = encodeURIComponent(data.title || '投资大师圆桌会议');
    const text = encodeURIComponent(data.text || '与AI投资大师进行深度对话');

    const shareUrls: Record<string, string> = {
      wechat: `weixin://dl/scan?token=${url}`, // 微信扫码
      weibo: `https://service.weibo.com/share/share.php?url=${url}&title=${title}&pic=`,
      qq: `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&desc=${text}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&t=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${title}`
    };

    return shareUrls[platform] || shareUrls.twitter;
  }

  /**
   * 剪贴板分享
   */
  async clipboardShare(data: ShareData, options: ShareOptions = {}): Promise<ShareResult> {
    try {
      if (!this.supportedFeatures.clipboard) {
        throw new Error('剪贴板不支持');
      }

      const shareText = this.buildShareText(data, options);
      await navigator.clipboard.writeText(shareText);

      // 显示复制成功提示
      this.showCopySuccessNotification();

      return {
        success: true,
        method: 'clipboard'
      };
    } catch (error) {
      console.error('❌ Clipboard share failed:', error);
      
      // 降级到选择文本方式
      return this.fallbackTextSelection(data, options);
    }
  }

  /**
   * 构建分享文本
   */
  private buildShareText(data: ShareData, options: ShareOptions): string {
    const parts = [];
    
    if (data.title) {
      parts.push(data.title);
    }
    
    if (data.text) {
      parts.push(data.text);
    }
    
    if (options.customMessage) {
      parts.push(options.customMessage);
    }
    
    if (data.url) {
      parts.push(data.url);
    }

    return parts.join('\n\n');
  }

  /**
   * 降级文本选择
   */
  private fallbackTextSelection(data: ShareData, options: ShareOptions): ShareResult {
    try {
      const shareText = this.buildShareText(data, options);
      
      // 创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      // 尝试复制
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        this.showCopySuccessNotification();
        return {
          success: true,
          method: 'text-selection'
        };
      } else {
        throw new Error('文本选择复制失败');
      }
    } catch (error) {
      return {
        success: false,
        method: 'text-selection',
        error: '复制到剪贴板失败'
      };
    }
  }

  /**
   * 二维码分享
   */
  async qrCodeShare(data: ShareData, options: ShareOptions = {}): Promise<ShareResult> {
    try {
      const qrCodeUrl = await this.generateQRCode(data.url || window.location.href);
      this.showQRCodeModal(qrCodeUrl, data);
      
      return {
        success: true,
        method: 'qr-code'
      };
    } catch (error) {
      console.error('❌ QR code share failed:', error);
      return {
        success: false,
        method: 'qr-code',
        error: '二维码生成失败'
      };
    }
  }

  /**
   * 生成二维码
   */
  private async generateQRCode(text: string): Promise<string> {
    // 使用在线二维码生成服务
    const qrCodeApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    return qrCodeApi;
  }

  /**
   * 显示二维码模态框
   */
  private showQRCodeModal(qrCodeUrl: string, data: ShareData) {
    const overlay = document.createElement('div');
    overlay.className = 'qr-code-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.className = 'qr-code-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin: 20px;
      text-align: center;
      max-width: 300px;
    `;

    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #333;">扫码分享</h3>
      <div style="margin: 16px 0;">
        <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 8px;" />
      </div>
      <p style="margin: 16px 0; font-size: 14px; color: #666;">
        使用手机扫描二维码访问
      </p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="qr-save" style="
          background: #3B82F6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
        ">保存图片</button>
        <button id="qr-close" style="
          background: #6B7280;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
        ">关闭</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 添加事件监听器
    const closeBtn = modal.querySelector('#qr-close');
    const saveBtn = modal.querySelector('#qr-save');
    
    const closeModal = () => {
      document.body.removeChild(overlay);
    };

    closeBtn?.addEventListener('click', closeModal);
    saveBtn?.addEventListener('click', () => {
      this.downloadQRCode(qrCodeUrl, data.title || 'qr-code');
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }

  /**
   * 下载二维码
   */
  private async downloadQRCode(qrCodeUrl: string, filename: string) {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error('❌ Download QR code failed:', error);
    }
  }

  /**
   * 显示复制成功通知
   */
  private showCopySuccessNotification() {
    const notification = document.createElement('div');
    notification.className = 'copy-success-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #10B981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10001;
      animation: fadeInOut 2s ease-in-out;
    `;
    notification.textContent = '✓ 已复制到剪贴板';

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // 2秒后移除
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
      if (style.parentNode) {
        document.head.removeChild(style);
      }
    }, 2000);
  }

  /**
   * 检查分享支持情况
   */
  public checkSupport(): typeof this.supportedFeatures {
    return { ...this.supportedFeatures };
  }

  /**
   * 获取推荐的分享方式
   */
  public getRecommendedShareMethod(): string {
    if (deviceInfo.isWechat) return 'wechat';
    if (this.supportedFeatures.nativeShare) return 'native';
    if (this.supportedFeatures.clipboard) return 'clipboard';
    return 'qr-code';
  }

  /**
   * 分享会话纪要
   */
  async shareMeetingSummary(summaryData: {
    title: string;
    content: string;
    participants: string[];
    timestamp: string;
  }): Promise<ShareResult> {
    const shareData: ShareData = {
      title: `📋 ${summaryData.title}`,
      text: `参与者：${summaryData.participants.join('、')}\n时间：${summaryData.timestamp}\n\n摘要：\n${summaryData.content.slice(0, 200)}...`,
      url: window.location.href
    };

    return this.smartShare(shareData, { includeQR: true });
  }

  /**
   * 分享音频片段
   */
  async shareAudioClip(audioBlob: Blob, title: string = '语音片段'): Promise<ShareResult> {
    try {
      const file = new File([audioBlob], `${title}.wav`, { type: 'audio/wav' });
      
      const shareData: ShareData = {
        title: `🎵 ${title}`,
        text: '来自投资大师圆桌会议的语音片段',
        files: [file]
      };

      return this.smartShare(shareData);
    } catch (error) {
      console.error('❌ Share audio clip failed:', error);
      return {
        success: false,
        method: 'audio',
        error: '音频分享失败'
      };
    }
  }
}

// 创建全局分享管理器实例
export const shareManager = new ShareManager();

// 导出类型和工具
export { ShareManager };
export type { ShareData, ShareOptions, ShareResult };
