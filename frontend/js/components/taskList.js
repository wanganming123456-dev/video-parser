/**
 * 任务队列组件
 */
var TaskList = {
    _onDownload: null,
    _onDelete: null,

    render: function () {
        return '' +
            '<div class="task-list">' +
            '  <h2>📥 当前任务</h2>' +
            '  <div id="taskListContainer">' +
            '    <div class="empty-state">' +
            '      <div class="icon">📭</div>' +
            '      <p>还没有解析任务，在上面粘贴链接开始吧</p>' +
            '    </div>' +
            '  </div>' +
            '</div>';
    },

    init: function (tasks, onDownload, onDelete) {
        this._onDownload = onDownload;
        this._onDelete = onDelete;
        if (tasks && tasks.items && tasks.items.length > 0) {
            this.update(tasks);
        }
    },

    update: function (result) {
        var container = document.getElementById('taskListContainer');
        if (!container) return;

        var items = result.items || [];
        if (items.length === 0) {
            container.innerHTML = '' +
                '<div class="empty-state">' +
                '  <div class="icon">📭</div>' +
                '  <p>还没有解析任务，在上面粘贴链接开始吧</p>' +
                '</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < items.length; i++) {
            html += this._card(items[i]);
        }
        container.innerHTML = html;
        this._bindEvents();
    },

    _statusMap: {
        pending: '<span class="task-status status-parsing">⏳ 等待中</span>',
        parsing: '<span class="task-status status-parsing">⏳ 解析中...</span>',
        done: '<span class="task-status status-done">✅ 解析完成</span>'
    },

    _card: function (t) {
        var statusHtml = this._statusMap[t.status] || '<span class="task-status status-failed">❌ ' + (t.error_msg || '失败') + '</span>';

        var platformLabel;
        if (t.platform === 'douyin') platformLabel = '🎵 抖音';
        else if (t.platform === 'kuaishou') platformLabel = '🎬 快手';
        else platformLabel = '❓ ' + t.platform;

        var coverStyle = t.cover_url
            ? 'background-image:url(' + this._escAttr(t.cover_url) + ');background-size:cover'
            : '';

        var downloadBtn = t.status === 'done'
            ? '<button class="btn-sm btn-download" data-action="download" data-id="' + t.id + '">📥 下载</button>'
            : '';

        var title = t.title || t.url || '';
        var displayTitle = title.length > 40 ? title.substring(0, 40) + '...' : title;

        return '' +
            '<div class="task-card" data-task-id="' + t.id + '">' +
            '  <div class="task-cover" style="' + coverStyle + '">' +
            (t.cover_url ? '' : '🎬') +
            '  </div>' +
            '  <div class="task-info">' +
            '    <h4>' + this._escHtml(displayTitle) + '</h4>' +
            '    <div class="meta">' +
            '      <span>' + platformLabel + '</span>' +
            '      <span>' + (t.created_at || '') + '</span>' +
            '    </div>' +
            '  </div>' +
            statusHtml +
            '  <div class="task-actions">' +
            downloadBtn +
            '    <button class="btn-sm btn-delete" data-action="delete" data-id="' + t.id + '">🗑</button>' +
            '  </div>' +
            '</div>';
    },

    _bindEvents: function () {
        var self = this;
        var container = document.getElementById('taskListContainer');
        if (!container) return;

        var dlBtns = container.querySelectorAll('[data-action="download"]');
        for (var i = 0; i < dlBtns.length; i++) {
            dlBtns[i].addEventListener('click', function () {
                var id = parseInt(this.dataset.id);
                if (self._onDownload) self._onDownload(id);
            });
        }

        var delBtns = container.querySelectorAll('[data-action="delete"]');
        for (var j = 0; j < delBtns.length; j++) {
            delBtns[j].addEventListener('click', function () {
                var id = parseInt(this.dataset.id);
                if (self._onDelete) self._onDelete(id);
            });
        }
    },

    _escHtml: function (str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _escAttr: function (str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};
