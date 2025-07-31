export async function onRequest(context) {
    const { env, params } = context;
    const slug = params.slug;

    if (!slug || slug.includes('.')) {
        return new Response('Not Found', { status: 404 });
    }

    try {
        const linkDataStr = await env.SLINK_KV.get(`url:${slug}`);
        
        if (!linkDataStr) {
            return Response.redirect('/', 302);
        }

        const linkData = JSON.parse(linkDataStr);
        
        // 异步更新访问统计
        context.waitUntil(
            env.SLINK_KV.put(`url:${slug}`, JSON.stringify({
                ...linkData,
                clickCount: (linkData.clickCount || 0) + 1,
                lastAccessed: new Date().toISOString()
            })).catch(() => {
                console.warn(`Failed to update stats for ${slug}`);
            })
        );

        return Response.redirect(linkData.originalUrl, 302);

    } catch (error) {
        console.error('Redirect error:', error);
        return Response.redirect('/', 302);
    }
}