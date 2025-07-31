# SLink 部署指南

## 问题排查：静态资源404错误

如果遇到 `style.css` 和 `script.js` 404错误，可能的原因和解决方案：

### 1. 本地开发测试

如果你直接在浏览器中打开 `public/index.html` 文件，会出现404错误，因为浏览器的安全策略不允许本地文件加载其他本地文件。

**解决方案：启动本地服务器**

```bash
# 方法1：使用Python（推荐）
cd slink
python3 -m http.server 8000 --directory public
# 然后访问 http://localhost:8000

# 方法2：使用npm脚本
npm run serve

# 方法3：使用Wrangler开发服务器
npm run dev
```

### 2. Cloudflare Pages 部署

#### 步骤1：创建KV命名空间

**方法A：使用Wrangler CLI（推荐）**

```bash
# 1. 安装wrangler CLI（如果未安装）
npm install -g wrangler

# 2. 登录Cloudflare
wrangler login

# 3. 创建KV命名空间
wrangler kv:namespace create "SLINK_KV"
# 输出示例: 🌀 Creating namespace with title "slink-SLINK_KV"
# ✨ Success!
# Add the following to your configuration file in your kv_namespaces array:
# { binding = "SLINK_KV", id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" }

wrangler kv:namespace create "SLINK_KV" --preview
# 输出示例: 🌀 Creating namespace with title "slink-SLINK_KV_preview"
# ✨ Success!
# Add the following to your configuration file in your kv_namespaces array:
# { binding = "SLINK_KV", preview_id = "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4" }
```

**方法B：通过Cloudflare Dashboard**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 "Workers & Pages" → "KV"
3. 点击 "Create a namespace"
4. 名称：`SLINK_KV`
5. 记录创建后显示的命名空间ID

#### 步骤2：更新wrangler.toml

在 `wrangler.toml` 文件中，取消注释KV配置部分并替换为实际的ID：

```toml
# 取消注释并替换为你的实际ID
[[kv_namespaces]]
binding = "SLINK_KV"
id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  # 替换为你的生产KV命名空间ID
preview_id = "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4"  # 替换为你的预览KV命名空间ID
```

**重要：** 你也可以运行 `./setup-kv.sh` 脚本查看详细设置步骤。

#### 步骤3：部署到Cloudflare Pages

**方法1：通过Cloudflare Dashboard (推荐)**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 "Pages" 部分
3. 点击 "Create a project"
4. 选择 "Connect to Git"
5. 选择你的GitHub仓库 `niuniu2563/slink`
6. **重要：配置构建设置**：
   - Framework preset: `None`
   - Build command: **留空**（非常重要！）
   - Build output directory: `public`
   - Root directory: **留空**（使用根目录）
7. 在项目设置的 "Functions" 标签页中添加KV绑定：
   - 进入 "Settings" → "Functions"
   - 在 "KV namespace bindings" 部分点击 "Add binding"
   - Variable name: `SLINK_KV`
   - KV namespace: 选择你创建的KV命名空间
8. 点击 "Save and Deploy"

**静态文件404问题解决方案：**

如果遇到CSS和JS文件404错误，这通常是Cloudflare Pages构建配置问题：

1. **检查构建输出目录**：确保设置为 `public`
2. **确保构建命令为空**：不要添加任何构建命令
3. **检查根目录设置**：应该为空（使用仓库根目录）
4. **临时解决方案**：如果问题持续，可以访问 `/index-inline.html` 使用内联版本

**方法2：通过Wrangler CLI**

```bash
# 直接部署
wrangler pages deploy public --project-name slink
```

#### 步骤4：配置自定义域名（可选）

在Cloudflare Pages项目设置中，可以添加自定义域名。

### 3. 验证部署

部署成功后，访问你的Pages域名（如 `https://slink.pages.dev`），应该能正常加载CSS和JS文件。

### 4. 常见问题

**Q: 仍然出现404错误？**
- 确认KV命名空间已正确创建和绑定
- 检查wrangler.toml配置是否正确
- 查看Cloudflare Pages的部署日志

**Q: API请求失败？**
- 确认Functions正确部署在 `/functions` 目录
- 检查KV命名空间绑定是否正确
- 查看Function的执行日志

**Q: 本地开发时Functions不工作？**
- 使用 `wrangler pages dev public` 而不是简单的HTTP服务器
- 确保wrangler.toml配置正确

## 测试API

部署成功后，可以测试API端点：

```bash
# 生成短链
curl -X POST https://your-domain.pages.dev/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "customSlug": "test"}'

# 获取统计
curl https://your-domain.pages.dev/api/stats?slug=test

# 测试重定向
curl -I https://your-domain.pages.dev/test
```