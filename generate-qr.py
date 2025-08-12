#!/usr/bin/env python3
"""
生成二维码方便手机扫码访问
"""

import qrcode
import socket
import sys

def get_local_ip():
    """获取本机IP地址"""
    try:
        # 连接到一个外部地址来获取本机IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # 降级方案
        hostname = socket.gethostname()
        return socket.gethostbyname(hostname)

def generate_qr_code():
    """生成访问二维码"""
    try:
        ip_address = get_local_ip()
        url = f"http://{ip_address}:5173"
        
        print(f"🚀 投资大师圆桌会议 - 移动端访问")
        print(f"📱 手机访问地址: {url}")
        print(f"📊 后端API地址: http://{ip_address}:8000")
        print("")
        
        # 生成二维码
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        # 在终端显示二维码
        print("📱 扫描二维码访问:")
        qr.print_ascii(out=sys.stdout)
        print("")
        
        # 保存为图片文件
        try:
            img = qr.make_image(fill_color="black", back_color="white")
            img.save("mobile-access-qr.png")
            print("💾 二维码已保存为: mobile-access-qr.png")
        except Exception as e:
            print(f"⚠️  无法保存图片: {e}")
        
        print("")
        print("📋 使用说明:")
        print("1. 确保手机和电脑连接同一WiFi网络")
        print("2. 用手机扫描上方二维码或手动输入地址")
        print("3. 首次访问需要允许麦克风权限")
        print("4. 可以添加到主屏幕作为PWA应用")
        
    except Exception as e:
        print(f"❌ 生成二维码失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        import qrcode
    except ImportError:
        print("❌ 缺少qrcode库，正在安装...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "qrcode[pil]"])
        import qrcode
    
    generate_qr_code()
