/**
 * Twitter/X 解析器
 * 通过本地代理(127.0.0.1:3456)访问国外服务器
 * 不影响其他平台（代理仅用于 Twitter 请求）
 */
const BaseParser = require('./base');
const { HttpsProxyAgent } = require('https-proxy-agent');

// 本地 DeepSeek 代理
const PROXY_URL = 'http://127.0.0.1:3456';
const proxyAgent = new HttpsProxyAgent(PROXY_URL);

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
        const tweetId = this._extractTweetId(url);
        if (!tweetId) throw new Error('无法从链接中提取推文 ID');

        // 方案 1: Syndication API (通过代理)
        try {
            return await this._syndicationAPI(tweetId);
        } catch (e) {
            // 方案 2: fxTwitter
            try {
                return await this._fxtwitter(tweetId);
            } catch (e2) {
                throw new Error('Twitter 解析失败 — Syndication: ' + e.message + ' | fxTwitter: ' + e2.message);
            }
        }
    }

    _extractTweetId(url) {
        const m = url.match(/\/status\/(\d+)/);
        return m ? m[1] : null;
    }

    /** Syndication API — 走代理 */
    async _syndicationAPI(tweetId) {
        const apiUrl = 'https://cdn.syndication.twimg.com/tweet-result?id=' + tweetId + '&lang=en';
        const resp = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            agent: proxyAgent  // 仅此请求走代理
        });

        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        if (!data.text) throw new Error('推文不存在或已删除');

        const title = (data.text || '').substring(0, 200);
        let coverUrl = '';
        let variants = [];

        if (data.mediaDetails) {
            for (const m of data.mediaDetails) {
                if (m.type === 'photo') coverUrl = m.media_url_https || '';
                if (m.video_info && m.video_info.variants) {
                    variants.push(...m.video_info.variants);
                }
            }
        }
        if (data.video && data.video.variants) variants.push(...data.video.variants);

        const mp4s = variants.filter(v => v.content_type === 'video/mp4');
        if (mp4s.length === 0) throw new Error('该推文不含视频');

        mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        return { title, cover_url: coverUrl, video_url: mp4s[0].src || '' };
    }

    /** fxTwitter API — 也走代理 */
    async _fxtwitter(tweetId) {
        const urls = [
            'https://api.fxtwitter.com/status/' + tweetId,
            'https://api.vxtwitter.com/status/' + tweetId,
        ];
        for (const url of urls) {
            try {
                const resp = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
                    agent: proxyAgent
                });
                if (!resp.ok) continue;
                const json = await resp.json();
                const media = json.tweet?.media?.extended || json.tweet?.media?.all || [];
                const video = media.find(m => m.type === 'video' || m.type === 'gif');
                if (video && video.url) {
                    return {
                        title: (json.tweet?.text || '').substring(0, 200),
                        cover_url: json.tweet?.media?.photos?.[0]?.url || '',
                        video_url: video.url
                    };
                }
            } catch (_) { continue; }
        }
        throw new Error('fxTwitter API 失败');
    }
}

module.exports = TwitterParser;
