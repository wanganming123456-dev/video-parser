/**
 * 链接输入区组件
 */
var InputBox = {
    render: function () {
        return '' +
            '<div class="input-section">' +
            '  <h2>🔗 粘贴链接</h2>' +
            '  <div class="input-row">' +
            '    <input type="text" id="urlInput" placeholder="抖音 / 快手 分享链接，例如 https://v.douyin.com/xxxxx/">' +
            '    <button id="btnParse">🚀 开始解析</button>' +
            '  </div>' +
            '  <div class="platform-tags">' +
            '    <span class="tag">🎵 抖音</span>' +
            '    <span class="tag">🎬 快手</span>' +
            '    <span class="tag">📱 手机 APP 分享</span>' +
            '    <span class="tag">💻 网页链接</span>' +
            '  </div>' +
            '</div>';
    },

    init: function (onSubmit) {
        var input = document.getElementById('urlInput');
        var btn = document.getElementById('btnParse');
        if (!input || !btn) return;

        btn.addEventListener('click', function () {
            var url = input.value.trim();
            if (!url) {
                Toast.show('请先粘贴视频链接', 'error');
                return;
            }
            if (onSubmit) onSubmit(url);
            input.value = '';
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                btn.click();
            }
        });

        // 自动粘贴剪贴板内容
        input.addEventListener('focus', async function () {
            try {
                var text = await navigator.clipboard.readText();
                if (text && /douyin|kuaishou/i.test(text) && !input.value) {
                    input.value = text.trim();
                    Toast.show('已自动粘贴剪贴板链接', 'info');
                }
            } catch (_) {}
        });
    }
};
