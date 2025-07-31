export async function onRequestGet(context) {
    const { request, env } = context;
    const slug = new URL(request.url).searchParams.get('slug');

    if (!slug) return jsonResponse({ error: '缺少slug参数' }, 400);

    try {
        const linkDataStr = await env.SLINK_KV.get(`url:${slug}`);
        if (!linkDataStr) return jsonResponse({ error: '短链不存在' }, 404);

        const linkData = JSON.parse(linkDataStr);
        return jsonResponse({
            success: true,
            slug,
            originalUrl: linkData.originalUrl,
            createdAt: linkData.createdAt,
            clickCount: linkData.clickCount || 0,
            lastAccessed: linkData.lastAccessed
        });
    } catch (error) {
        return jsonResponse({ error: '获取统计信息失败' }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}