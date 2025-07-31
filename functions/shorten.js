export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { url, customSlug } = body;

        if (!url) {
            return jsonResponse({ error: '缺少必需的URL参数' }, 400);
        }

        try {
            new URL(url);
        } catch {
            return jsonResponse({ error: '无效的URL格式' }, 400);
        }

        let slug = customSlug;
        if (slug) {
            if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
                return jsonResponse({ error: '自定义短码只能包含字母、数字、下划线和连字符' }, 400);
            }
            if (await env.SLINK_KV.get(`url:${slug}`)) {
                return jsonResponse({ error: '该自定义短码已被使用' }, 409);
            }
        } else {
            slug = generateRandomSlug();
            let attempts = 0;
            while (attempts < 10 && await env.SLINK_KV.get(`url:${slug}`)) {
                slug = generateRandomSlug();
                attempts++;
            }
            if (attempts >= 10) {
                return jsonResponse({ error: '生成短链失败，请重试' }, 500);
            }
        }

        const linkData = {
            originalUrl: url,
            slug,
            createdAt: new Date().toISOString(),
            clickCount: 0,
            lastAccessed: null
        };

        await env.SLINK_KV.put(`url:${slug}`, JSON.stringify(linkData));

        return jsonResponse({
            success: true,
            slug,
            originalUrl: url,
            createdAt: linkData.createdAt,
            shortUrl: `${new URL(request.url).origin}/${slug}`
        }, 201);

    } catch (error) {
        return jsonResponse({ error: '服务器内部错误' }, 500);
    }
}

function generateRandomSlug(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}