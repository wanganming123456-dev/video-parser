/**
 * 后端 API 封装
 * 所有与后端的通信集中在此
 */
var API = {
    _base: '/api',

    async _fetch(method, path, body) {
        var opts = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) opts.body = JSON.stringify(body);
        var resp = await fetch(this._base + path, opts);
        var json = await resp.json();
        if (!resp.ok) throw new Error(json.error || '请求失败');
        return json;
    },

    /** 提交链接解析 */
    parse: function (url) {
        return this._fetch('POST', '/parse', { url: url });
    },

    /** 获取任务列表 */
    getTasks: function (page) {
        page = page || 1;
        return this._fetch('GET', '/tasks?page=' + page);
    },

    /** 获取单个任务 */
    getTask: function (id) {
        return this._fetch('GET', '/tasks/' + id);
    },

    /** 删除任务 */
    deleteTask: function (id) {
        return this._fetch('DELETE', '/tasks/' + id);
    },

    /** 获取历史 */
    getHistory: function (page) {
        page = page || 1;
        return this._fetch('GET', '/history?page=' + page);
    },

    /** 删除历史 */
    deleteHistory: function (id) {
        return this._fetch('DELETE', '/history/' + id);
    },

    /** 触发下载 */
    download: function (taskId) {
        return this._fetch('GET', '/download/' + taskId);
    },

    /** 获取设置 */
    getSettings: function () {
        return this._fetch('GET', '/settings');
    },

    /** 更新设置 */
    updateSettings: function (data) {
        return this._fetch('PUT', '/settings', data);
    }
};
