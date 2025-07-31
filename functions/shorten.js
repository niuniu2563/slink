export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        // 检查请求内容类型
        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return jsonResponse({ error: '请求内容类型必须为application/json' }, 400);
        }

        let body;
        try {
            body = await request.json();
        } catch (parseError) {
            return jsonResponse({ error: '无效的JSON格式' }, 400);
        }
        
        const { url, customSlug } = body;

        if (!url) {
            return jsonResponse({ error: '缺少必需的URL参数' }, 400);
        }

        // 规范化URL：如果没有协议，自动添加https://
        let normalizedUrl = url.trim();
        if (!/^https?:\/\//i.test(normalizedUrl)) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        // 验证URL格式
        try {
            new URL(normalizedUrl);
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
            originalUrl: normalizedUrl,
            slug,
            createdAt: new Date().toISOString(),
            clickCount: 0,
            lastAccessed: null
        };

        try {
            await env.SLINK_KV.put(`url:${slug}`, JSON.stringify(linkData));
            // 添加到时间索引
            await addToTimeIndex(env, slug, linkData.createdAt);
        } catch (error) {
            // 处理KV存储失败（可能是空间满了）
            if (error.message?.includes('storage quota') || error.message?.includes('limit')) {
                // 尝试清理旧数据
                const cleaned = await cleanOldData(env);
                if (cleaned) {
                    try {
                        await env.SLINK_KV.put(`url:${slug}`, JSON.stringify(linkData));
                        await addToTimeIndex(env, slug, linkData.createdAt);
                    } catch (retryError) {
                        return jsonResponse({ error: '存储空间已满，清理后仍无法保存' }, 507);
                    }
                } else {
                    return jsonResponse({ error: '存储空间已满，无法清理更多数据' }, 507);
                }
            } else {
                throw error;
            }
        }

        return jsonResponse({
            success: true,
            slug,
            originalUrl: normalizedUrl,
            createdAt: linkData.createdAt,
            shortUrl: `${new URL(request.url).origin}/${slug}`
        }, 201);

    } catch (error) {
        console.error('Shorten error:', error);
        return jsonResponse({ error: '服务器内部错误' }, 500);
    }
}

function generateRandomSlug(length = 4) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

// 时间索引管理
async function addToTimeIndex(env, slug, createdAt) {
    try {
        const indexKey = 'time_index';
        const indexStr = await env.SLINK_KV.get(indexKey);
        const index = indexStr ? JSON.parse(indexStr) : [];
        
        // 添加新记录
        index.push({ slug, createdAt });
        
        // 保持索引按时间排序（最旧的在前）
        index.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        // 限制索引大小（保留最近10000条记录的索引）
        if (index.length > 10000) {
            index.splice(0, index.length - 10000);
        }
        
        await env.SLINK_KV.put(indexKey, JSON.stringify(index));
    } catch (error) {
        // 索引更新失败不影响核心功能
        console.warn('Failed to update time index:', error);
    }
}

async function cleanOldData(env) {
    try {
        const indexKey = 'time_index';
        const indexStr = await env.SLINK_KV.get(indexKey);
        
        if (!indexStr) {
            console.warn('No time index found, cannot clean old data');
            return false;
        }
        
        const index = JSON.parse(indexStr);
        if (index.length === 0) {
            return false;
        }
        
        // 删除最旧的10%数据，至少删除10条，最多删除100条
        const deleteCount = Math.max(10, Math.min(100, Math.floor(index.length * 0.1)));
        const toDelete = index.splice(0, deleteCount);
        
        console.log(`Cleaning ${toDelete.length} old entries`);
        
        // 批量删除旧数据
        const deletePromises = toDelete.map(item => 
            env.SLINK_KV.delete(`url:${item.slug}`).catch(err => 
                console.warn(`Failed to delete ${item.slug}:`, err)
            )
        );
        
        await Promise.all(deletePromises);
        
        // 更新索引
        await env.SLINK_KV.put(indexKey, JSON.stringify(index));
        
        console.log(`Successfully cleaned ${toDelete.length} old entries`);
        return true;
        
    } catch (error) {
        console.error('Failed to clean old data:', error);
        return false;
    }
}