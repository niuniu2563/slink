# SLink 🔗

简洁高效的短链生成服务，基于 Cloudflare Pages 和 Functions 构建。

## ✨ 特性

- 🚀 **极速访问** - 全球 CDN 加速
- 🎨 **简约设计** - 清爽现代的界面
- 🔧 **自定义短码** - 支持个性化短链
- 📊 **访问统计** - 实时点击统计
- 🛡️ **自动清理** - 智能管理存储空间
- 💰 **完全免费** - 基于 Cloudflare 免费服务

## 🏗️ 技术栈

- **前端**: 原生 HTML/CSS/JavaScript
- **后端**: Cloudflare Functions
- **存储**: Cloudflare KV
- **部署**: Cloudflare Pages

## 🚀 快速开始

### 1. 部署到 Cloudflare Pages

1. Fork 这个仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 "Pages" → "Create a project"
4. 连接你的 GitHub 仓库
5. 配置构建设置：
   - Build command: 留空
   - Build output directory: `.`

### 2. 配置 KV 存储

项目会自动创建所需的 KV 命名空间，无需手动配置。

## 📁 项目结构

```
slink/
├── index.html              # 前端页面
├── assets/                 # 静态资源
│   ├── style.css
│   └── script.js
├── functions/              # 后端函数
│   ├── shorten.js         # 短链生成
│   └── _middleware.js     # 路由中间件
├── wrangler.toml          # Cloudflare 配置
└── README.md              # 项目说明
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

## 🛠️ 本地开发

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 本地开发
wrangler pages dev .

# 部署
wrangler pages deploy .
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

⚡ 由 [Cloudflare Pages](https://pages.cloudflare.com) 强力驱动