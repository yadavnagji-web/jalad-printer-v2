/**
 * Client-side 100% fail-safe blob downloader for Windows Auto-Start setup files.
 * Works seamlessly in iframe preview, standalone browsers, and mobile devices.
 */
export async function downloadSetupFile(type: 'bat' | 'vbs' | 'widget', shopName: string = 'JALAD PRINTERS'): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const targetUrl = `${origin}/?mode=admin&popup=true`;

  let content = '';
  let filename = '';
  let mimeType = 'text/plain';

  if (type === 'bat') {
    filename = 'SmartQRPrint-ShopMonitor-Setup.bat';
    mimeType = 'application/x-bat';
    content = `@echo off
chcp 65001 >nul
title Smart QR Print - Dukandar 24x7 Desktop Auto-Start Setup
color 0A
cls
echo ======================================================================
echo    SMART QR PRINT - DUKANDAR 24x7 DESKTOP AUTO-POPUP INSTALLER
echo    Dukan: ${shopName}
echo ======================================================================
echo.
echo [1/4] Creating 24x7 Background Daemon Directory...
set "APP_DIR=%LOCALAPPDATA%\\SmartQRPrint"
if not exist "%APP_DIR%" mkdir "%APP_DIR%"

set "SERVER_URL=${origin}"
set "TARGET_POPUP_URL=${targetUrl}"
set "STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
set "DESKTOP_DIR=%USERPROFILE%\\Desktop"

echo [2/4] Generating 24x7 Smart Background Order Listener (PowerShell Daemon)...
(
  echo # Smart QR Print 24x7 Background Monitor Daemon
  echo $Server = "${origin}"
  echo $LastSeenFile = "$env:LOCALAPPDATA\\SmartQRPrint\\seen_orders.txt"
  echo if (-not (Test-Path $LastSeenFile^)^) { New-Item -ItemType File -Path $LastSeenFile -Force ^| Out-Null }
  echo.
  echo Write-Output "Smart QR Print 24x7 Daemon Started: $Server"
  echo.
  echo while ($true^) {
  echo     try {
  echo         $resp = Invoke-RestMethod -Uri "$Server/api/orders" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
  echo         if ($resp^) {
  echo             $seen = Get-Content $LastSeenFile -ErrorAction SilentlyContinue
  echo             $pending = @($resp^) ^| Where-Object {
  echo                 ($_.paymentStatus -eq 'counter_pending' -or $_.paymentStatus -eq 'pending'^) -and
  echo                 $_.printStatus -ne 'cancelled' -and
  echo                 $_.paymentStatus -ne 'paid' -and
  echo                 $seen -notcontains $_.id
  echo             }
  echo             if ($pending -and $pending.Count -gt 0^) {
  echo                 $ord = $pending[0]
  echo                 Add-Content -Path $LastSeenFile -Value $ord.id
  echo.
  echo                 # Loud chime sound
  echo                 [System.Console]::Beep(1200, 250^)
  echo                 [System.Console]::Beep(1600, 350^)
  echo.
  echo                 # Automatically Launch Desktop Satyapan Popup in Front!
  echo                 $popUrl = "$Server/?mode=admin&popup=true&orderId=" + $ord.id
  echo                 $edge1 = "C:\\Program Files (x86^)\\Microsoft\\Edge\\Application\\msedge.exe"
  echo                 $edge2 = "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
  echo                 $chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  echo                 $chrome86 = "C:\\Program Files (x86^)\\Google\\Chrome\\Application\\chrome.exe"
  echo.
  echo                 if (Test-Path $chrome^) {
  echo                     Start-Process $chrome -ArgumentList ('--app=' + $popUrl + ' --window-size=540,750 --window-position=450,120')
  echo                 } elseif (Test-Path $chrome86^) {
  echo                     Start-Process $chrome86 -ArgumentList ('--app=' + $popUrl + ' --window-size=540,750 --window-position=450,120')
  echo                 } elseif (Test-Path $edge1^) {
  echo                     Start-Process $edge1 -ArgumentList ('--app=' + $popUrl + ' --window-size=540,750 --window-position=450,120')
  echo                 } elseif (Test-Path $edge2^) {
  echo                     Start-Process $edge2 -ArgumentList ('--app=' + $popUrl + ' --window-size=540,750 --window-position=450,120')
  echo                 } else {
  echo                     Start-Process $popUrl
  echo                 }
  echo             }
  echo         }
  echo     } catch {}
  echo     Start-Sleep -Seconds 2
  echo }
) > "%APP_DIR%\\SmartQRPrint-Daemon.ps1"

echo [3/4] Registering Windows Auto-Start Service (shell:startup)...
(
  echo Set WshShell = CreateObject("WScript.Shell"^)
  echo Dim psCmd
  echo psCmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ ^& "%APP_DIR%\\SmartQRPrint-Daemon.ps1"""
  echo WshShell.Run psCmd, 0, False
) > "%STARTUP_DIR%\\SmartQRPrint-ShopMonitor.vbs"

copy /y "%STARTUP_DIR%\\SmartQRPrint-ShopMonitor.vbs" "%DESKTOP_DIR%\\SmartQRPrint-24x7-Monitor.vbs" >nul

echo [4/4] Starting 24x7 Background Daemon Now...
wscript.exe "%STARTUP_DIR%\\SmartQRPrint-ShopMonitor.vbs"

echo.
echo ======================================================================
echo  [SUCCESS] 24x7 DUKANDAR MONITOR SETUP COMPLETE!
echo  ----------------------------------------------------------------------
echo  1. Browser chahe band (closed) ho, monitor background me 24x7 chalega.
echo  2. Mobile app se user jaise hi Pay karega, popup screen par khul jayega!
echo  3. Satyapan karte hi printer se print nikalega aur popup band ho jayega.
echo  4. Agle naye order par hi fir se popup khulega.
echo  5. Computer restart hone par bhi yeh automatic background me start hoga.
echo ======================================================================
echo.
timeout /t 5
`;
  } else if (type === 'vbs') {
    filename = 'SmartQRPrint-ShopMonitor.vbs';
    mimeType = 'text/vbscript';
    content = `' Smart QR Print - Silent Background Auto-Start Script
Set WshShell = CreateObject("WScript.Shell")
Dim psCmd
psCmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command ""$Server='${origin}'; $LastSeenFile='$env:LOCALAPPDATA\\SmartQRPrint\\seen_orders.txt'; while($true){ try{ $resp = Invoke-RestMethod -Uri '$Server/api/orders' -TimeoutSec 3; $seen = Get-Content $LastSeenFile -ErrorAction SilentlyContinue; $pending = @($resp) | Where-Object { ($_.paymentStatus -eq 'counter_pending' -or $_.paymentStatus -eq 'pending') -and $_.printStatus -ne 'cancelled' -and $_.paymentStatus -ne 'paid' -and $seen -notcontains $_.id }; if($pending -and $pending.Count -gt 0){ $ord = $pending[0]; Add-Content -Path $LastSeenFile -Value $ord.id; [System.Console]::Beep(1400,300); Start-Process 'msedge.exe' -ArgumentList '--app=\""$Server/?mode=admin&popup=true&orderId=' + $ord.id + '\"" --window-size=540,750'; } }catch{} Start-Sleep -Seconds 2 }"""
WshShell.Run psCmd, 0, False
`;
  } else if (type === 'widget') {
    filename = 'SmartQRPrint-Desktop-Widget.html';
    mimeType = 'text/html';
    content = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>Smart QR Print - 24x7 Desktop Widget</title>
  <style>
    body { background: #0f172a; color: white; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #1e293b; padding: 24px; border-radius: 20px; border: 1px solid #334155; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h2 { margin: 0 0 10px; color: #38bdf8; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; }
    .status { display: inline-flex; align-items: center; gap: 8px; font-weight: bold; font-size: 12px; color: #4ade80; background: rgba(74,222,128,0.1); padding: 6px 12px; border-radius: 999px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">🟢 24x7 ऑटो-प्रिंट स्पूलर सक्रिय</div>
    <h2>🏪 Smart QR Print - Desktop Spooler</h2>
    <p>यह विजेट बैकग्राउंड में 24x7 ऑर्डर्स की जांच करता है। जब भी कोई ग्राहक भुगतान करेगा, पॉपअप तुरंत सामने आएगा।</p>
  </div>
  <script>location.href = "${origin}/?mode=admin&minimized=true";</script>
</body>
</html>`;
  }

  // Create Blob URL and trigger browser download
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    if (document.body.contains(anchor)) {
      document.body.removeChild(anchor);
    }
    URL.revokeObjectURL(blobUrl);
  }, 300);
}
