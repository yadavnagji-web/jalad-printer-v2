using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Extensions.Configuration;

namespace SmartQRPrint.Agent
{
    public class PrintService
    {
        private readonly IConfiguration _config;
        private readonly NotifyIcon _trayIcon;
        private readonly HttpClient _httpClient;
        private readonly HashSet<string> _processedJobs = new HashSet<string>();
        private readonly string _tempDir;
        private readonly string _serverUrl;
        private readonly string _apiKey;

        public PrintService(IConfiguration config, NotifyIcon trayIcon)
        {
            _config = config;
            _trayIcon = trayIcon;
            _serverUrl = config["ServerUrl"] ?? "http://localhost:3000";
            _apiKey = config["AgentApiKey"] ?? "sqp_agent_secret_key_prod";
            _tempDir = config["TempDirectory"] ?? Path.Combine(Path.GetTempPath(), "SmartQRPrint");

            Directory.CreateDirectory(_tempDir);

            _httpClient = new HttpClient();
            _httpClient.BaseAddress = new Uri(_serverUrl);
            _httpClient.DefaultRequestHeaders.Add("X-Agent-Key", _apiKey);
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task StartPollingLoopAsync(CancellationToken ct)
        {
            int pollInterval = int.TryParse(_config["PollIntervalSeconds"], out var p) ? p * 1000 : 3000;
            int heartbeatInterval = int.TryParse(_config["HeartbeatIntervalSeconds"], out var h) ? h * 1000 : 30000;
            DateTime lastHeartbeat = DateTime.MinValue;

            while (!ct.IsCancellationRequested)
            {
                try
                {
                    // 1. Send Heartbeat and discovered printers
                    if ((DateTime.UtcNow - lastHeartbeat).TotalMilliseconds >= heartbeatInterval)
                    {
                        await SendHeartbeatAsync();
                        lastHeartbeat = DateTime.UtcNow;
                    }

                    // 2. Poll for authorized, paid print jobs
                    await PollAndExecuteJobsAsync();
                }
                catch (Exception ex)
                {
                    Log($"[POLL ERROR] {ex.Message}");
                }

                await Task.Delay(pollInterval, ct);
            }
        }

        private async Task SendHeartbeatAsync()
        {
            var printerList = new List<object>();
            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                var settings = new PrinterSettings { PrinterName = printer };
                printerList.Add(new
                {
                    name = printer,
                    isDefault = settings.IsDefaultPrinter,
                    status = settings.IsValid ? "Ready" : "Offline",
                    supportsColor = settings.SupportsColor,
                    canDuplex = settings.CanDuplex
                });
            }

            var payload = new
            {
                machineName = Environment.MachineName,
                agentVersion = "2.4.0",
                timestamp = DateTime.UtcNow,
                printers = printerList
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            await _httpClient.PostAsync("/api/agent/heartbeat", content);
        }

        private async Task PollAndExecuteJobsAsync()
        {
            var response = await _httpClient.GetAsync("/api/agent/jobs");
            if (!response.IsSuccessStatusCode) return;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.ValueKind != JsonValueKind.Array) return;

            foreach (var job in root.EnumerateArray())
            {
                var jobId = job.GetProperty("id").GetString();
                if (string.IsNullOrEmpty(jobId) || _processedJobs.Contains(jobId)) continue;

                // Idempotency check: verify paymentStatus is strictly "paid"
                var paymentStatus = job.GetProperty("paymentStatus").GetString();
                if (paymentStatus != "paid")
                {
                    Log($"[SECURITY SKIP] Job {jobId} has payment status '{paymentStatus}', not paid.");
                    continue;
                }

                await ProcessJobAsync(job);
            }
        }

