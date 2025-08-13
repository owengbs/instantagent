#!/bin/bash

# ngrok配置文件测试脚本

echo "🧪 测试ngrok配置文件..."
echo "=========================="

# 检查ngrok是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok未安装"
    exit 1
fi

# 检测ngrok版本
NGROK_VERSION=$(ngrok version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "🔍 检测到ngrok版本: $NGROK_VERSION"

# 测试配置文件
echo ""
echo "📋 测试配置文件..."

# 测试ngrok.yml (2.x)
if [ -f "ngrok.yml" ]; then
    echo "✅ 发现 ngrok.yml 文件"
    echo "📝 测试 ngrok.yml 配置..."
    
    # 验证YAML语法
    if python3 -c "import yaml; yaml.safe_load(open('ngrok.yml'))" 2>/dev/null; then
        echo "✅ ngrok.yml YAML语法正确"
    else
        echo "❌ ngrok.yml YAML语法错误"
    fi
    
    # 测试配置
    if ngrok config check --config ngrok.yml 2>/dev/null; then
        echo "✅ ngrok.yml 配置验证通过"
    else
        echo "❌ ngrok.yml 配置验证失败"
        echo "💡 错误信息："
        ngrok config check --config ngrok.yml 2>&1 | head -5
    fi
else
    echo "⚠️  ngrok.yml 文件不存在"
fi

echo ""

# 测试ngrok3.yml (3.x)
if [ -f "ngrok3.yml" ]; then
    echo "✅ 发现 ngrok3.yml 文件"
    echo "📝 测试 ngrok3.yml 配置..."
    
    # 验证YAML语法
    if python3 -c "import yaml; yaml.safe_load(open('ngrok3.yml'))" 2>/dev/null; then
        echo "✅ ngrok3.yml YAML语法正确"
    else
        echo "❌ ngrok3.yml YAML语法错误"
    fi
    
    # 测试配置
    if ngrok config check --config ngrok3.yml 2>/dev/null; then
        echo "✅ ngrok3.yml 配置验证通过"
    else
        echo "❌ ngrok3.yml 配置验证失败"
        echo "💡 错误信息："
        ngrok config check --config ngrok3.yml 2>&1 | head -5
    fi
else
    echo "⚠️  ngrok3.yml 文件不存在"
fi

echo ""

# 显示当前配置建议
echo "📋 配置建议："
if [[ "$NGROK_VERSION" == 3.* ]]; then
    echo "   • 当前使用ngrok 3.x版本"
    echo "   • 推荐使用 ngrok3.yml 配置文件"
    if [ -f "ngrok3.yml" ]; then
        echo "   • ✅ ngrok3.yml 已就绪"
    else
        echo "   • ❌ 建议创建 ngrok3.yml 文件"
    fi
elif [[ "$NGROK_VERSION" == 2.* ]]; then
    echo "   • 当前使用ngrok 2.x版本"
    echo "   • 推荐使用 ngrok.yml 配置文件"
    if [ -f "ngrok.yml" ]; then
        echo "   • ✅ ngrok.yml 已就绪"
    else
        echo "   • ❌ 建议创建 ngrok.yml 文件"
    fi
else
    echo "   • 未知ngrok版本，建议检查安装"
fi

echo ""
echo "🚀 现在可以运行启动脚本："
echo "   ./start-mobile-ngrok-advanced.sh"
echo "   或"
echo "   ./start-mobile-ngrok.sh"
