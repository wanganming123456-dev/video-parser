/**
 * JSON 文件数据库（零依赖，纯 Node.js 内置模块）
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// 确保 data 目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化空数据库
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const empty = { tasks: [], history: [], settings: { download_dir: path.join(DATA_DIR, 'downloads'), api_provider: 'free_api' }, nextId: 1 };
        fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), 'utf8');
    }
}

function read() {
    initDB();
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function write(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/** 获取下一个自增 ID */
function nextId() {
    const data = read();
    const id = data.nextId || 1;
    data.nextId = id + 1;
    write(data);
    return id;
}

module.exports = { read, write, nextId, DATA_DIR, DB_FILE };
