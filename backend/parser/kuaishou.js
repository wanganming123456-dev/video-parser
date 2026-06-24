/**
 * 快手解析器 — 从分享页面提取视频地址
 * 核心: 匹配页面中的 mp4 backupUrl
 */
const BaseParser = require('./base');

class KuaishouParser extends BaseParser {

    static get platform() { return 'kuaishou'; }

    static get urlPatterns() {
        return [
            /v\.kuaishou\.com\/[A-Za-z0-9]+\/?/,
            /v\.m\.chenzhongtech\.com\/fw\//,
            /www\.kuaishou\.com\/short-video\//,
            /kuaishou\.com\/fw\/video\//,
            /kuaishou\.com/
        ];
    }

    async parse(url) {
        // 带移动端 UA 请求
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,*/*',
                'Accept-Language': 'zh-CN,zh-Hans;q=0.9'
            },
            redirect: 'follow'
        });
        const html = await resp.text();

        // 方法 A: 提取 backupUrl 中的 mp4 地址（最常见、最可靠）
        const backupMatch = html.match(/"backupUrl":\s*\[\s*"([^"]+\.mp4[^"]*)"/i);
        if (backupMatch) {
            const videoUrl = backupMatch[1].replace(/\\u002F/g, '/');
            const title = this._extractTitle(html);
            const cover = this._extractCover(html);
            return { title, cover_url: cover, video_url: videoUrl };
        }

        // 方法 B: 通配搜索 mp4 URL
        const mp4Match = html.match(/(https?:\\?\/\\?\/[^"'\s]*kwaicdn[^"'\s]*\.mp4[^"'\s]*)/i);
        if (mp4Match) {
            const videoUrl = mp4Match[1].replace(/\\\//g, '/');
            const title = this._extractTitle(html);
            const cover = this._extractCover(html);
            return { title, cover_url: cover, video_url: videoUrl };
        }

        // 方法 C: 搜索任何 mp4
        const anyMp4 = html.match(/https?:\/\/[^"'\s]*\.mp4[^"',\s]*/i);
        if (anyMp4) {
            return {
                title: this._extractTitle(html),
                cover_url: this._extractCover(html),
                video_url: anyMp4[0]
            };
        }

        // 方法 D: 尝试 GraphQL API（需 photoId）
        const pidMatch = html.match(/"photoId":\s*(\d+)/);
        if (pidMatch) {
            try {
                return await this._tryGraphQL(pidMatch[1]);
            } catch (_) {}
        }

        throw new Error('未找到视频地址（HTML长度: ' + html.length + '）');
    }

    /** 从页面提取标题 */
    _extractTitle(html) {
        const m = html.match(/"caption"\s*:\s*"([^"]+)"/);
        if (m) return m[1];
        const m2 = html.match(/"title"\s*:\s*"([^"]+)"/);
        if (m2) return m2[1];
        const m3 = html.match(/<title>([^<]+)<\/title>/);
        if (m3) return m3[1].replace(' - 快手', '').trim();
        return '快手视频';
    }

    /** 从页面提取封面 */
    _extractCover(html) {
        const m = html.match(/"coverUrl"\s*:\s*"([^"]+)"/);
        if (m) return m[1];
        const m2 = html.match(/"poster"\s*:\s*"([^"]+)"/);
        if (m2) return m2[1];
        const m3 = html.match(/https?:\/\/[^"'\s]*\.(?:jpg|webp|jpeg)[^"'\s]*/i);
        if (m3) return m3[0];
        return '';
    }

    /** GraphQL API 兜底 */
    async _tryGraphQL(photoId) {
        const resp = await fetch('https://www.kuaishou.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
            },
            body: JSON.stringify({
                operationName: 'visionVideoDetail',
                variables: { photoId },
                query: 'query visionVideoDetail($photoId:String){visionVideoDetail(photoId:$photoId){photo{caption photoUrl duration videoResource{manifest{adaptationSet{representation{url}}}}}}}'
            })
        });
        const json = await resp.json();
        if (json.result !== 1 || !json.data) throw new Error('GraphQL返回异常');
        const video = json.data.visionVideoDetail && json.data.visionVideoDetail.photo;
        if (!video) throw new Error('无视频数据');
        const repr = video.videoResource && video.videoResource.manifest
            && video.videoResource.manifest.adaptationSet
            && video.videoResource.manifest.adaptationSet[0]
            && video.videoResource.manifest.adaptationSet[0].representation;
        const videoUrl = repr && repr[0] && repr[0].url;
        return {
            title: video.caption || '快手视频',
            cover_url: video.photoUrl || '',
            video_url: videoUrl || ''
        };
    }
}

module.exports = KuaishouParser;
