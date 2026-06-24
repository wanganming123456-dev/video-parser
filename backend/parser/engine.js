/**
 * 解析引擎路由器
 * 根据 URL 识别平台并调用对应解析器
 */
const DouyinParser = require('./douyin');
const KuaishouParser = require('./kuaishou');
const { Task } = require('../db/models');

class ParserEngine {

    constructor() {
        /** @type {BaseParser[]} 已注册的解析器 */
        this.parsers = [
            new DouyinParser(),
            new KuaishouParser()
        ];
    }

    /**
     * 识别 URL 所属平台
     * @param {string} url
     * @returns {string} 平台名或 'unknown'
     */
    detectPlatform(url) {
        for (const parser of this.parsers) {
            if (parser.constructor.canHandle(url)) {
                return parser.constructor.platform;
            }
        }
        return 'unknown';
    }

    /**
     * 使用已有 taskId 执行解析（不创建新任务）
     * @param {string} url
     * @param {number} taskId - 已存在的任务 ID
     * @returns {Promise<object>} 最终任务对象
     */
    async parseWithTaskId(url, taskId) {
        const platform = this.detectPlatform(url);

        // 更新平台信息
        Task.update(taskId, { platform, status: 'parsing' });

        if (platform === 'unknown') {
            return Task.update(taskId, {
                status: 'failed',
                error_msg: '不支持的链接格式，目前仅支持抖音和快手'
            });
        }

        const parser = this.parsers.find(
            p => p.constructor.platform === platform
        );
        if (!parser) {
            return Task.update(taskId, {
                status: 'failed',
                error_msg: `未找到平台 ${platform} 的解析器`
            });
        }

        try {
            const result = await parser.parse(url);

            if (!result.video_url) {
                throw new Error('解析到的视频地址为空');
            }

            return Task.update(taskId, {
                status: 'done',
                title: result.title || '未知标题',
                cover_url: result.cover_url || '',
                video_url: result.video_url
            });
        } catch (err) {
            return Task.update(taskId, {
                status: 'failed',
                error_msg: err.message
            });
        }
    }

    /**
     * 获取支持的平台列表
     */
    getSupportedPlatforms() {
        return this.parsers.map(p => ({
            name: p.constructor.platform,
            patterns: p.constructor.urlPatterns.map(r => r.source)
        }));
    }
}

// 单例
module.exports = new ParserEngine();
