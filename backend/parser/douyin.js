/**
 * 抖音解析器 — 自研页面解析
 * 从页面 _ROUTER_DATA 提取视频信息
 */
const BaseParser = require('./base');

class DouyinParser extends BaseParser {

    static get platform() { return 'douyin'; }

    static get urlPatterns() {
        return [
            /v\.douyin\.com\/[A-Za-z0-9]+\/?/,
            /www\.douyin\.com\/video\/\d+/,
            /www\.iesdouyin\.com\/share\/video\/\d+/,
            /douyin\.com/
        ];
    }

    async parse(url) {
        // 展开短链 → 获取真实页面
        const pageUrl = await this._resolveShortLink(url);
        if (!pageUrl) throw new Error('短链展开失败');

        // 带移动端 User-Agent 请求视频页
        const resp = await fetch(pageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,*/*',
                'Accept-Language': 'zh-CN,zh-Hans;q=0.9'
            }
        });
        if (!resp.ok) throw new Error('页面请求失败 HTTP ' + resp.status);
        const html = await resp.text();

        // 提取 window._ROUTER_DATA
        const match = html.match(/window\._ROUTER_DATA\s*=\s*(.+?)<\/script>/s);
        if (!match) throw new Error('未找到页面数据');

        const routerData = JSON.parse(match[1]);
        const page = routerData.loaderData && routerData.loaderData['video_(id)/page'];
        if (!page) throw new Error('未找到视频页面数据');

        const info = page.videoInfoRes;
        if (!info || !info.item_list || info.item_list.length === 0) {
            throw new Error('视频信息为空,可能已被删除或设为私密');
        }

        const item = info.item_list[0];
        const video = item.video;
        if (!video || !video.play_addr || !video.play_addr.url_list || video.play_addr.url_list.length === 0) {
            throw new Error('未找到视频播放地址');
        }

        // playwm → play (无水印)
        const videoUrl = video.play_addr.url_list[0].replace('playwm', 'play');
        const coverUrl = video.cover && video.cover.url_list && video.cover.url_list[0]
            ? video.cover.url_list[0]
            : '';

        return {
            title: item.desc || '抖音视频',
            cover_url: coverUrl,
            video_url: videoUrl
        };
    }

    /** 将各种格式的抖音链接转成标准视频页 URL */
    async _resolveShortLink(url) {
        // 已经是视频页 URL
        if (url.includes('/video/') || url.includes('/share/video/')) return url;

        // 精选页 / 搜索页 — 从 modal_id 提取视频 ID
        const modalMatch = url.match(/modal_id=(\d+)/);
        if (modalMatch) {
            return 'https://www.iesdouyin.com/share/video/' + modalMatch[1] + '/';
        }

        // 纯数字 ID
        if (/\/\d{15,}$/.test(url)) return url;
        try {
            const resp = await fetch(url, {
                method: 'GET',
                redirect: 'manual',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
                }
            });
            const location = resp.headers.get('location');
            if (location && location !== 'https://www.douyin.com' && location !== 'https://www.douyin.com/') {
                return location;
            }
        } catch (_) {}
        return null;
    }
}

module.exports = DouyinParser;
