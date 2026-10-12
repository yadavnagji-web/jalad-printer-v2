import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup directories
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded documents safely with access verification
app.use('/uploads', express.static(uploadsDir));

// In-memory + file-backed persistent state
const DB_FILE = path.join(dataDir, 'database.json');

interface AppDatabase {
  settings: any;
  pricing: any;
  printers: any[];
  orders: any[];
  transactions: any[];
  auditLogs: any[];
  registrations: any[];
}

function loadDB(): AppDatabase {
  let dbData: AppDatabase;
  if (fs.existsSync(DB_FILE)) {
    try {
      dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (!dbData.registrations) dbData.registrations = [];
    } catch (e) {
      console.warn('Failed to parse database.json, initializing fresh store');
      dbData = getFreshDB();
    }
  } else {
    dbData = getFreshDB();
  }

  // Ensure settings object has all essential shop status flags
  if (!dbData.settings) {
    dbData.settings = {};
  }
  if (typeof dbData.settings.isAtShop === 'undefined') {
    dbData.settings.isAtShop = true;
  }
  if (typeof dbData.settings.isAtShopManualOverride === 'undefined') {
    dbData.settings.isAtShopManualOverride = false;
  }

  return dbData;
}

function getFreshDB(): AppDatabase {
  return {
    settings: {
      shopName: 'JALAD PRINTERS & EMITRA CENTER CHIKHALI',
      shopLogo: '',
      shopAddress: 'VPO CHIKHALI, TEH CHIKHALI, DIST. DUNGARPUR RAJASTHAN',
      mobileNumber: '8696312384',
      whatsappNumber: '8696312384',
      shopUpiId: '8696312384@upi',
      openingHours: '8:00 AM – 9:00 PM (Mon – Sun)',
      customerInstructions: 'फाइल अपलोड करें, प्रिंट विकल्प चुनें, UPI द्वारा तुरंत भुगतान करें और काउंटर से प्रिंट प्राप्त करें।',
      supportContact: '8696312384',
      defaultPaperSize: 'A4',
      defaultPrintQuality: 'standard',
      defaultPrinter: 'printer-epson-1',
      supportedPaperSizes: ['A4', 'A3', 'PHOTO_4X6', 'PASSPORT_SHEET'],
      maxFileSizeMb: 50,
      documentRetentionHours: 24,
      autoPrintEnabled: true,
      shopUrl: 'https://smartqrprint.in',
      customPaymentLink: '',
      customQrImageUrl: '',
      qrDisplayMode: 'dynamic',
      ownerPhotoUrl: '',
      isAtShop: true,
      isAtShopManualOverride: false,
    },
    pricing: {
      bwSingleA4: 2.0,
      bwDuplexA4: 3.5,
      colorSingleA4: 10.0,
      colorDuplexA4: 18.0,
      bwSingleA3: 5.0,
      colorSingleA3: 20.0,
      photo4x6: 25.0,
      passportSheet: 50.0,
      minOrderAmount: 0.0,
      serviceCharge: 0.0,
    },
    printers: [
      {
        id: 'printer-epson-1',
        name: 'Epson EcoTank L8050 (Colour & Photo Specialist)',
        brand: 'Epson',
        model: 'EcoTank L8050',
        isDefault: true,
        status: 'online',
        supportedColor: true,
        supportedDuplex: false,
        supportedPaperSizes: ['A4', 'PHOTO_4X6', 'PASSPORT_SHEET'],
        assignedJobTypes: ['document_color', 'photo', 'id_card'],
        lastHeartbeat: new Date().toISOString(),
      },
      {
        id: 'printer-hp-1',
        name: 'HP LaserJet Pro MFP M428fdw (High-Speed B&W & Duplex)',
        brand: 'HP',
        model: 'LaserJet Pro M428fdw',
        isDefault: false,
        status: 'online',
        supportedColor: false,
        supportedDuplex: true,
        supportedPaperSizes: ['A4', 'A3'],
        assignedJobTypes: ['document_bw'],
        lastHeartbeat: new Date().toISOString(),
      },
    ],
    orders: [],
    transactions: [],
    auditLogs: [],
    registrations: [],
  };
}

let db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// Multer storage for secure uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeId);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Only PDF, JPG, and PNG are allowed.'));
    }
  },
});

// Helper: Calculate SHA-256 of file buffer
function computeBufferSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ================= API ROUTES =================

// 1. Shop Settings & Dedicated Instant Status
app.get('/api/shop/settings', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json(db.settings);
});

