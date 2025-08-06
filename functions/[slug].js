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
            margin-top: 32px;
            margin-bottom: 32px;
        }
        
        .note-header {
            border-bottom: 1px solid var(--border);
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        
        .note-title {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 12px;
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
            line-height: 1.6;
            color: var(--text);
            font-size: 16px;
            margin-bottom: 24px;
            word-wrap: break-word;
            text-align: justify;
        }
        
        /* Markdown样式 */
        .note-content h1, .note-content h2, .note-content h3 {
            margin: 0 !important;
            padding: 0 !important;
            font-weight: 600;
            line-height: 1.2;
            color: var(--text);
            display: block;
        }
        
        .note-content h1 {
            font-size: 1.875rem;
            border-bottom: 2px solid var(--border);
            padding-bottom: 0 !important;
            margin: 0 !important;
        }
        
        .note-content h2 {
            font-size: 1.5rem;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        .note-content h3 {
            font-size: 1.25rem;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        .note-content p {
            margin: 0 !important;
            padding: 0 !important;
            text-align: justify;
        }
        
        .note-content strong {
            font-weight: 600;
            color: var(--text);
        }
        
        .note-content em {
            font-style: italic;
        }
        
        .note-content code {
            background: var(--code-bg, #f3f4f6);
            color: var(--code-text, #1f2937);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.875em;
        }
        
        .note-content pre {
            background: var(--code-bg, #f3f4f6);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 8px;
            overflow-x: auto;
            margin: 0;
        }
        
        .note-content pre code {
            background: none;
            padding: 0;
            color: var(--code-text, #1f2937);
            font-size: 14px;
        }
        
        .note-content ul {
            margin: 0 !important;
            padding-left: 20px !important;
            line-height: 1 !important;
        }
        
        .note-content li {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1 !important;
            display: list-item !important;
        }
        
        .note-content blockquote {
            border-left: 4px solid var(--primary);
            background: var(--quote-bg, #f9fafb);
            margin: 0;
            padding: 8px 12px;
            border-radius: 0 6px 6px 0;
            color: var(--text-muted);
            font-style: italic;
        }
        
        .note-content hr {
            border: none;
            border-top: 2px solid var(--border);
            margin: 0;
            border-radius: 2px;
        }
        
        .note-content a {
            color: var(--primary);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-bottom-color 0.2s ease;
        }
        
        .note-content a:hover {
            border-bottom-color: var(--primary);
        }
        
        .note-actions {
            padding-top: 16px;
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
            margin: 0 !important;
            padding-left: 20px !important;
            line-height: 1 !important;
        }
        
        .note-content li {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1 !important;
            display: list-item !important;
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
        
        <div class="note-content" id="noteContent">${renderMarkdownContent(content)}</div>
        
        <div class="note-actions">
            <button class="action-btn" onclick="copyOriginalContent()">
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
        // 原始内容存储（用于复制）
        const originalContent = ${JSON.stringify(content)};
        
        // 复制原始内容功能
        function copyOriginalContent() {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(originalContent).then(() => {
                    showCopyNotification('✅ 内容已复制到剪贴板');
                }).catch(err => {
                    console.error('Clipboard write failed:', err);
                    fallbackCopy(originalContent, '✅ 内容已复制到剪贴板');
                });
            } else {
                fallbackCopy(originalContent, '✅ 内容已复制到剪贴板');
            }
        }
        
        // 降级复制方案
        function fallbackCopy(text, message) {
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '-9999px';
                textArea.style.opacity = '0';
                textArea.setAttribute('readonly', '');
                document.body.appendChild(textArea);
                
                // 选择文本
                textArea.select();
                textArea.setSelectionRange(0, text.length);
                
                // 执行复制
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (success) {
                    showCopyNotification(message);
                } else {
                    showCopyNotification('❌ 复制失败，请手动选择复制');
                }
            } catch (e) {
                console.error('Fallback copy failed:', e);
                showCopyNotification('❌ 复制失败，请手动选择复制');
            }
        }
        
        // 复制URL功能
        function copyUrl() {
            const url = window.location.href;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    showCopyNotification('✅ 链接已复制到剪贴板');
                }).catch(err => {
                    console.error('URL copy failed:', err);
                    fallbackCopy(url, '✅ 链接已复制到剪贴板');
                });
            } else {
                fallbackCopy(url, '✅ 链接已复制到剪贴板');
            }
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

function renderMarkdownContent(text) {
    if (!text) return '';
    
    // 先转义HTML特殊字符
    let html = escapeHtml(text);
    
    // 处理代码块（必须在其他处理之前）
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // 处理单行代码
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    
    // 处理标题
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // 处理粗体
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    
    // 处理斜体
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    
    // 处理链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // 处理列表项
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    
    // 将连续的列表项包装在ul中
    html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
    
    // 清理列表内的空白字符
    html = html.replace(/<ul>\s*(<li>)/g, '<ul>$1');
    html = html.replace(/(<\/li>)\s*(<li>)/g, '$1$2');
    html = html.replace(/(<li>[^<]*)<\/li>\s*<li>/g, '$1</li><li>');
    
    // 处理引用
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // 处理分隔线
    html = html.replace(/^---$/gm, '<hr>');
    
    // 处理段落（将双换行转换为段落分隔）
    html = html.replace(/\n\n+/g, '</p><p>');
    
    // 将单换行转换为<br>
    html = html.replace(/\n/g, '<br>');
    
    // 包装在段落中
    html = '<p>' + html + '</p>';
    
    // 清理多余的空段落和修复结构
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6])/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    
    // 清理标题后的空行
    html = html.replace(/(<\/h[1-6]>)<br>/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<br><p>/g, '$1<p>');
    html = html.replace(/(<\/h[1-6]>)<p><br>/g, '$1<p>');
    
    // 清理列表后的空行
    html = html.replace(/(<\/ul>)<br>/g, '$1');
    html = html.replace(/(<\/ul>)<br><p>/g, '$1<p>');
    html = html.replace(/(<\/ul>)<p><br>/g, '$1<p>');
    html = html.replace(/(<\/ol>)<br>/g, '$1');
    html = html.replace(/(<\/ol>)<br><p>/g, '$1<p>');
    html = html.replace(/(<\/ol>)<p><br>/g, '$1<p>');
    
    // 清理列表项内的空行
    html = html.replace(/(<li>[^<]*)<br>(<\/li>)/g, '$1$2');
    html = html.replace(/(<li>)<br>/g, '$1');
    html = html.replace(/<br>(<\/li>)/g, '$1');
    
    return html;
}