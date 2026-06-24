/**
 * 历史 + 下载路由
 */
const { Router } = require('express');
const router = Router();
const { History } = require('../db/models');
const Downloader = require('../utils/downloader');
const logger = require('../utils/logger');

// GET /api/history — 历史列表（分页）
router.get('/history', (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
        const result = History.list(page, pageSize);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/history/:id — 删除历史
router.delete('/history/:id', (req, res) => {
    try {
        const result = History.delete(parseInt(req.params.id));
        if (result.changes === 0) return res.status(404).json({ error: '记录不存在' });
        res.json({ success: true, message: '已删除' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/download/:id — 触发下载
router.get('/download/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        logger.info('开始下载', { taskId });
        const result = await Downloader.download(taskId);
        logger.info('下载完成', result);
        res.json({
            success: true,
            local_path: result.localPath,
            history_id: result.historyId
        });
    } catch (err) {
        logger.error('下载失败', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