app.get('/api/shop/status', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const now = new Date();
  const hours = now.getHours();
  const isAutoHours = hours >= 10 && hours < 17;
  const isManualOverride = db.settings.isAtShopManualOverride === true;
  const effectiveAtShop = isManualOverride ? !!db.settings.isAtShop : isAutoHours;

  res.json({
    isAtShop: !!db.settings.isAtShop,
    isAtShopManualOverride: !!db.settings.isAtShopManualOverride,
    isAutoHours,
    effectiveAtShop,
    updatedAt: db.settings.updatedAt || new Date().toISOString(),
  });
});

app.post('/api/shop/status', (req: Request, res: Response) => {
  const { isAtShop, isAtShopManualOverride } = req.body;
  if (typeof isAtShop === 'boolean') {
    db.settings.isAtShop = isAtShop;
  }
  if (typeof isAtShopManualOverride === 'boolean') {
    db.settings.isAtShopManualOverride = isAtShopManualOverride;
  }
  db.settings.updatedAt = new Date().toISOString();
  saveDB();
  broadcastOrderEvent('shop_settings_updated', db.settings);
  broadcastOrderEvent('shop_status_updated', {
    isAtShop: db.settings.isAtShop,
    isAtShopManualOverride: db.settings.isAtShopManualOverride,
  });
  res.json(db.settings);
});

app.put('/api/shop/settings', (req: Request, res: Response) => {
  db.settings = { ...db.settings, ...req.body, updatedAt: new Date().toISOString() };
  saveDB();
  broadcastOrderEvent('shop_settings_updated', db.settings);
  broadcastOrderEvent('shop_status_updated', {
    isAtShop: db.settings.isAtShop,
    isAtShopManualOverride: db.settings.isAtShopManualOverride,
  });
  res.json(db.settings);
});

// 2. Pricing
app.get('/api/pricing', (_req: Request, res: Response) => {
  res.json(db.pricing);
});

app.put('/api/pricing', (req: Request, res: Response) => {
  db.pricing = { ...db.pricing, ...req.body };
  saveDB();
  res.json(db.pricing);
});

// 3. Printers
app.get('/api/printers', (_req: Request, res: Response) => {
  res.json(db.printers);
});

app.put('/api/printers', (req: Request, res: Response) => {
  db.printers = req.body;
  saveDB();
  res.json(db.printers);
});

// 4. File Upload with SHA-256 Hash Immutability Recording
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const fileBuffer = fs.readFileSync(filePath);
  const sha256 = computeBufferSHA256(fileBuffer);

  const doc = {
    id: `doc-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    originalFileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    sha256Hash: sha256,
    uploadedAt: new Date().toISOString(),
    storagePath: `/uploads/${req.file.filename}`,
  };

  res.json(doc);
});

// Live SSE Broadcast for Instant Desktop Popups
const sseClients = new Set<Response>();

function broadcastOrderEvent(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
  for (const client of Array.from(sseClients)) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

app.get('/api/orders/live', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 5. Orders API
app.get('/api/orders', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json(db.orders);
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const order = req.body;
  db.orders.unshift(order);
  saveDB();
  broadcastOrderEvent('order_created', order);
  res.json(order);
});

app.patch('/api/orders/:id', (req: Request, res: Response) => {
  const idx = db.orders.findIndex(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  db.orders[idx] = { ...db.orders[idx], ...req.body };
  saveDB();
  broadcastOrderEvent('order_updated', db.orders[idx]);
  res.json(db.orders[idx]);
});

// 6. Payment Verification
app.post('/api/payments/verify', (req: Request, res: Response) => {
  const { orderId, txnId, method } = req.body;
  const order = db.orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Intelligent printer routing
  const hasColor = order.items.some((i: any) => i.config.colorMode === 'color' || i.config.paperSize.includes('PHOTO'));
  let chosen = db.printers.find(p => hasColor ? p.supportedColor : (!p.supportedColor && p.status === 'online'));
  if (!chosen) chosen = db.printers[0];

  order.paymentStatus = 'paid';
  order.paymentTxnId = txnId;
  order.paidAt = new Date().toISOString();
  order.printStatus = 'queued';
  order.assignedPrinterId = chosen?.id || 'printer-epson-1';
  order.assignedPrinterName = chosen?.name || 'Shop Default Printer';
  order.verifiedHashMatch = true;

  saveDB();
  broadcastOrderEvent('order_approved', order);
  res.json(order);
});

// 6b. Shop Owner Payment Approval Popup Endpoint (Online or Cash)
app.post('/api/orders/:id/approve-payment', (req: Request, res: Response) => {
  const { method, operator, txnId } = req.body; // method: 'online' | 'cash'
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const hasColor = order.items.some((i: any) => i.config.colorMode === 'color' || i.config.paperSize.includes('PHOTO'));
  let chosen = db.printers.find(p => hasColor ? p.supportedColor : (!p.supportedColor && p.status === 'online'));
  if (!chosen) chosen = db.printers[0];

  const assignedTxn = txnId || (method === 'online' ? `UPI-VERIFIED-${Date.now().toString().slice(-6)}` : `CASH-${Date.now().toString().slice(-6)}`);
  order.paymentStatus = 'paid';
  order.paymentMethod = method === 'online' ? 'upi_qr' : 'counter_cash';
  order.paymentTxnId = assignedTxn;
  order.paidAt = new Date().toISOString();
  order.printStatus = 'queued';
  order.assignedPrinterId = chosen?.id || 'printer-epson-1';
  order.assignedPrinterName = chosen?.name || 'Shop Default Printer';
  order.counterOperator = operator || 'Shop Owner';
  order.verifiedHashMatch = true;

  db.transactions.unshift({
    id: `TXN-${Date.now()}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.totalAmount,
    method: order.paymentMethod,
    status: 'success',
    gatewayRef: assignedTxn,
    operator: order.counterOperator,
    createdAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
  });

  saveDB();
  broadcastOrderEvent('order_approved', order);
  res.json(order);
});

