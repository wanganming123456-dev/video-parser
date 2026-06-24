/**
 * Twitter/X 解析器
 * 使用国内可用的免费第三方 API
 */
const BaseParser = require('./base');

class TwitterParser extends BaseParser {

    static get platform() { return 'twitter'; }

    static get urlPatterns() {
        return [
            /x\.com\/\w+\/status\/\d+/,
            /twitter\.com\/\w+\/status\/\d+/,
            /t\.co\/[A-Za-z0-9]+/
        ];
    }

    async parse(url) {
        // 提取推文 ID
        const tweetId = this._extractTweetId(url);
        if (!tweetId) throw new Error('无法从链接中提取推文 ID');

        const errors = [];

        // 方案 1: api.videofetcher.net (免费层)
        try {
            return await this._tryFetchAPI(tweetId);
        } catch (e) { errors.push('API1:' + e.message); }

        // 方案 2: 通过CORS代理访问 Syndication API
        try {
            return await this._trySyndicationProxy(tweetId);
        } catch (e) { errors.push('API2:' + e.message); }

        throw new Error('Twitter 解析失败: ' + errors.join(' | '));
    }

    /** 从 URL 提取推文 ID */
    _extractTweetId(url) {
        const m = url.match(/\/status\/(\d+)/);
        if (m) return m[1];
        // 短链 t.co
        const m2 = url.match(/t\.co\/([A-Za-z0-9]+)/);
        if (m2) return null; // 需要先解开短链
        return null;
    }

    /** 方案 1: 使用免费视频解析 API */
    async _tryFetchAPI(tweetId) {
        const apiUrl = 'https://api.videofetcher.net/obApi/api/analysis';
        const xUrl = 'https://x.com/i/status/' + tweetId;

        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': 'https://api.videofetcher.net',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({ url: xUrl })
        });

        if (!resp.ok) throw new Error('API 请求失败 HTTP ' + resp.status);
        const json = await resp.json();

        if (json.code !== 200 || !json.data) {
            throw new Error(json.msg || json.message || 'API 返回异常');
        }

        const title = json.data.title || json.data.desc || '';
        const coverUrl = json.data.cover || json.data.thumbnail || '';
        const videoUrl = json.data.url || json.data.video_url || json.data.download_url || '';

        if (!videoUrl) throw new Error('API 未返回视频地址');
        return { title, cover_url: coverUrl, video_url: videoUrl };
    }

    /** 方案 2: 通过 CORS 代理访问 Syndication API */
    async _trySyndicationProxy(tweetId) {
        const syndicationUrl = 'https://cdn.syndication.twimg.com/tweet-result?id=' + tweetId + '&lang=en';

        // 尝试多个 CORS 代理
        const proxies = [
            { name: 'corsproxy', url: 'https://corsproxy.io/?' + encodeURIComponent(syndicationUrl) },
            { name: 'codetabs', url: 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(syndicationUrl) },
        ];

        for (const proxy of proxies) {
            try {
                const resp = await fetch(proxy.url, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!resp.ok) continue;
                const json = await resp.json();

                if (json.text) {
                    const title = json.text.substring(0, 200);
                    const variants = json.mediaDetails
                        ? json.mediaDetails[0]?.video_info?.variants
                        : json.video?.variants || [];

                    // 筛选最高码率 mp4
                    const mp4s = variants.filter(v => v.content_type === 'video/mp4');
                    if (mp4s.length > 0) {
                        mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                        return {
                            title,
                            cover_url: json.mediaDetails?.[0]?.media_url_https || '',
                            video_url: mp4s[0].src || ''
                        };
                    }
                }
            } catch (_) { continue; }
        }
        throw new Error('所有代理均无法访问 Syndication API');
    }
}

module.exports = TwitterParser;
