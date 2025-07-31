export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
        return new Response(JSON.stringify({ error: '缺少slug参数' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 从KV获取链接数据
        const linkDataStr = await env.SLINK_KV.get(`url:${slug}`);
        
        if (!linkDataStr) {
            return new Response(JSON.stringify({ error: '短链不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const linkData = JSON.parse(linkDataStr);

        return new Response(JSON.stringify({
            success: true,
            slug: slug,
            originalUrl: linkData.originalUrl,
            createdAt: linkData.createdAt,
            clickCount: linkData.clickCount || 0,
            lastAccessed: linkData.lastAccessed
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Stats API error:', error);
        return new Response(JSON.stringify({ error: '获取统计信息失败' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}