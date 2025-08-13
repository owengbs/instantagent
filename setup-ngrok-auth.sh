#!/bin/bash

# ngrok authtoken配置脚本

echo "🔑 配置ngrok authtoken..."
echo "=========================="

# 检查ngrok是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok未安装，请先安装ngrok"
    echo "💡 安装方法："
    echo "   brew install ngrok (macOS)"
    echo "   snap install ngrok (Ubuntu)"
    echo "   或访问 https://ngrok.com/download"
    exit 1
fi

echo "✅ ngrok已安装"

# 检查是否已有authtoken
if ngrok config check 2>/dev/null; then
    echo "✅ 发现现有ngrok配置"
    echo "📋 当前配置信息："
    ngrok config check
    echo ""
    echo "💡 如果仍有认证问题，请重新配置authtoken"
fi

echo ""
echo "🔑 配置ngrok authtoken"
echo "======================"
echo ""
echo "📋 获取authtoken的步骤："
echo "1. 访问: https://dashboard.ngrok.com/signup"
echo "2. 注册一个免费账号"
echo "3. 登录后访问: https://dashboard.ngrok.com/get-started/your-authtoken"
echo "4. 复制你的authtoken"
echo ""

# 提示用户输入authtoken
read -p "请输入你的ngrok authtoken: " AUTHTOKEN

if [ -z "$AUTHTOKEN" ]; then
    echo "❌ 未输入authtoken，退出配置"
    exit 1
fi

echo ""
echo "🔄 正在配置authtoken..."

# 配置authtoken
if ngrok config add-authtoken "$AUTHTOKEN" 2>/dev/null; then
    echo "✅ authtoken配置成功！"
    echo ""
    echo "🧪 验证配置..."
    if ngrok config check 2>/dev/null; then
        echo "✅ 配置验证通过"
        echo ""
        echo "🎉 ngrok配置完成！现在可以运行启动脚本了："
        echo "   ./start-mobile-ngrok-advanced.sh"
        echo "   或"
        echo "   ./start-mobile-ngrok.sh"
    else
        echo "❌ 配置验证失败，请检查authtoken是否正确"
    fi
else
    echo "❌ authtoken配置失败"
    echo "💡 请检查："
    echo "   1. authtoken是否正确"
    echo "   2. 网络连接是否正常"
    echo "   3. ngrok服务是否可用"
fi

echo ""
echo "📚 更多帮助："
echo "   • ngrok官方文档: https://ngrok.com/docs"
echo "   • 错误代码说明: https://ngrok.com/docs/errors"
echo "   • 免费版限制: https://ngrok.com/pricing"