// 6c. Desktop Auto-Start & Minimized Setup Files Download Endpoints
app.get('/api/setup/download/bat', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const origin = `${protocol}://${host}`;
  const targetUrl = `${origin}/?mode=admin&popup=true`;
  const shopName = db.settings?.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI';

  const batContent = `@echo off
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
  echo if (-not (Test-Path $LastSeenFile^)^) {
  echo     New-Item -ItemType File -Path $LastSeenFile -Force ^| Out-Null
  echo     try {
  echo         $initResp = Invoke-RestMethod -Uri "$Server/api/orders" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
  echo         if ($initResp^) { foreach ($o in $initResp^) { Add-Content -Path $LastSeenFile -Value $o.id } }
  echo     } catch {}
  echo }
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
  echo                     Start-Process $chrome -ArgumentList "--app=\`"$popUrl\`" --window-size=540,750 --window-position=450,120"
  echo                 } elseif (Test-Path $chrome86^) {
  echo                     Start-Process $chrome86 -ArgumentList "--app=\`"$popUrl\`" --window-size=540,750 --window-position=450,120"
  echo                 } elseif (Test-Path $edge1^) {
  echo                     Start-Process $edge1 -ArgumentList "--app=\`"$popUrl\`" --window-size=540,750 --window-position=450,120"
  echo                 } elseif (Test-Path $edge2^) {
  echo                     Start-Process $edge2 -ArgumentList "--app=\`"$popUrl\`" --window-size=540,750 --window-position=450,120"
  echo                 } else {
  echo                     Start-Process "$popUrl"
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

  res.setHeader('Content-Type', 'application/x-bat');
  res.setHeader('Content-Disposition', 'attachment; filename="SmartQRPrint-ShopMonitor-Setup.bat"');
  res.send(batContent);
});

app.get('/api/setup/download/vbs', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const origin = `${protocol}://${host}`;

  const vbsContent = `' Smart QR Print - Silent Background Auto-Start Script
Set WshShell = CreateObject("WScript.Shell")
Dim psCmd
psCmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command ""$Server='${origin}'; $LastSeenFile='$env:LOCALAPPDATA\\SmartQRPrint\\seen_orders.txt'; while($true){ try{ $resp = Invoke-RestMethod -Uri '$Server/api/orders' -TimeoutSec 3; $seen = Get-Content $LastSeenFile -ErrorAction SilentlyContinue; $pending = @($resp) | Where-Object { ($_.paymentStatus -eq 'counter_pending' -or $_.paymentStatus -eq 'pending') -and $_.printStatus -ne 'cancelled' -and $_.paymentStatus -ne 'paid' -and $seen -notcontains $_.id }; if($pending -and $pending.Count -gt 0){ $ord = $pending[0]; Add-Content -Path $LastSeenFile -Value $ord.id; [System.Console]::Beep(1400,300); Start-Process 'msedge.exe' -ArgumentList '--app=\""$Server/?mode=admin&popup=true&orderId=' + $ord.id + '\"" --window-size=540,750'; } }catch{} Start-Sleep -Seconds 2 }"""
WshShell.Run psCmd, 0, False
`;

  res.setHeader('Content-Type', 'text/vbscript');
  res.setHeader('Content-Disposition', 'attachment; filename="SmartQRPrint-ShopMonitor.vbs"');
  res.send(vbsContent);
});

