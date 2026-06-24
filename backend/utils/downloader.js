/**
 * 视频下载器 — 流式下载视频到本地
 */
const fs = require('fs');
const path = require('path');
const { Settings, Task, History } = require('../db/models');

class Downloader {

    /**
     * 下载视频
     * @param {number} taskId - 任务 ID
     * @returns {Promise<{localPath: string, historyId: number}>}
     */
    static async download(taskId) {
        const task = Task.getById(taskId);
        if (!task) throw new Error('任务不存在');
        if (task.status !== 'done') throw new Error('任务尚未解析完成');
        if (!task.video_url) throw new Error('视频地址为空');

        const downloadDir = Settings.get('download_dir') ||
            path.join(__dirname, '..', '..', 'data', 'downloads');

        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        // 生成文件名
        const ext = '.mp4';
        const timestamp = Date.now();
        const safeTitle = (task.title || 'video')
            .replace(/[<>:"/\\|?*]/g, '')
            .substring(0, 40);
        const filename = `${timestamp}_${safeTitle}${ext}`;
        const filePath = path.join(downloadDir, filename);

        // 流式下载 (node-fetch ESM → 使用 https 模块)
        const https = require('https');
        const http = require('http');
        const client = task.video_url.startsWith('https') ? https : http;

        await new Promise((resolve, reject) => {
            client.get(task.video_url, (resp) => {
                // 处理重定向
                if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                    const redirectClient = resp.headers.location.startsWith('https') ? https : http;
                    redirectClient.get(resp.headers.location, (resp2) => {
                        const fileStream = fs.createWriteStream(filePath);
                        resp2.pipe(fileStream);
                        fileStream.on('finish', resolve);
                        fileStream.on('error', reject);
                    }).on('error', reject);
                    return;
                }
                const fileStream = fs.createWriteStream(filePath);
                resp.pipe(fileStream);
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            }).on('error', reject);
        });

        // 写入历史记录
        const historyId = History.create(
            task.id,
            task.title,
            task.platform,
            task.video_url,
            filePath
        );

        return { localPath: filePath, historyId };
    }
}

module.exports = Downloader;
