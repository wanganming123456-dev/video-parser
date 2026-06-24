/**
 * 解析器基类 — 定义统一接口
 * 所有平台解析器继承此类
 */
class BaseParser {

    /** 子类需覆盖：返回平台名称 */
    static get platform() { return 'unknown'; }

    /** 子类需覆盖：正则列表 */
    static get urlPatterns() { return []; }

    /**
     * 判断此解析器是否能处理给定 URL
     * @param {string} url
     * @returns {boolean}
     */
    static canHandle(url) {
        return this.urlPatterns.some(pattern => pattern.test(url));
    }

    /**
     * 解析视频链接（子类必须实现）
     * @param {string} url - 视频分享链接
     * @returns {Promise<{title:string, cover_url:string, video_url:string}>}
     */
    async parse(url) {
        throw new Error('子类必须实现 parse() 方法');
    }

    /**
     * 生成模拟移动端请求头
     */
    static get mobileHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
                'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/json,*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br'
        };
    }
}

module.exports = BaseParser;
