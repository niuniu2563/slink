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
        body {
            padding: 0;
            align-items: flex-start;
            min-height: 100vh;
            background: var(--bg);
        }
        
        .note-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
            background: var(--card);
            border-radius: 16px;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border);
            margin-top: 40px;
            margin-bottom: 40px;
        }
        
        .note-header {
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 32px;
        }
        
        .note-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 16px;
            color: var(--text);
            line-height: 1.2;
        }
        
        .note-meta {
            color: var(--text-muted);
            font-size: 0.875rem;
            display: flex;
            gap: 24px;
            align-items: center;
        }
        
        .note-content {
            line-height: 1.8;
            color: var(--text);
            font-size: 16px;
            margin-bottom: 32px;
        }
        
        .note-actions {
            padding-top: 20px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: var(--primary);
            color: white;
            text-decoration: none;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
        }
        
        .action-btn:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }
        
        .action-btn.secondary {
            background: #6b7280;
        }
        
        .action-btn.secondary:hover {
            background: #4b5563;
        }
        
        .copy-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            z-index: 1000;
        }
        
        .copy-notification.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        /* 改进的 Markdown 样式 */
        .note-content h1, .note-content h2, .note-content h3, 
        .note-content h4, .note-content h5, .note-content h6 {
            margin: 32px 0 16px 0;
            font-weight: 600;
            line-height: 1.25;
            color: var(--text);
        }
        .note-content h1:first-child,
        .note-content h2:first-child,
        .note-content h3:first-child {
            margin-top: 0;
        }
        .note-content h1 { font-size: 2.25rem; border-bottom: 2px solid var(--border); padding-bottom: 8px; }
        .note-content h2 { font-size: 1.875rem; }
        .note-content h3 { font-size: 1.5rem; }
        .note-content h4 { font-size: 1.25rem; }
        .note-content h5 { font-size: 1.125rem; }
        .note-content h6 { font-size: 1rem; }
        
        .note-content p {
            margin: 16px 0;
        }
        
        .note-content ul, .note-content ol {
            margin: 16px 0;
            padding-left: 32px;
        }
        
        .note-content li {
            margin: 8px 0;
        }
        
        .note-content blockquote {
            margin: 24px 0;
            padding: 16px 24px;
            border-left: 4px solid var(--primary);
            background: rgba(37, 99, 235, 0.05);
            border-radius: 0 8px 8px 0;
        }
        
        .note-content blockquote p {
            margin: 0;
            font-style: italic;
            color: var(--text-muted);
        }
        
        .note-content code {
            background: rgba(0, 0, 0, 0.08);
            padding: 3px 6px;
            border-radius: 4px;
            font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            font-size: 0.9em;
            color: #d73a49;
        }
        
        .note-content pre {
            background: #f8f9fa;
            padding: 16px 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            border: 1px solid var(--border);
        }
        
        .note-content pre code {
            background: none;
            padding: 0;
            color: var(--text);
            font-size: 14px;
        }
        
        .note-content strong {
            font-weight: 600;
            color: var(--text);
        }
        
        .note-content em {
            font-style: italic;
        }
        
        .note-content a {
            color: var(--primary);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-bottom 0.2s ease;
        }
        
        .note-content a:hover {
            border-bottom-color: var(--primary);
        }
        
        .note-content hr {
            border: none;
            border-top: 2px solid var(--border);
            margin: 32px 0;
        }
        
        @media (max-width: 640px) {
            .note-container {
                margin: 16px;
                padding: 20px;
                margin-top: 20px;
            }
            
            .note-title {
                font-size: 1.5rem;
            }
            
            .note-meta {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .note-actions {
                flex-direction: column;
            }
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
            <button class="action-btn" onclick="copyContent()">
                📋 复制内容
            </button>
            <button class="action-btn secondary" onclick="copyUrl()">
                🔗 复制链接
            </button>
            <a href="/" class="action-btn secondary">
                📝 创建新便签
            </a>
        </div>
    </div>
    
    <div id="copyNotification" class="copy-notification">
        ✅ 已复制到剪贴板
    </div>
    
    <script>
        // 修复的 Markdown 渲染
        function renderMarkdown(text) {
            // 先处理双换行为段落分隔
            text = text.replace(/\n\n+/g, '</p><p>');
            
            // 标题（必须在段落处理之前）
            text = text.replace(/^### (.*$)/gm, '</p><h3>$1</h3><p>');
            text = text.replace(/^## (.*$)/gm, '</p><h2>$1</h2><p>');
            text = text.replace(/^# (.*$)/gm, '</p><h1>$1</h1><p>');
            
            // 粗体
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            // 斜体（确保不与粗体冲突）
            text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            
            // 列表项
            text = text.replace(/^- (.+$)/gm, '</p><ul><li>$1</li></ul><p>');
            
            // 链接 [text](url)
            text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
            
            // 单换行转为 <br>
            text = text.replace(/\n/g, '<br>');
            
            // 包装在段落中并清理空段落
            text = '<p>' + text + '</p>';
            text = text.replace(/<p><\/p>/g, '');
            text = text.replace(/<p>(<h[1-6])/g, '$1');
            text = text.replace(/(<\/h[1-6]>)<p>/g, '$1');
            text = text.replace(/<p>(<ul)/g, '$1');
            text = text.replace(/(<\/ul>)<p>/g, '$1');
            
            return text;
        }
        
        // 渲染内容
        const contentEl = document.getElementById('noteContent');
        contentEl.innerHTML = renderMarkdown(contentEl.textContent);
        
        // 复制内容功能
        function copyContent() {
            const contentEl = document.getElementById('noteContent');
            const text = contentEl.textContent || contentEl.innerText;
            
            navigator.clipboard.writeText(text).then(() => {
                showCopyNotification('✅ 内容已复制到剪贴板');
            }).catch(() => {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showCopyNotification('✅ 内容已复制到剪贴板');
            });
        }
        
        // 复制URL功能
        function copyUrl() {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                showCopyNotification('✅ 链接已复制到剪贴板');
            }).catch(() => {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showCopyNotification('✅ 链接已复制到剪贴板');
            });
        }
        
        function showCopyNotification(message) {
            const notification = document.getElementById('copyNotification');
            if (message) {
                notification.textContent = message;
            }
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
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