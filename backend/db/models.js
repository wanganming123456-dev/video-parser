/**
 * 数据模型层 — 封装对 tasks / history / settings 的 CRUD 操作
 * 底层使用 JSON 文件存储（零依赖）
 */
const db = require('./database');

// ==================== Tasks ====================

const Task = {
    create(url, platform) {
        const data = db.read();
        platform = platform || '';
        const task = {
            id: db.nextId(),
            url: url,
            platform: platform,
            status: 'pending',
            title: '',
            cover_url: '',
            video_url: '',
            error_msg: '',
            created_at: new Date().toLocaleString('zh-CN')
        };
        data.tasks.push(task);
        db.write(data);
        return task;
    },

    getById(id) {
        const data = db.read();
        return data.tasks.find(t => t.id === id) || null;
    },

    list(page, pageSize) {
        page = page || 1;
        pageSize = pageSize || 20;
        const data = db.read();
        const sorted = data.tasks.slice().reverse(); // newest first
        const total = sorted.length;
        const offset = (page - 1) * pageSize;
        const items = sorted.slice(offset, offset + pageSize);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    },

    update(id, fields) {
        const data = db.read();
        const task = data.tasks.find(t => t.id === id);
        if (!task) return null;
        if (fields.platform !== undefined) task.platform = fields.platform;
        if (fields.status !== undefined) task.status = fields.status;
        if (fields.title !== undefined) task.title = fields.title;
        if (fields.cover_url !== undefined) task.cover_url = fields.cover_url;
        if (fields.video_url !== undefined) task.video_url = fields.video_url;
        if (fields.error_msg !== undefined) task.error_msg = fields.error_msg;
        db.write(data);
        return task;
    },

    delete(id) {
        const data = db.read();
        const idx = data.tasks.findIndex(t => t.id === id);
        if (idx === -1) return { changes: 0 };
        data.tasks.splice(idx, 1);
        db.write(data);
        return { changes: 1 };
    }
};

// ==================== History ====================

const History = {
    create(taskId, title, platform, videoUrl, localPath) {
        const data = db.read();
        localPath = localPath || '';
        const record = {
            id: db.nextId(),
            task_id: taskId,
            title: title || '',
            platform: platform || '',
            video_url: videoUrl || '',
            local_path: localPath,
            parsed_at: new Date().toLocaleString('zh-CN')
        };
        data.history.push(record);
        db.write(data);
        return record.id;
    },

    list(page, pageSize) {
        page = page || 1;
        pageSize = pageSize || 20;
        const data = db.read();
        const sorted = data.history.slice().reverse();
        const total = sorted.length;
        const offset = (page - 1) * pageSize;
        const items = sorted.slice(offset, offset + pageSize);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    },

    delete(id) {
        const data = db.read();
        const idx = data.history.findIndex(h => h.id === id);
        if (idx === -1) return { changes: 0 };
        data.history.splice(idx, 1);
        db.write(data);
        return { changes: 1 };
    }
};

// ==================== Settings ====================

const Settings = {
    get(key) {
        const data = db.read();
        return data.settings[key] !== undefined ? data.settings[key] : null;
    },

    set(key, value) {
        const data = db.read();
        data.settings[key] = String(value);
        db.write(data);
    },

    list() {
        const data = db.read();
        return Object.assign({}, data.settings);
    }
};

module.exports = { Task, History, Settings };
