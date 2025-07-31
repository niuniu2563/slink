# SLink - 短链生成服务

基于 Cloudflare Pages 和 Functions 构建的完全托管短链生成服务。

## 功能特性

- ✨ 简洁优雅的 Web 界面
- 🔗 支持自定义短码
- 📊 基础访问统计
- ⚡ 全球 CDN 加速
- 🛡️ 内置安全防护
- 💰 完全免费托管

## 技术栈

- **前端**: 原生 HTML/CSS/JavaScript
- **后端**: Cloudflare Functions (Workers)
- **存储**: Cloudflare KV
- **部署**: Cloudflare Pages

## 部署步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd slink
```

### 2. 安装依赖

```bash
npm install
```

### 3. 创建 KV 命名空间

```bash
# 创建生产环境KV
wrangler kv:namespace create "SLINK_KV"

# 创建预览环境KV
wrangler kv:namespace create "SLINK_KV" --preview
```

### 4. 更新 wrangler.toml

将命令输出的 KV 命名空间 ID 替换到 `wrangler.toml` 文件中：

```toml
[[kv_namespaces]]
binding = "SLINK_KV"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
```

### 5. 本地开发

```bash
npm run dev
```

### 6. 部署到 Cloudflare Pages

```bash
npm run deploy
```

## API 文档

### 生成短链

```bash
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com",
  "customSlug": "optional-custom-slug"
}
```

### 获取统计信息

```bash
GET /api/stats?slug=abc123
```

### 短链重定向

```bash
GET /{slug}
```

## 项目结构

```
slink/
├── public/
│   ├── index.html          # 短链生成页面
│   ├── style.css           # 样式文件
│   └── script.js           # 前端逻辑
├── functions/
│   ├── api/
│   │   ├── shorten.js      # 生成短链API
│   │   └── stats.js        # 统计信息API
│   └── [slug].js           # 短链重定向处理
├── wrangler.toml           # Cloudflare配置
├── package.json            # 项目配置
└── README.md               # 说明文档
```

## 配置说明

### 环境变量

- `SLINK_KV`: KV 存储绑定名称

### KV 存储结构

- `url:{slug}`: 存储短链数据
- `reverse:{hash}`: URL 反向索引

## 安全特性

- URL 格式验证
- 自定义 slug 格式限制
- 防重复 slug 检查
- XSS 防护
- 错误处理和日志记录

## 性能优化

- 全球 CDN 分发
- KV 存储就近访问
- 异步统计更新
- 轻量级前端代码

## 许可证

MIT License