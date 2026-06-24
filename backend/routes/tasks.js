/**
 * 任务管理路由 — GET/DELETE /api/tasks
 */
const { Router } = require('express');
const router = Router();
const { Task } = require('../db/models');

// GET /api/tasks — 任务列表（分页）
router.get('/tasks', (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
        const result = Task.list(page, pageSize);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tasks/:id — 单个任务
router.get('/tasks/:id', (req, res) => {
    try {
        const task = Task.getById(parseInt(req.params.id));
        if (!task) return res.status(404).json({ error: '任务不存在' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/tasks/:id — 删除任务
router.delete('/tasks/:id', (req, res) => {
    try {
        const result = Task.delete(parseInt(req.params.id));
        if (result.changes === 0) return res.status(404).json({ error: '任务不存在' });
        res.json({ success: true, message: '已删除' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
