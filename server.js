/**
 * 视频解析器 — Express 服务器入口
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3457;

// ========== 全局中间件 ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS（本地访问无需严格限制）
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ========== 静态文件 ==========
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/data/downloads', express.static(path.join(__dirname, 'data', 'downloads')));

// ========== API 路由 ==========
app.use('/api', require('./backend/routes/parse'));
app.use('/api', require('./backend/routes/tasks'));
app.use('/api', require('./backend/routes/history'));
app.use('/api', require('./backend/routes/settings'));

// ========== SPA fallback ==========
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: '接口不存在' });
    }
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ========== 启动 ==========
app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║     📹 视频解析器 已启动               ║');
    console.log(`  ║     http://localhost:${PORT}              ║`);
    console.log('  ║     支持: 抖音 / 快手                   ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
