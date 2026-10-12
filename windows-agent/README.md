# Smart QR Print — Windows Print Agent (Epson & HP)

Official desktop background agent for the Smart QR Print shop automation system.

## Overview
The Windows Print Agent bridges your cloud or locally hosted Smart QR Print web application to your shop's physical USB and network printers (Epson EcoTank and HP LaserJet).

### Key Features
- **Auto-Discovery**: Detects all installed Windows printers and reports real status.
- **Intelligent Hardware Routing**:
  - Color & Photo jobs are sent to your **Epson** printer (e.g. EcoTank L8050 / L3250).
  - High-speed B&W and Duplex jobs are sent to your **HP LaserJet** (e.g. Pro M428fdw / 1020).
- **Payment Guard**: Jobs are printed **strictly after verified server-side UPI confirmation**.
- **SHA-256 Immutability Check**: Recalculates the source file's SHA-256 hash before sending to the print spooler. If the file has changed, printing is immediately aborted.
- **System Tray Operation**: Minimizes cleanly to the Windows system tray with balloon notifications and a status menu.
- **Zero Document Leakage**: Temporary working copies are purged immediately upon spool completion.

---

## Quick Setup (Shop PC)

### 1. Prerequisites
- Windows 10 or Windows 11 (64-bit)
- [.NET 8.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/8.0)
- Official Epson and HP drivers installed via manufacturer installer
- PDF reader installed (SumatraPDF, Adobe Acrobat, or Windows PDF printer)

### 2. Configure `appsettings.json`
Edit `appsettings.json` in the agent folder:
```json
{
  "ServerUrl": "https://your-smart-qr-print-app.run.app",
  "AgentApiKey": "sqp_agent_secret_key_prod",
  "PollIntervalSeconds": 3,
  "Printers": {
    "ColorAndPhotoPrinter": "EPSON L8050 Series",
    "BwAndDuplexPrinter": "HP LaserJet Pro MFP M428fdw"
  }
}
```

### 3. Build & Run
```powershell
# In PowerShell or Command Prompt
dotnet publish -c Release -r win-x64 --self-contained false -o ./publish
cd publish
.\SmartQRPrintAgent.exe
```

### 4. Enable Auto-Start on Windows Boot
1. Press `Win + R`, type `shell:startup` and press Enter.
2. Create a shortcut to `SmartQRPrintAgent.exe` inside this folder.
3. The agent will now run silently every time the shop computer turns on.
