/**
 * 应用主逻辑 — 页面路由 + 全局状态 + Toast
 */
(function () {
    'use strict';

    var state = {
        currentPage: 'parse',
        tasks: { items: [], total: 0 },
        taskPollTimer: null
    };

    // ========== DOM 引用 ==========
    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    var el = {
        pageTitle: $('#pageTitle'),
        pageDesc: $('#pageDesc'),
        pageContent: $('#pageContent'),
        navItems: $$('.nav-item')
    };

    // ========== Toast ==========
    window.Toast = {
        show: function (msg, type) {
            type = type || 'info';
            var el2 = document.createElement('div');
            el2.className = 'toast ' + type;
            el2.textContent = msg;
            document.body.appendChild(el2);
            setTimeout(function () { el2.remove(); }, 3000);
        }
    };

    // ========== 页面路由 ==========
    var pages = {
        parse: {
            title: '解析中心',
            desc: '粘贴视频分享链接，一键获取无水印视频',
            render: function () {
                el.pageContent.innerHTML = InputBox.render() + TaskList.render();
                InputBox.init(onParse);
                TaskList.init(state.tasks, onDownload, onDeleteTask);
            }
        },
        history: {
            title: '历史记录',
            desc: '已解析和已下载的视频记录',
            render: function () {
                el.pageContent.innerHTML = HistoryList.render();
                HistoryList.init();
            }
        },
        settings: {
            title: '设置',
            desc: '下载目录、API 偏好等配置',
            render: async function () {
                try {
                    var s = await API.getSettings();
                    el.pageContent.innerHTML = '' +
                        '<div class="settings-section">' +
                        '  <h3>📁 下载设置</h3>' +
                        '  <div class="settings-row">' +
                        '    <label>下载目录</label>' +
                        '    <input id="settingDir" value="' + (s.download_dir || '') + '">' +
                        '  </div>' +
                        '  <button class="btn-save" onclick="App.saveSettings()">保存设置</button>' +
                        '</div>' +
                        '<div class="settings-section">' +
                        '  <h3>📡 API 偏好</h3>' +
                        '  <div class="settings-row">' +
                        '    <label>API 提供商</label>' +
                        '    <input id="settingApi" value="' + (s.api_provider || 'free_api') + '" placeholder="free_api">' +
                        '  </div>' +
                        '  <button class="btn-save" onclick="App.saveSettings()">保存设置</button>' +
                        '</div>';
                } catch (e) {
                    el.pageContent.innerHTML = '<div class="empty-state"><p>加载设置失败: ' + e.message + '</p></div>';
                }
            }
        }
    };

    // ========== 导航 ==========
    function navigate(page) {
        state.currentPage = page;
        el.navItems.forEach(function (item) {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        var p = pages[page];
        if (!p) return;
        el.pageTitle.textContent = p.title;
        el.pageDesc.textContent = p.desc;
        if (p.render) p.render();

        // 离开解析页时停止轮询
        if (page !== 'parse') stopPolling();
    }

    el.navItems.forEach(function (item) {
        item.addEventListener('click', function () {
            navigate(item.dataset.page);
        });
    });

    // ========== 解析流程 ==========
    async function onParse(url) {
        try {
            var result = await API.parse(url);
            Toast.show('任务已创建，正在解析...', 'info');
            await refreshTasks();
            startPolling();
        } catch (err) {
            Toast.show('解析失败: ' + err.message, 'error');
        }
    }

    // ========== 下载 ==========
    async function onDownload(taskId) {
        try {
            Toast.show('正在下载...', 'info');
            var result = await API.download(taskId);
            Toast.show('下载完成! ' + result.local_path, 'success');
            await refreshTasks();
        } catch (err) {
            Toast.show('下载失败: ' + err.message, 'error');
        }
    }

    // ========== 删除任务 ==========
    async function onDeleteTask(taskId) {
        try {
            await API.deleteTask(taskId);
            Toast.show('已删除', 'info');
            await refreshTasks();
        } catch (err) {
            Toast.show('删除失败: ' + err.message, 'error');
        }
    }

    // ========== 任务轮询 ==========
    async function refreshTasks() {
        try {
            var result = await API.getTasks(1);
            state.tasks = result;
            if (state.currentPage === 'parse') {
                TaskList.update(state.tasks);
            }
        } catch (_) {}
    }

    function startPolling() {
        stopPolling();
        state.taskPollTimer = setInterval(refreshTasks, 2000);
    }

    function stopPolling() {
        if (state.taskPollTimer) {
            clearInterval(state.taskPollTimer);
            state.taskPollTimer = null;
        }
    }

    // ========== 保存设置 ==========
    function saveSettings() {
        var dirEl = document.getElementById('settingDir');
        var apiEl = document.getElementById('settingApi');
        var data = {};
        if (dirEl) data.download_dir = dirEl.value;
        if (apiEl) data.api_provider = apiEl.value;
        API.updateSettings(data).then(function () {
            Toast.show('设置已保存', 'success');
        }).catch(function (err) {
            Toast.show('保存失败: ' + err.message, 'error');
        });
    }

    // ========== 暴露到全局 ==========
    window.App = { navigate: navigate, saveSettings: saveSettings };

    // ========== 初始化 ==========
    navigate('parse');
})();
