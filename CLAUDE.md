# 视频解析器 — 项目专属 CLAUDE.md

## 项目概述

一款绿色免安装的抖音/快手/Twitter 视频解析工具，基于 Node.js + Express 后端，内嵌便携版 Node.js 运行时，C# WinForms + WebView2 桌面壳，双击 EXE 即可启动独立窗口应用。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js + Express 4.x |
| 数据库 | JSON 文件存储 (`data/store.json`) | 
| 前端 | 原生 HTML/CSS/JS（零框架） |
| 桌面壳 | C# WinForms + WebView2 (.NET Framework 4.x) |
| 打包 | C# 资源嵌入 ZIP，首次运行解压 |
| 测试端口 | 3457（3456 被 DeepSeek 代理占用） |

## 目录结构

```
视频解析器/
├── server.js                 ← Express 入口
├── start.bat                 ← 双击启动脚本
├── package.json
├── make-doc.js               ← 版本记录 Word 生成脚本
├── .gitignore
├── backend/
│   ├── db/
│   │   ├── database.js       ← JSON 文件存储引擎
│   │   └── models.js         ← Task/History/Settings CRUD
│   ├── parser/
│   │   ├── base.js           ← 解析器基类
│   │   ├── douyin.js         ← 抖音解析器
│   │   ├── kuaishou.js       ← 快手解析器
│   │   ├── twitter.js        ← Twitter 解析器（需代理）
│   │   └── engine.js         ← 平台识别 + 流程调度
│   ├── routes/
│   │   ├── parse.js          ← POST /api/parse
│   │   ├── tasks.js          ← GET/DELETE /api/tasks
│   │   ├── history.js        ← GET/DELETE /api/history + 下载
│   │   └── settings.js       ← GET/PUT /api/settings
│   └── utils/
│       ├── downloader.js     ← 视频流式下载
│       └── logger.js         ← 日志模块
├── frontend/
│   ├── index.html
│   ├── css/app.css           ← 深色专业风格
│   └── js/
│       ├── api.js            ← 后端 API 封装
│       └── app.js            ← 主逻辑 + 路由 + 任务轮询
├── desktop/
│   ├── Program.cs            ← C# WinForms + WebView2 主程序
│   ├── *.dll                 ← WebView2 封装 DLL
│   └── 视频解析器.exe         ← 编译产物（不提交 Git）
├── data/                     ← 运行时自动创建，不提交 Git
│   ├── store.json
│   └── downloads/
├── docs/
│   ├── 2026-06-23-视频解析器-设计文档.md
│   ├── 2026-06-24-桌面应用版-设计文档.md
│   ├── 2026-06-23-视频解析器-实施计划.md
│   └── 视频解析器-版本记录.docx
├── mockup/
│   └── desktop-ui-comparison.html
└── node/                     ← 内嵌便携版 Node.js，不提交 Git
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
node server.js

# 启动（使用内嵌便携版 Node）
.\node\node.exe server.js

# 编译桌面版 EXE（需要 csc.exe 和 WebView2 DLL）
# 详见 desktop/Program.cs 顶部注释

# 生成版本记录 Word 文档
node make-doc.js

# Git 提交
git add -A
git commit -m "描述"
git push
```

## 桌面版 EXE 打包流程

1. 用 xcopy 将 node/ node_modules/ frontend/ backend/ server.js package.json 复制到构建目录
2. PowerShell `Compress-Archive` 打包为 ZIP
3. `csc.exe` 编译 `Program.cs`，将 ZIP 作为嵌入资源
4. 需引用 desktop/ 下的 WebView2 DLL

```powershell
# 完整打包命令（伪代码）
xcopy node node_modules frontend backend server.js package.json → build/
Compress-Archive build\* → desktop-app.zip
csc.exe /target:winexe /resource:desktop-app.zip,VideoParserDesktop.app.zip /reference:*.dll /out:视频解析器.exe Program.cs
```

## 关键约束

### 端口
- **3456**: DeepSeek 代理，禁止占用
- **3457**: 视频解析器服务端口

### 禁止操作
- ❌ 禁止 `taskkill /F /IM node.exe`（会杀死 DeepSeek 代理）
- ❌ 禁止删除/修改 CLAUDE.md 中代理章节
- ❌ 禁止将 data/ node/ 提交到 Git

### Git 记录
- 仓库: `https://github.com/wanganming123456-dev/video-parser`
- 当前版本: `master` 分支

## 平台支持状态

| 平台 | 状态 | 说明 |
|---|---|---|
| 抖音 | ✅ 生产可用 | 支持短链/视频页/精选页 |
| 快手 | ✅ 生产可用 | 支持分享短链 |
| Twitter/X | ⌛ 代码就绪 | 需 VPN/代理环境，Syndication API 三级回退 |

## 已知问题

- Twitter 解析器因国内网络限制暂时无法使用
- 猫猫云（游戏加速器）不支持 Twitter API 转发，需要通用 VPN/代理
