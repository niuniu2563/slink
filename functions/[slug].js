export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;

    // 如果没有slug或者是特殊路径，跳过处理
    if (!slug || slug.startsWith('api/') || slug.includes('.')) {
        return new Response('Not Found', { status: 404 });
    }

    try {
        // 从KV获取链接数据
        const linkDataStr = await env.SLINK_KV.get(`url:${slug}`);
        
        if (!linkDataStr) {
            // 短链不存在，返回404页面或重定向到首页
            return new Response(`
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>链接不存在 - SLink</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-align: center;
                        }
                        .container {
                            max-width: 500px;
                            padding: 40px;
                        }
                        h1 {
                            font-size: 4rem;
                            margin-bottom: 20px;
                        }
                        p {
                            font-size: 1.2rem;
                            margin-bottom: 30px;
                            opacity: 0.9;
                        }
                        a {
                            color: white;
                            text-decoration: none;
                            background: rgba(255,255,255,0.2);
                            padding: 12px 24px;
                            border-radius: 6px;
                            transition: background 0.3s;
                        }
                        a:hover {
                            background: rgba(255,255,255,0.3);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>404</h1>
                        <p>抱歉，您访问的短链不存在或已过期</p>
                        <a href="/">返回首页</a>
                    </div>
                </body>
                </html>
            `, {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        const linkData = JSON.parse(linkDataStr);
        
        // 更新访问统计
        const updatedData = {
            ...linkData,
            clickCount: (linkData.clickCount || 0) + 1,
            lastAccessed: new Date().toISOString()
        };

        // 异步更新KV中的数据（不等待完成）
        context.waitUntil(
            env.SLINK_KV.put(`url:${slug}`, JSON.stringify(updatedData))
        );

        // 执行重定向
        return Response.redirect(linkData.originalUrl, 302);

    } catch (error) {
        console.error('Redirect error:', error);
        
        // 发生错误时重定向到首页
        return Response.redirect('/', 302);
    }
}