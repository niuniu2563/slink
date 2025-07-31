export async function onRequestPost(context) {
    const { request } = context;
    
    try {
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
        if (!slug) {
            slug = generateRandomSlug();
        } else {
            // 验证自定义slug格式
            if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
                return new Response(JSON.stringify({ error: '自定义短码只能包含字母、数字、下划线和连字符' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // 返回成功响应（不存储，仅用于测试）
        return new Response(JSON.stringify({
            success: true,
            slug: slug,
            originalUrl: url,
            createdAt: new Date().toISOString(),
            shortUrl: `${new URL(request.url).origin}/${slug}`,
            message: 'KV存储未配置，短链仅用于测试显示'
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Shorten API error:', error);
        return new Response(JSON.stringify({ error: '服务器内部错误: ' + error.message }), {
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