using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;

class VideoParserDesktop : Form
{
    private WebView2 webView;
    private Process nodeProcess;
    private Panel titleBar;
    private bool isDragging = false;
    private Point dragStart;

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new VideoParserDesktop());
    }

    public VideoParserDesktop()
    {
        // ====== 窗口配置 ======
        this.Text = "视频解析器";
        this.Size = new Size(1050, 720);
        this.MinimumSize = new Size(800, 600);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.None;
        this.BackColor = Color.FromArgb(15, 17, 25);
        this.Icon = SystemIcons.Application;

        // ====== 首次运行: 解压文件 ======
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string marker = Path.Combine(baseDir, ".installed");
        if (!File.Exists(marker))
        {
            ExtractFiles(baseDir);
            File.WriteAllText(marker, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
        }

        // 确保运行时目录
        Directory.CreateDirectory(Path.Combine(baseDir, "data", "downloads"));

        // ====== 自定义标题栏 ======
        titleBar = new Panel
        {
            Height = 32,
            Dock = DockStyle.Top,
            BackColor = Color.FromArgb(12, 14, 22)
        };

        // ====== 左侧可点击圆点（macOS 风格） ======
        var btnClose = MakeDotButton(14, Color.FromArgb(255, 95, 86), Color.FromArgb(220, 50, 50));
        btnClose.Click += (s, e) => Shutdown();
        btnClose.MouseEnter += (s, e) => { var b = (Button)s; b.Text = "×"; b.Font = new Font("Segoe UI", 8, FontStyle.Bold); };
        btnClose.MouseLeave += (s, e) => { var b = (Button)s; b.Text = ""; };
        titleBar.Controls.Add(btnClose);

        var btnMin = MakeDotButton(30, Color.FromArgb(255, 189, 46), Color.FromArgb(220, 160, 20));
        btnMin.Click += (s, e) => this.WindowState = FormWindowState.Minimized;
        btnMin.MouseEnter += (s, e) => { var b = (Button)s; b.Text = "−"; b.Font = new Font("Segoe UI", 8, FontStyle.Bold); };
        btnMin.MouseLeave += (s, e) => { var b = (Button)s; b.Text = ""; };
        titleBar.Controls.Add(btnMin);

        var btnMax = MakeDotButton(46, Color.FromArgb(39, 201, 63), Color.FromArgb(30, 180, 50));
        btnMax.Click += (s, e) => {
            this.WindowState = this.WindowState == FormWindowState.Maximized
                ? FormWindowState.Normal : FormWindowState.Maximized;
        };
        titleBar.Controls.Add(btnMax);

        // ====== 标题文字 ======
        var titleLabel = new Label
        {
            Text = "视频解析器",
            ForeColor = Color.FromArgb(100, 100, 110),
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
            AutoSize = false,
            TextAlign = ContentAlignment.MiddleCenter,
            Dock = DockStyle.Fill
        };
        titleBar.Controls.Add(titleLabel);

        // 拖动事件
        titleBar.MouseDown += (s, e) => { isDragging = true; dragStart = e.Location; };
        titleBar.MouseMove += (s, e) => { if (isDragging) this.Location = new Point(this.Location.X + e.X - dragStart.X, this.Location.Y + e.Y - dragStart.Y); };
        titleBar.MouseUp += (s, e) => isDragging = false;

        this.Controls.Add(titleBar);

        // 调整客户区
        this.ClientSize = new Size(1050, 720);

        // ====== WebView2 ======
        webView = new WebView2
        {
            Dock = DockStyle.Fill
        };
        this.Controls.Add(webView);

        // 启动后端服务
        StartBackend(baseDir);

        // 加载前端
        this.Load += async (s, e) =>
        {
            await webView.EnsureCoreWebView2Async(null);
            // 等待后端完全就绪后加载前端
            for (int i = 0; i < 30; i++)
            {
                try
                {
                    var req = System.Net.WebRequest.Create("http://localhost:3457/api/settings");
                    using (var resp = req.GetResponse()) { break; }
                }
                catch { Thread.Sleep(500); }
            }
            webView.CoreWebView2.Navigate("http://localhost:3457");
        };

        this.FormClosing += (s, e) => Shutdown();
    }

    private Button MakeDotButton(int x, Color color, Color hoverColor)
    {
        var btn = new Button
        {
            Size = new Size(14, 14),
            Location = new Point(x, 9),
            FlatStyle = FlatStyle.Flat,
            ForeColor = Color.White,
            BackColor = color,
            Text = "",
            Font = new Font("Segoe UI", 7, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleCenter
        };
        btn.FlatAppearance.BorderSize = 0;
        btn.FlatAppearance.MouseOverBackColor = hoverColor;
        // 圆形
        var path = new System.Drawing.Drawing2D.GraphicsPath();
        path.AddEllipse(0, 0, 14, 14);
        btn.Region = new Region(path);
        return btn;
    }

    private void StartBackend(string baseDir)
    {
        string nodeExe = Path.Combine(baseDir, "node", "node.exe");
        if (!File.Exists(nodeExe))
        {
            MessageBox.Show("未找到 node.exe，文件可能损坏。\n路径: " + nodeExe, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Application.Exit();
            return;
        }

        // 检查并安装依赖
        string nmDir = Path.Combine(baseDir, "node_modules");
        if (!Directory.Exists(nmDir))
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = Path.Combine(baseDir, "node", "npm.cmd"),
                    Arguments = "install --production --registry=https://registry.npmmirror.com",
                    WorkingDirectory = baseDir,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                var install = Process.Start(psi);
                install.WaitForExit(60000);
            }
            catch { }
        }

        nodeProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = nodeExe,
                Arguments = "server.js",
                WorkingDirectory = baseDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            }
        };
        nodeProcess.Start();
    }

    private void ExtractFiles(string baseDir)
    {
        try
        {
            var asm = Assembly.GetExecutingAssembly();
            using (var stream = asm.GetManifestResourceStream("VideoParserDesktop.app.zip"))
            {
                if (stream == null) return;
                using (var archive = new ZipArchive(stream))
                {
                    foreach (var entry in archive.Entries)
                    {
                        string fullPath = Path.Combine(baseDir, entry.FullName);
                        if (string.IsNullOrEmpty(entry.Name))
                            Directory.CreateDirectory(fullPath);
                        else
                        {
                            Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
                            entry.ExtractToFile(fullPath, true);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show("解压失败: " + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Application.Exit();
        }
    }

    private void Shutdown()
    {
        try
        {
            if (nodeProcess != null && !nodeProcess.HasExited)
            {
                nodeProcess.Kill();
                nodeProcess.Dispose();
            }
        }
        catch { }
        Application.Exit();
    }
}
