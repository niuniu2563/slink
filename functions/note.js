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
        
        const { title, content } = body;

        if (!content || !content.trim()) {
            return jsonResponse({ error: '便签内容不能为空' }, 400);
        }

        // 生成4位随机slug
        let slug = generateRandomSlug(4);
        let attempts = 0;
        while (attempts < 10 && await env.SLINK_KV.get(`note:${slug}`)) {
            slug = generateRandomSlug(4);
            attempts++;
        }
        if (attempts >= 10) {
            return jsonResponse({ error: '生成便签失败，请重试' }, 500);
        }

        const noteData = {
            type: 'note',
            title: title?.trim() || '',
            content: content.trim(),
            slug,
            createdAt: new Date().toISOString(),
            viewCount: 0,
            lastAccessed: null
        };

        try {
            await env.SLINK_KV.put(`note:${slug}`, JSON.stringify(noteData));
            // 添加到时间索引
            await addToTimeIndex(env, slug, noteData.createdAt, 'note');
        } catch (error) {
            // 处理KV存储失败（可能是空间满了）
            if (error.message?.includes('storage quota') || error.message?.includes('limit')) {
                // 尝试清理旧数据
                const cleaned = await cleanOldData(env);
                if (cleaned) {
                    try {
                        await env.SLINK_KV.put(`note:${slug}`, JSON.stringify(noteData));
                        await addToTimeIndex(env, slug, noteData.createdAt, 'note');
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
            title: noteData.title,
            createdAt: noteData.createdAt,
            noteUrl: `${new URL(request.url).origin}/${slug}`
        }, 201);

    } catch (error) {
        console.error('Note creation error:', error);
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

// 时间索引管理（支持便签类型）
async function addToTimeIndex(env, slug, createdAt, type = 'url') {
    try {
        const indexKey = 'time_index';
        const indexStr = await env.SLINK_KV.get(indexKey);
        const index = indexStr ? JSON.parse(indexStr) : [];
        
        // 添加新记录，包含类型信息
        index.push({ slug, createdAt, type });
        
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
        
        // 批量删除旧数据（支持不同类型）
        const deletePromises = toDelete.map(item => {
            const keyPrefix = item.type === 'note' ? 'note:' : 'url:';
            return env.SLINK_KV.delete(`${keyPrefix}${item.slug}`).catch(err => 
                console.warn(`Failed to delete ${item.slug}:`, err)
            );
        });
        
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