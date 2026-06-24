/**
 * 历史记录组件
 */
var HistoryList = {
    _page: 1,

    render: function () {
        return '' +
            '<div class="task-list">' +
            '  <h2>📋 历史记录</h2>' +
            '  <div id="historyListContainer">' +
            '    <div class="empty-state">' +
            '      <div class="icon">📭</div>' +
            '      <p>暂无历史记录</p>' +
            '    </div>' +
            '  </div>' +
            '  <div id="historyPagination" class="pagination"></div>' +
            '</div>';
    },

    init: function () {
        this.loadPage(1);
    },

    loadPage: async function (page) {
        this._page = page;
        try {
            var result = await API.getHistory(page);
            this._renderItems(result);
        } catch (err) {
            var container = document.getElementById('historyListContainer');
            if (container) {
                container.innerHTML = '<div class="empty-state"><p>加载失败: ' + err.message + '</p></div>';
            }
        }
    },

    _renderItems: function (result) {
        var container = document.getElementById('historyListContainer');
        var pagination = document.getElementById('historyPagination');
        if (!container) return;

        var items = result.items || [];
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>暂无历史记录</p></div>';
            if (pagination) pagination.innerHTML = '';
            return;
        }

        var html = '';
        for (var i = 0; i < items.length; i++) {
            html += this._card(items[i]);
        }
        container.innerHTML = html;

        // 分页
        if (pagination && result.totalPages > 1) {
            var pagesHtml = '';
            for (var j = 1; j <= result.totalPages; j++) {
                pagesHtml += '<button class="page-btn' +
                    (j === this._page ? ' active' : '') +
                    '" data-page="' + j + '">' + j + '</button>';
            }
            pagination.innerHTML = pagesHtml;
            var self = this;
            var pageBtns = pagination.querySelectorAll('.page-btn');
            for (var k = 0; k < pageBtns.length; k++) {
                pageBtns[k].addEventListener('click', function () {
                    self.loadPage(parseInt(this.dataset.page));
                });
            }
        } else if (pagination) {
            pagination.innerHTML = '';
        }

        this._bindEvents();
    },

    _card: function (h) {
        var platformLabel;
        if (h.platform === 'douyin') platformLabel = '🎵 抖音';
        else if (h.platform === 'kuaishou') platformLabel = '🎬 快手';
        else platformLabel = h.platform || '未知';

        var localBadge = h.local_path ? '<span>💾 已下载</span>' : '';

        return '' +
            '<div class="history-card">' +
            '  <div class="task-info">' +
            '    <h4>' + (h.title || '未知视频') + '</h4>' +
            '    <div class="meta">' +
            '      <span>' + platformLabel + '</span>' +
            '      <span>' + (h.parsed_at || '') + '</span>' +
            localBadge +
            '    </div>' +
            '  </div>' +
            '  <div class="task-actions">' +
            '    <button class="btn-sm btn-delete" data-action="deleteHistory" data-id="' + h.id + '">🗑</button>' +
            '  </div>' +
            '</div>';
    },

    _bindEvents: function () {
        var self = this;
        var delBtns = document.querySelectorAll('[data-action="deleteHistory"]');
        for (var i = 0; i < delBtns.length; i++) {
            delBtns[i].addEventListener('click', async function () {
                var id = parseInt(this.dataset.id);
                try {
                    await API.deleteHistory(id);
                    Toast.show('已删除', 'info');
                    self.loadPage(self._page);
                } catch (err) {
                    Toast.show('删除失败: ' + err.message, 'error');
                }
            });
        }
    }
};
