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

```bash
# 安装wrangler CLI
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 创建KV命名空间
wrangler kv:namespace create "SLINK_KV"
wrangler kv:namespace create "SLINK_KV" --preview
```

#### 步骤2：更新wrangler.toml

将命令输出的KV命名空间ID替换到 `wrangler.toml` 中：

```toml
[[kv_namespaces]]
binding = "SLINK_KV"
id = "你的KV命名空间ID"
preview_id = "你的预览KV命名空间ID"
```

#### 步骤3：部署到Cloudflare Pages

**方法1：通过Cloudflare Dashboard (推荐)**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 "Pages" 部分
3. 点击 "Create a project"
4. 选择 "Connect to Git"
5. 选择你的GitHub仓库 `niuniu2563/slink`
6. 配置构建设置：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `public`
7. 在 "Environment variables" 中添加KV绑定：
   - Variable name: `SLINK_KV`
   - Value: 你的KV命名空间ID
8. 点击 "Save and Deploy"

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