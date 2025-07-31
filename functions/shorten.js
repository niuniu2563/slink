export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        // 检查KV绑定
        if (!env.SLINK_KV) {
            return new Response(JSON.stringify({ error: 'KV存储未配置，请联系管理员' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await request.json();
        const { url, customSlug } = body;

        // 验证输入
        if (!url) {
            return new Response(JSON.stringify({ error: '缺少必需的URL参数' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 验证URL格式
        try {
            new URL(url);
        } catch {
            return new Response(JSON.stringify({ error: '无效的URL格式' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 生成或验证slug
        let slug = customSlug;
        if (slug) {
            // 验证自定义slug格式
            if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
                return new Response(JSON.stringify({ error: '自定义短码只能包含字母、数字、下划线和连字符' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 检查自定义slug是否已存在
            const existing = await env.SLINK_KV.get(`url:${slug}`);
            if (existing) {
                return new Response(JSON.stringify({ error: '该自定义短码已被使用' }), {
                    status: 409,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            // 生成随机slug
            slug = generateRandomSlug();
            
            // 确保生成的slug不冲突
            let attempts = 0;
            while (attempts < 10) {
                const existing = await env.SLINK_KV.get(`url:${slug}`);
                if (!existing) break;
                
                slug = generateRandomSlug();
                attempts++;
            }
            
            if (attempts >= 10) {
                return new Response(JSON.stringify({ error: '生成短链失败，请重试' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // 创建短链记录
        const linkData = {
            originalUrl: url,
            slug: slug,
            createdAt: new Date().toISOString(),
            clickCount: 0,
            lastAccessed: null
        };

        // 存储到KV
        await env.SLINK_KV.put(`url:${slug}`, JSON.stringify(linkData));
        
        // 可选：创建反向索引以便查找
        await env.SLINK_KV.put(`reverse:${hashUrl(url)}`, slug);

        return new Response(JSON.stringify({
            success: true,
            slug: slug,
            originalUrl: url,
            createdAt: linkData.createdAt,
            shortUrl: `${new URL(request.url).origin}/${slug}`
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Shorten API error:', error);
        return new Response(JSON.stringify({ error: '服务器内部错误' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function generateRandomSlug(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}