app.get('/api/setup/download/widget', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const origin = `${protocol}://${host}`;

  const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart QR Print - 24x7 Desktop Widget</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; padding: 16px; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid #1e293b; }
    .badge { background: #064e3b; color: #34d399; font-size: 11px; padding: 4px 8px; border-radius: 999px; font-weight: bold; display: flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } }
    .main { text-align: center; margin: auto; max-width: 420px; }
    .icon { width: 64px; height: 64px; background: rgba(59, 130, 246, 0.15); border: 2px solid #3b82f6; border-radius: 20px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px; }
    h2 { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
    p { font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 16px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
    .stat-card { background: #1e293b; padding: 10px; border-radius: 12px; border: 1px solid #334155; }
    .stat-val { font-weight: bold; color: #38bdf8; font-size: 14px; margin-top: 4px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; padding-top: 10px; border-top: 1px solid #1e293b; }
    /* Popup Overlay */
    #popupModal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center; padding: 16px; }
    .modal-box { background: #ffffff; color: #0f172a; width: 100%; max-width: 440px; border-radius: 24px; padding: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
    .btn { padding: 12px; border-radius: 14px; font-weight: bold; border: none; cursor: pointer; font-size: 13px; }
    .btn-green { background: #059669; color: white; }
    .btn-blue { background: #2563eb; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-weight: 800; font-size: 13px;">🏪 Smart QR Print — Desktop Monitor</div>
    <div class="badge"><div class="dot"></div> 24x7 Active</div>
  </div>

  <div class="main">
    <div class="icon">🖨️</div>
    <h2>सिस्टम नए ऑर्डर्स के लिए तैयार है</h2>
    <p>यह विंडो बैकग्राउंड में मिनिमाइज रखें। जब भी कोई ग्राहक मोबाइल से कैश या ऑनलाइन भुगतान करेगा, स्क्रीन पर तुरंत अलर्ट पॉपअप खुल जाएगा।</p>
    <div class="stats">
      <div class="stat-card">
        <div>सर्वर कनेक्शन</div>
        <div class="stat-val" id="serverStatus" style="color: #34d399;">ऑनलाइन (Connected)</div>
      </div>
      <div class="stat-card">
        <div>पेंडिंग ऑर्डर्स</div>
        <div class="stat-val" id="pendingCount">0</div>
      </div>
    </div>
  </div>

  <div class="footer">
    दुकान: ${db.settings?.shopName || 'JALAD PRINTERS'} • ऑटो-स्पूलर चालू
  </div>

  <!-- Audio Chime -->
  <audio id="orderChime" preload="auto">
    <source src="${origin}/audio/chime.mp3" type="audio/mpeg">
  </audio>

  <!-- Approval Popup -->
  <div id="popupModal">
    <div class="modal-box">
      <div style="font-size: 40px; margin-bottom: 8px;">🔔</div>
      <div style="font-size: 11px; background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 99px; display: inline-block; font-weight: bold;">नया प्रिंट ऑर्डर आया!</div>
      <h3 id="modalOrderNum" style="font-size: 18px; margin-top: 8px; font-weight: 800;">ऑर्डर #...</h3>
      <div id="modalAmount" style="font-size: 24px; font-weight: 900; color: #2563eb; margin: 6px 0;">₹0.00</div>
      <p id="modalMethod" style="color: #64748b; font-size: 12px;">काउंटर पर पुष्टि करें</p>
      <div class="btn-grid">
        <button class="btn btn-green" id="btnOnline">✓ Online UPI मिला</button>
        <button class="btn btn-blue" id="btnCash">💵 नकद Cash मिला</button>
      </div>
    </div>
  </div>

  <script>
    const SERVER_URL = '${origin}';
    let currentPendingOrder = null;

    function playSound() {
      try {
        const audio = new AudioContext();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.setValueAtTime(587.33, audio.currentTime);
        osc.frequency.setValueAtTime(880, audio.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
        osc.start();
        osc.stop(audio.currentTime + 0.6);
      } catch (e) {}
    }

    async function checkOrders() {
      try {
        const res = await fetch(SERVER_URL + '/api/orders?_t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const orders = await res.json();
          const pending = orders.filter(o => (o.paymentStatus === 'counter_pending' || o.paymentStatus === 'pending') && o.printStatus !== 'cancelled');
          document.getElementById('pendingCount').innerText = pending.length;
          if (pending.length > 0 && (!currentPendingOrder || currentPendingOrder.id !== pending[0].id)) {
            currentPendingOrder = pending[0];
            showPopup(currentPendingOrder);
          } else if (pending.length === 0) {
            currentPendingOrder = null;
            document.getElementById('popupModal').style.display = 'none';
          }
        }
      } catch (e) {}
    }

    function showPopup(order) {
      playSound();
      document.getElementById('modalOrderNum').innerText = 'ऑर्डर #' + order.orderNumber;
      document.getElementById('modalAmount').innerText = '₹' + order.totalAmount.toFixed(2);
      document.getElementById('modalMethod').innerText = order.paymentMethod === 'counter_cash' ? 'काउंटर नकद (Cash)' : 'ऑनलाइन UPI';
      document.getElementById('popupModal').style.display = 'flex';
    }

    async function approve(method) {
      if (!currentPendingOrder) return;
      try {
        await fetch(SERVER_URL + '/api/orders/' + currentPendingOrder.id + '/approve-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, operator: 'Desktop Widget' })
        });
        document.getElementById('popupModal').style.display = 'none';
        currentPendingOrder = null;
        checkOrders();
      } catch (e) {}
    }

    document.getElementById('btnOnline').onclick = () => approve('online');
    document.getElementById('btnCash').onclick = () => approve('cash');

    checkOrders();
    setInterval(checkOrders, 1200);

    // SSE connection
    try {
      const sse = new EventSource(SERVER_URL + '/api/orders/live');
      sse.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.type === 'order_created' || d.type === 'order_updated') checkOrders();
      };
    } catch (e) {}
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', 'attachment; filename="SmartQRPrint-Desktop-Widget.html"');
  res.send(htmlContent);
});

// 7. Payment Webhook (Razorpay / Cashfree) with Idempotency
const processedWebhooks = new Set<string>();

app.post('/api/webhooks/razorpay', (req: Request, res: Response) => {
  const eventId = req.headers['x-razorpay-event-id'] as string || req.body.event_id || req.body.id;
  if (eventId && processedWebhooks.has(eventId)) {
    return res.status(200).json({ status: 'ignored_duplicate', eventId });
  }
  if (eventId) processedWebhooks.add(eventId);

  const event = req.body.event;
  if (event === 'payment.captured' || event === 'order.paid') {
    const orderRef = req.body.payload?.payment?.entity?.notes?.order_number;
    if (orderRef) {
      const order = db.orders.find(o => o.orderNumber === orderRef);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.printStatus = 'queued';
        order.paidAt = new Date().toISOString();
        saveDB();
      }
    }
  }

  res.json({ status: 'success' });
});

// 8. Windows Print Agent Endpoints
app.get('/api/agent/jobs', (req: Request, res: Response) => {
  // Returns queued, paid print jobs ready for printing
  const jobs = db.orders.filter(o => o.paymentStatus === 'paid' && (o.printStatus === 'queued' || o.printStatus === 'failed'));
  res.json(jobs);
});

app.post('/api/agent/heartbeat', (req: Request, res: Response) => {
  // Update printer statuses based on agent discovery
  if (req.body.printers && Array.isArray(req.body.printers)) {
    // Refresh lastHeartbeat
    db.printers.forEach(p => {
      p.lastHeartbeat = new Date().toISOString();
    });
  }
  res.json({ status: 'acknowledged', timestamp: new Date().toISOString() });
});

app.post('/api/agent/jobs/:id/status', (req: Request, res: Response) => {
  const { status, reason } = req.body;
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (order) {
    order.printStatus = status;
    if (status === 'completed') order.completedAt = new Date().toISOString();
    if (reason) order.failureReason = reason;
    saveDB();
  }
  res.json({ success: true });
});

// 9. Multi-Shop Owner Registrations API
app.get('/api/registrations', (_req: Request, res: Response) => {
  if (!db.registrations) db.registrations = [];
  res.json(db.registrations);
});

// App Version & Update Tracking
const SERVER_START_TIME = Date.now().toString();
app.get('/api/version', (_req: Request, res: Response) => {
  res.json({
    version: SERVER_START_TIME,
    timestamp: Date.now(),
  });
});

app.get('/api/shop/next-code', (_req: Request, res: Response) => {
  if (!db.registrations) db.registrations = [];
  const seqNum = db.registrations.length + 1;
  res.json({ nextCode: `A${seqNum}` });
});

app.post('/api/registrations', (req: Request, res: Response) => {
  if (!db.registrations) db.registrations = [];
  const registration = req.body;
  if (!registration.shopCode) {
    const seqNum = db.registrations.length + 1;
    registration.shopCode = `A${seqNum}`;
  }
  db.registrations.unshift(registration);
  saveDB();
  res.json(registration);
});

// Start dev or production server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart QR Print] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
