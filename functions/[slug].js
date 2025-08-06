export async function onRequest(context) {
    const { env, params } = context;
    const slug = params.slug;

    if (!slug || slug.includes('.')) {
        return new Response('Not Found', { status: 404 });
    }

    try {
        // 首先尝试查找便签
        let dataStr = await env.SLINK_KV.get(`note:${slug}`);
        let isNote = false;
        
        if (dataStr) {
            isNote = true;
        } else {
            // 如果不是便签，查找短链
            dataStr = await env.SLINK_KV.get(`url:${slug}`);
        }
        
        if (!dataStr) {
            return Response.redirect('/', 302);
        }

        const data = JSON.parse(dataStr);
        
        if (isNote) {
            // 便签预览：更新访问统计并返回HTML页面
            context.waitUntil(
                env.SLINK_KV.put(`note:${slug}`, JSON.stringify({
                    ...data,
                    viewCount: (data.viewCount || 0) + 1,
                    lastAccessed: new Date().toISOString()
                })).catch(() => {
                    console.warn(`Failed to update stats for note ${slug}`);
                })
            );

            return new Response(generateNoteHTML(data), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        } else {
            // 短链重定向：确保URL格式正确
            let redirectUrl = data.originalUrl; 
            if (!/^https?:\/\//i.test(redirectUrl)) {
                redirectUrl = 'https://' + redirectUrl;
            }
            
            // 异步更新访问统计
            context.waitUntil(
                env.SLINK_KV.put(`url:${slug}`, JSON.stringify({
                    ...data,
                    clickCount: (data.clickCount || 0) + 1,
                    lastAccessed: new Date().toISOString()
                })).catch(() => {
                    console.warn(`Failed to update stats for ${slug}`);
                })
            );

            return Response.redirect(redirectUrl, 302);
        }

    } catch (error) {
        console.error('Redirect error:', error);
        return Response.redirect('/', 302);
    }
}

function generateNoteHTML(noteData) {
    const title = noteData.title || '便签预览';
    const content = noteData.content || '';
    const createdAt = new Date(noteData.createdAt).toLocaleString('zh-CN');
    const viewCount = noteData.viewCount || 0;
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - SLink 便签</title>
    <link rel="stylesheet" href="/assets/style.css">
    <style>
        .note-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
        }
        .note-header {
            border-bottom: 1px solid var(--border);
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .note-title {
            font-size: 1.875rem;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--text);
        }
        .note-meta {
            color: var(--text-muted);
            font-size: 0.875rem;
            display: flex;
            gap: 16px;
        }
        .note-content {
            line-height: 1.7;
            color: var(--text);
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .note-actions {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
            text-align: center;
        }
        .back-btn {
            display: inline-block;
            padding: 8px 16px;
            background: var(--primary);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            transition: background 0.2s ease;
        }
        .back-btn:hover {
            background: var(--primary-hover);
        }
        
        /* 基础 Markdown 样式 */
        .note-content h1, .note-content h2, .note-content h3, 
        .note-content h4, .note-content h5, .note-content h6 {
            margin: 24px 0 16px 0;
            font-weight: 600;
            line-height: 1.25;
        }
        .note-content h1 { font-size: 2rem; }
        .note-content h2 { font-size: 1.5rem; }
        .note-content h3 { font-size: 1.25rem; }
        .note-content h4 { font-size: 1.125rem; }
        .note-content h5 { font-size: 1rem; }
        .note-content h6 { font-size: 0.875rem; }
        
        .note-content p {
            margin: 16px 0;
        }
        
        .note-content ul, .note-content ol {
            margin: 16px 0;
            padding-left: 24px;
        }
        
        .note-content li {
            margin: 4px 0;
        }
        
        .note-content blockquote {
            margin: 16px 0;
            padding: 8px 16px;
            border-left: 4px solid var(--primary);
            background: rgba(37, 99, 235, 0.05);
            color: var(--text-muted);
        }
        
        .note-content code {
            background: rgba(0, 0, 0, 0.05);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            font-size: 0.875em;
        }
        
        .note-content pre {
            background: rgba(0, 0, 0, 0.05);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 16px 0;
        }
        
        .note-content pre code {
            background: none;
            padding: 0;
        }
        
        .note-content strong {
            font-weight: 600;
        }
        
        .note-content em {
            font-style: italic;
        }
        
        .note-content a {
            color: var(--primary);
            text-decoration: none;
        }
        
        .note-content a:hover {
            text-decoration: underline;
        }
        
        .note-content hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div class="note-container">
        <div class="note-header">
            ${title ? `<h1 class="note-title">${escapeHtml(title)}</h1>` : ''}
            <div class="note-meta">
                <span>📅 ${createdAt}</span>
                <span>👀 ${viewCount} 次查看</span>
            </div>
        </div>
        
        <div class="note-content" id="noteContent">${escapeHtml(content)}</div>
        
        <div class="note-actions">
            <a href="/" class="back-btn">📝 创建新便签</a>
        </div>
    </div>
    
    <script>
        // 简单的 Markdown 渲染
        function renderMarkdown(text) {
            return text
                // 标题
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                // 粗体和斜体
                .replace(/\\*\\*(.*?)\\*\\*/gim, '<strong>$1</strong>')
                .replace(/\\*(.*?)\\*/gim, '<em>$1</em>')
                // 代码块
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/gim, '<pre><code>$1</code></pre>')
                .replace(/\`(.*?)\`/gim, '<code>$1</code>')
                // 链接
                .replace(/\\[([^\\]]+)\\]\\(([^\\)]+)\\)/gim, '<a href="$2">$1</a>')
                // 列表
                .replace(/^- (.*$)/gim, '<li>$1</li>')
                .replace(/(<li>.*<\\/li>)/gims, '<ul>$1</ul>')
                // 引用
                .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
                // 分隔线
                .replace(/^---$/gim, '<hr>')
                // 段落
                .replace(/\\n\\n/gim, '</p><p>')
                .replace(/^(.+)$/gim, '<p>$1</p>');
        }
        
        // 渲染内容
        const contentEl = document.getElementById('noteContent');
        contentEl.innerHTML = renderMarkdown(contentEl.textContent);
    </script>
</body>
</html>`;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}