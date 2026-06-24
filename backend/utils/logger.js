/**
 * 简易日志模块
 */
function log(level, msg, data = null) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (data) {
        console.log(prefix, msg, JSON.stringify(data));
    } else {
        console.log(prefix, msg);
    }
}

module.exports = {
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data)
};
