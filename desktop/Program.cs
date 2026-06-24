using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;

class VideoParserDesktop : Form
{
    private WebView2 webView;
    private Process nodeProcess;

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new VideoParserDesktop());
    }

    public VideoParserDesktop()
    {
        // ====== 窗口配置（Windows 原生标题栏） ======
        this.Text = "视频解析器 — 抖音/快手无水印下载";
        this.Size = new Size(1050, 720);
        this.MinimumSize = new Size(800, 600);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.Sizable;
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

        // ====== WebView2 ======
        webView = new WebView2 { Dock = DockStyle.Fill };
        this.Controls.Add(webView);

        // 启动后端服务
        StartBackend(baseDir);

        // 加载前端
        this.Load += async (s, e) =>
        {
            await webView.EnsureCoreWebView2Async(null);
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

    private void StartBackend(string baseDir)
    {
        string nodeExe = Path.Combine(baseDir, "node", "node.exe");
        if (!File.Exists(nodeExe))
        {
            MessageBox.Show("未找到 node.exe，文件可能损坏。", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Application.Exit();
            return;
        }

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
