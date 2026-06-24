/**
 * POST /api/parse — 提交视频链接进行解析
 */
const { Router } = require('express');
const router = Router();
const engine = require('../parser/engine');
const { Task } = require('../db/models');
const logger = require('../utils/logger');

// POST /api/parse
router.post('/parse', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
            return res.status(400).json({ error: '请提供视频链接' });
        }

        const trimmedUrl = url.trim();

        // 基本格式校验
        if (!/^https?:\/\//.test(trimmedUrl)) {
            return res.status(400).json({ error: '链接格式不正确，需要以 http:// 或 https:// 开头' });
        }

        logger.info('收到解析请求', { url: trimmedUrl });

        // 创建任务，立刻返回 task_id
        const task = Task.create(trimmedUrl);
        res.json({ task_id: task.id, status: 'pending', message: '任务已创建，正在解析...' });

        // 后台异步解析——传入已有的 taskId，避免重复创建
        engine.parseWithTaskId(trimmedUrl, task.id).then(finalTask => {
            logger.info('解析完成', {
                id: finalTask.id,
                status: finalTask.status,
                title: finalTask.title
            });
        }).catch(err => {
            logger.error('解析异常', { url: trimmedUrl, error: err.message });
        });

    } catch (err) {
        logger.error('POST /api/parse 异常', { error: err.message });
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// GET /api/parse/supported — 获取支持的平台
router.get('/parse/supported', (req, res) => {
    res.json({ platforms: engine.getSupportedPlatforms() });
});

module.exports = router;
