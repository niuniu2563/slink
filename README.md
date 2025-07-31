# SLink 🔗

简洁高效的短链生成服务，基于 Cloudflare Pages 和 Functions 构建。

## ✨ 特性

- 🚀 **极速访问** - 全球 CDN 加速
- 🎨 **简约设计** - 清爽现代的界面
- 🔧 **自定义短码** - 支持个性化短链
- 📊 **访问统计** - 实时点击统计
- 🛡️ **自动清理** - 智能管理存储空间
- 💰 **完全免费** - 基于 Cloudflare 免费服务

## 🚀 部署指南

### 1. 创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **KV**
3. 点击 **Create a namespace**
4. 命名空间名称输入: `SLINK_KV`
5. 点击 **Add** 创建
6. 复制生成的命名空间 ID

### 2. 配置项目

1. Fork 这个仓库到您的 GitHub 账户
2. 修改 `wrangler.toml` 文件中的 KV 命名空间 ID：
   ```toml
   [[kv_namespaces]]
   binding = "SLINK_KV"
   id = "YOUR_KV_NAMESPACE_ID"  # 替换为您的实际 ID
   ```
3. 提交并推送更改

### 3. 部署到 Cloudflare Pages

1. 在 Cloudflare Dashboard 中，进入 **Pages** → **Create a project**
2. 连接您的 GitHub 仓库
3. 选择 `slink` 仓库
4. 配置构建设置：
   - **Build command**: 留空
   - **Build output directory**: `.`
   - **Root directory**: 留空
5. 点击 **Save and Deploy**

### 4. 验证部署

部署完成后，访问您的 Pages 域名即可使用短链服务。

## 📁 项目结构

```
slink/
├── index.html              # 前端页面
├── assets/                 # 静态资源
│   ├── style.css
│   └── script.js
├── functions/              # 后端函数
│   ├── shorten.js         # 短链生成
│   └── [slug].js          # 短链重定向
└── wrangler.toml          # Cloudflare 配置
```

## 🔧 API 接口

### 生成短链

```bash
POST /shorten
Content-Type: application/json

{
  "url": "https://example.com",
  "customSlug": "optional-custom-slug"
}
```

**响应:**
```json
{
  "success": true,
  "shortUrl": "https://your-domain.pages.dev/abc123",
  "originalUrl": "https://example.com",
  "slug": "abc123",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 访问短链

```bash
GET /{slug}
```

自动重定向到原始 URL 并记录访问统计。

## 🎯 核心功能

### 自动清理机制

当 KV 存储空间不足时，系统会：
- 自动删除最旧的 10% 数据
- 保证新短链能够正常创建
- 维护时间索引确保清理准确性

### 访问统计

- 实时记录点击次数
- 追踪最后访问时间
- 异步更新不影响重定向速度

## 🛠️ 技术栈

- **前端**: 原生 HTML/CSS/JavaScript
- **后端**: Cloudflare Functions
- **存储**: Cloudflare KV
- **部署**: Cloudflare Pages
- **字体**: LXGW WenKai Screen

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！