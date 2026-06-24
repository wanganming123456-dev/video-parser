const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, LevelFormat, PageBreak, PageNumber } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellW = [1200, 1400, 1800, 4960]; // 版本号 | 日期 | 类型 | 描述

function td(text, opts = {}) {
  return new TableCell({
    borders,
    width: { size: opts.w || 1200, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: String(text), size: 20, font: 'Microsoft YaHei',
        bold: !!opts.bold, color: opts.color || '333333' })]
    })]
  });
}

function headerRow(texts) {
  return new TableRow({
    tableHeader: true,
    children: texts.map((t, i) => td(t, { bold: true, w: cellW[i], fill: '1E3A5F', color: 'FFFFFF' }))
  });
}

function row(v, date, type, desc, even) {
  const fill = even ? 'F5F8FC' : undefined;
  return new TableRow({
    children: [
      td(v, { bold: true, w: cellW[0], fill }),
      td(date, { w: cellW[1], fill }),
      td(type, { w: cellW[2], fill }),
      td(desc, { w: cellW[3], fill })
    ]
  });
}

const commits = [
  ['cf35ee6', '2026-06-25', '新功能', 'Twitter/X 解析器 — 三级回退方案 (Syndication API + fxTwitter + sadaslk)。因国内网络限制，Syndication API 需通过 VPN/代理访问，代码已就绪。'],
  ['a83f033', '2026-06-24', '新功能', '新增 Twitter/X 视频解析支持: 注册 twitter.js 解析器到引擎，前端新增 🐦 X/Twitter 平台标签。'],
  ['05e80ac', '2026-06-24', 'Bug修复', '彻底解决遮挡问题: 弃用 C# 自定义标题栏, 改用 Windows 原生标题栏 (FormBorderStyle.Sizable)。自带标准 ✕ 关闭按钮, 不再有 Z-order 遮挡。CSS 恢复正常间距。'],
  ['24c4f8e', '2026-06-24', 'Bug修复', '修复内容区顶部文字被标题栏遮挡问题: 将 .content-area 的 padding-top 从 12px 增加到 36px。'],
  ['7b143ed', '2026-06-24', '清理', '清理项目中的残留文件: 删除旧组件 inputBox.js/taskList.js/historyList.js, 新增 .gitignore 条目排除 WebView2 运行时缓存和编译中间文件。'],
  ['13b70ae', '2026-06-24', 'Bug修复', '标题栏三个圆点从装饰改为可点击按钮: 红色圆点=关闭程序, 黄色=最小化, 绿色=最大化/还原。鼠标悬停时显示 ×/−/+ 符号提示。'],
  ['79a185c', '2026-06-24', 'Bug修复', '修复标题栏冲突: C# 自绘标题栏和 HTML 标题栏叠在一起互相遮挡。改为 C# 原生控件负责任标题栏(有关闭/最小化/最大化), HTML 只负责业务内容。'],
  ['f755fbe', '2026-06-24', 'Bug修复', '修复两个已知问题: (1)左侧导航中历史记录和设置页无法点击切换 (2)HTML 缺少关闭按钮。重写 app.js 统一管理三页面切换, 新增 CSS 标题栏按钮样式。'],
  ['1a0efaa', '2026-06-24', '重大功能', '桌面应用版 v1: C# WinForms + WebView2 独立窗口。新增 desktop/Program.cs, 内嵌便携版 Node.js, 双击 EXE 即弹出原生桌面窗口 (37MB)。前端重写为深色专业风格。'],
  ['6ab8f38', '2026-06-24', '初始化', '项目骨架: Express 后端 + JSON 存储 + 前端界面 + 抖音/快手解析引擎。支持 v.douyin.com 短链和 kuaishou.com 分享链接。'],
];

const rows = [];
commits.forEach((c, i) => rows.push(row(c[0], c[1], c[2], c[3], i % 2 === 0)));

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Microsoft YaHei', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, color: '1E3A5F', font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, color: '2C5282', font: 'Microsoft YaHei' },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
    ]
  },
  sections: [
    // ==== 封面 ====
    {
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          size: {}
        }
      },
      children: [
        new Paragraph({ spacing: { before: 3600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: '视频解析器', size: 72, bold: true, color: '1E3A5F', font: 'Microsoft YaHei' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: '版本记录文档', size: 40, color: '4A90D9', font: 'Microsoft YaHei' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: '抖音 / 快手视频无水印解析工具', size: 26, color: '666666', font: 'Microsoft YaHei' })]
        }),
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '共 10 个版本  ·  2026年6月', size: 22, color: '999999', font: 'Microsoft YaHei' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: '最新版本: 05e80ac  ·  2026-06-24', size: 20, color: 'AAAAAA', font: 'Microsoft YaHei' })]
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ]
    },
    // ==== 版本表格 ====
    {
      properties: {
        page: {
          margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: '视频解析器 — 版本记录', size: 18, color: '999999', font: 'Microsoft YaHei' })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '第 ', size: 18, color: '999999', font: 'Microsoft YaHei' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '999999' }),
              new TextRun({ text: ' 页', size: 18, color: '999999', font: 'Microsoft YaHei' })
            ]
          })]
        })
      },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('版本发布记录')] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '以下按时间倒序记录所有已发布版本。', size: 22, color: '666666', font: 'Microsoft YaHei' })] }),
        new Table({
          columnWidths: cellW,
          rows: [
            headerRow(['版本号', '日期', '类型', '变更说明']),
            ...rows
          ]
        }),
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('版本类型说明')] }),
        new Paragraph({ spacing: { after: 120 }, children: [
          new TextRun({ text: '初始化', bold: true, color: '2C5282', font: 'Microsoft YaHei', size: 20 }),
          new TextRun({ text: ' — 项目首次创建, 包含完整的基础功能和架构', font: 'Microsoft YaHei', size: 20, color: '555555' })
        ] }),
        new Paragraph({ spacing: { after: 120 }, children: [
          new TextRun({ text: '重大功能', bold: true, color: '2C5282', font: 'Microsoft YaHei', size: 20 }),
          new TextRun({ text: ' — 新增重要的功能模块或架构变更', font: 'Microsoft YaHei', size: 20, color: '555555' })
        ] }),
        new Paragraph({ spacing: { after: 120 }, children: [
          new TextRun({ text: 'Bug修复', bold: true, color: '2C5282', font: 'Microsoft YaHei', size: 20 }),
          new TextRun({ text: ' — 修复用户反馈或测试中发现的缺陷', font: 'Microsoft YaHei', size: 20, color: '555555' })
        ] }),
        new Paragraph({ children: [
          new TextRun({ text: '清理', bold: true, color: '2C5282', font: 'Microsoft YaHei', size: 20 }),
          new TextRun({ text: ' — 删除废弃代码, 整理项目文件结构', font: 'Microsoft YaHei', size: 20, color: '555555' })
        ] }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buf => {
  const out = 'D:\\文件\\CC项目\\游戏开发项目\\视频解析器\\docs\\视频解析器-版本记录.docx';
  fs.writeFileSync(out, buf);
  console.log('已生成: ' + out + ' (' + Math.round(buf.length / 1024) + ' KB)');
});
