#!/bin/bash

echo "🔗 SLink KV 命名空间设置脚本"
echo "================================"

# 检查是否安装了wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

echo "📋 步骤1: 登录Cloudflare (如果尚未登录)"
echo "运行: wrangler login"
echo ""

echo "📋 步骤2: 创建KV命名空间"
echo "运行以下命令并记录输出的ID:"
echo ""
echo "wrangler kv:namespace create \"SLINK_KV\""
echo "wrangler kv:namespace create \"SLINK_KV\" --preview"
echo ""

echo "📋 步骤3: 更新wrangler.toml"
echo "在wrangler.toml文件中，取消注释KV配置部分并替换为实际的ID:"
echo ""
echo "[[kv_namespaces]]"
echo "binding = \"SLINK_KV\""
echo "id = \"你的生产KV命名空间ID\""
echo "preview_id = \"你的预览KV命名空间ID\""
echo ""

echo "📋 步骤4: 重新部署"
echo "提交更改并推送到GitHub，Cloudflare Pages会自动重新部署"
echo ""

echo "💡 提示: 你也可以通过Cloudflare Dashboard手动创建KV命名空间"
echo "路径: Dashboard > Workers & Pages > KV"