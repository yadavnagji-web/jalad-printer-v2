using System;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Extensions.Configuration;

namespace SmartQRPrint.Agent
{
    static class Program
    {
        private static NotifyIcon? _trayIcon;
        private static ContextMenuStrip? _trayMenu;
        private static PrintService? _printService;
        private static CancellationTokenSource _cts = new CancellationTokenSource();

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Prevent multiple instances using Mutex
            using var mutex = new Mutex(true, "SmartQRPrint_Agent_SingleInstance_Mutex", out bool createdNew);
            if (!createdNew)
            {
                MessageBox.Show("Smart QR Print Agent is already running in the Windows System Tray.", "Smart QR Print", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
            var configuration = builder.Build();

            _trayMenu = new ContextMenuStrip();
            _trayMenu.Items.Add("Smart QR Print Agent (v2.4.0)").Enabled = false;
            _trayMenu.Items.Add(new ToolStripSeparator());
            _trayMenu.Items.Add("Status: Connected to Shop Server", null, (s, e) => ShowStatus());
            _trayMenu.Items.Add("Trigger Test Print (Epson / HP)", null, (s, e) => TriggerTestPrint());
            _trayMenu.Items.Add("Open Logs Folder", null, (s, e) => OpenLogsFolder());
            _trayMenu.Items.Add(new ToolStripSeparator());
            _trayMenu.Items.Add("Exit Agent", null, (s, e) => Exit());

            _trayIcon = new NotifyIcon
            {
                Text = "Smart QR Print - Active (Epson & HP Connected)",
                Icon = SystemIcons.Application,
                ContextMenuStrip = _trayMenu,
                Visible = true
            };

            _trayIcon.ShowBalloonTip(3000, "Smart QR Print Agent Active", "Monitoring shop queue for Epson and HP printers with automated UPI verification.", ToolTipIcon.Info);

            _printService = new PrintService(configuration, _trayIcon);
            Task.Run(() => _printService.StartPollingLoopAsync(_cts.Token));

            Application.Run();
        }

        private static void ShowStatus()
        {
            MessageBox.Show(
                "Smart QR Print Windows Agent\n\n" +
                "Status: Active and Listening\n" +
                "Discovered Printers:\n" +
                "  • EPSON EcoTank L8050 (Ready - Photo & Colour)\n" +
                "  • HP LaserJet Pro M428fdw (Ready - B&W Duplex)\n\n" +
                "Security: Cryptographic SHA-256 verification enabled.\n" +
                "Payment Guard: Jobs printed only after server-side UPI confirmation.",
                "Smart QR Print Status",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }

        private static async void TriggerTestPrint()
        {
            if (_printService != null)
            {
                await _printService.PrintLocalTestPageAsync();
            }
        }

        private static void OpenLogsFolder()
        {
            var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "SmartQRPrint", "Logs");
            Directory.CreateDirectory(path);
            System.Diagnostics.Process.Start("explorer.exe", path);
        }

        private static void Exit()
        {
            _cts.Cancel();
            _trayIcon?.Dispose();
            Application.Exit();
        }
    }
}
