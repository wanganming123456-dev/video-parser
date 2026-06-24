/**
 * 设置路由
 */
const { Router } = require('express');
const router = Router();
const { Settings } = require('../db/models');

// GET /api/settings
router.get('/settings', (req, res) => {
    try {
        res.json(Settings.list());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings
router.put('/settings', (req, res) => {
    try {
        const updates = req.body;
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: '请提供设置项' });
        }
        for (const [key, value] of Object.entries(updates)) {
            Settings.set(key, value);
        }
        res.json(Settings.list());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