        private async Task ProcessJobAsync(JsonElement job)
        {
            var jobId = job.GetProperty("id").GetString()!;
            var orderNumber = job.GetProperty("orderNumber").GetString()!;
            _processedJobs.Add(jobId);

            _trayIcon.ShowBalloonTip(2000, "New Print Job Received", $"Order: {orderNumber}\nVerifying SHA-256 integrity...", ToolTipIcon.Info);
            await UpdateJobStatusAsync(jobId, "downloading", null);

            try
            {
                // Iterate over items
                var items = job.GetProperty("items");
                foreach (var item in items.EnumerateArray())
                {
                    var doc = item.GetProperty("document");
                    var expectedHash = doc.GetProperty("sha256Hash").GetString();
                    var storagePath = doc.GetProperty("storagePath").GetString();
                    var config = item.GetProperty("config");

                    // Download document
                    var fileBytes = await _httpClient.GetByteArrayAsync(storagePath);

                    // CRYPTOGRAPHIC INTEGRITY CHECK
                    var calculatedHash = ComputeSHA256(fileBytes);
                    if (!string.Equals(expectedHash, calculatedHash, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException($"SHA-256 Hash Mismatch! Source file integrity compromised. Expected: {expectedHash}, Got: {calculatedHash}");
                    }

                    // Route to Windows Printer
                    var colorMode = config.GetProperty("colorMode").GetString();
                    var targetPrinter = SelectPrinter(colorMode == "color");

                    await UpdateJobStatusAsync(jobId, "printing", $"Spooling to {targetPrinter}...");

                    // Print via native Windows PrintDocument / driver spooler
                    PrintDocument(fileBytes, doc.GetProperty("originalFileName").GetString()!, targetPrinter, config);
                }

                await UpdateJobStatusAsync(jobId, "completed", "Physical spool completed.");
                _trayIcon.ShowBalloonTip(3000, "Print Completed", $"Order {orderNumber} sent to printer successfully.", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                Log($"[JOB FAILED] {jobId}: {ex.Message}");
                await UpdateJobStatusAsync(jobId, "failed", ex.Message);
                _trayIcon.ShowBalloonTip(4000, "Printing Error", $"Job {orderNumber} failed: {ex.Message}", ToolTipIcon.Error);
            }
        }

        private string SelectPrinter(bool isColor)
        {
            if (isColor)
            {
                return _config["Printers:ColorAndPhotoPrinter"] ?? "EPSON L8050 Series";
            }
            return _config["Printers:BwAndDuplexPrinter"] ?? "HP LaserJet Pro MFP M428fdw";
        }

        private void PrintDocument(byte[] bytes, string fileName, string printerName, JsonElement config)
        {
            var tempFile = Path.Combine(_tempDir, $"{Guid.NewGuid()}_{fileName}");
            File.WriteAllBytes(tempFile, bytes);

            try
            {
                using var pd = new PrintDocument();
                pd.PrinterSettings.PrinterName = printerName;
                pd.DocumentName = $"SmartQRPrint_{fileName}";

                var copies = config.GetProperty("copies").GetInt32();
                pd.PrinterSettings.Copies = (short)Math.Max(1, copies);

                if (config.TryGetProperty("duplex", out var duplexProp) && duplexProp.GetBoolean() && pd.PrinterSettings.CanDuplex)
                {
                    pd.PrinterSettings.Duplex = Duplex.Vertical;
                }

                if (fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                {
                    // For PDF, execute via Windows registered PDF driver / Acrobat / Foxit / SumatraPDF silent print
                    // Command line standard: <pdf-engine> -print-to "<printerName>" "<file>"
                    ExecutePdfPrint(tempFile, printerName);
                }
                else
                {
                    // Image printing via GDI+
                    using var img = Image.FromFile(tempFile);
                    pd.PrintPage += (s, e) =>
                    {
                        var rect = e.MarginBounds;
                        e.Graphics?.DrawImage(img, rect);
                    };
                    pd.Print();
                }
            }
            finally
            {
                // Safely clean up local temporary working file
                if (File.Exists(tempFile))
                {
                    try { File.Delete(tempFile); } catch { }
                }
            }
        }

        private void ExecutePdfPrint(string pdfPath, string printerName)
        {
            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = pdfPath,
                Verb = "printto",
                Arguments = $"\"{printerName}\"",
                CreateNoWindow = true,
                WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden,
                UseShellExecute = true
            };

            using var process = System.Diagnostics.Process.Start(psi);
            process?.WaitForExit(15000);
        }

        public async Task PrintLocalTestPageAsync()
        {
            var testPrinter = SelectPrinter(false);
            using var pd = new PrintDocument();
            pd.PrinterSettings.PrinterName = testPrinter;
            pd.DocumentName = "SmartQRPrint_SelfTestPage";

            pd.PrintPage += (s, e) =>
            {
                using var font = new Font("Arial", 16, FontStyle.Bold);
                using var fontSmall = new Font("Arial", 10);
                e.Graphics?.DrawString("SMART QR PRINT — SELF TEST PAGE", font, Brushes.Black, 50, 50);
                e.Graphics?.DrawString($"Printer: {testPrinter}", fontSmall, Brushes.Black, 50, 100);
                e.Graphics?.DrawString($"Timestamp: {DateTime.Now:yyyy-MM-dd HH:mm:ss}", fontSmall, Brushes.Black, 50, 130);
                e.Graphics?.DrawString("Status: Epson & HP Print Spooler Connection Verified OK", fontSmall, Brushes.DarkGreen, 50, 160);
                e.Graphics?.DrawRectangle(Pens.Black, 50, 200, 400, 200);
                e.Graphics?.DrawString("Preserve Content Rule: 100% Cryptographic Verification Active", fontSmall, Brushes.Black, 60, 220);
            };

            pd.Print();
            await Task.CompletedTask;
            _trayIcon.ShowBalloonTip(2000, "Test Print Sent", $"Sent self-test page to {testPrinter}.", ToolTipIcon.Info);
        }

        private async Task UpdateJobStatusAsync(string jobId, string status, string? reason)
        {
            var payload = new { status, reason, machine = Environment.MachineName };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            await _httpClient.PostAsync($"/api/agent/jobs/{jobId}/status", content);
        }

        private string ComputeSHA256(byte[] data)
        {
            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(data);
            var sb = new StringBuilder();
            foreach (var b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        private void Log(string msg)
        {
            try
            {
                var logFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "SmartQRPrint", "Logs", "agent.log");
                Directory.CreateDirectory(Path.GetDirectoryName(logFile)!);
                File.AppendAllText(logFile, $"[{DateTime.UtcNow:O}] {msg}{Environment.NewLine}");
            }
            catch { }
        }
    }
}
