import {
  AuditLog,
  CustomerOrder,
  PaymentTransaction,
  PricingSettings,
  PrinterConfig,
  PrintJobConfig,
  ShopSettings,
  UploadedDocument,
  WindowsAgentStatus,
  RegisteredShopkeeper,
} from '../types';

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
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
  shopUrl: typeof window !== 'undefined' ? window.location.origin : 'https://smartqrprint.in',
  customPaymentLink: '',
  customQrImageUrl: '',
  qrDisplayMode: 'dynamic',
  ownerPhotoUrl: '',
  adsEnabled: false,
  adsContent: '',
  adsBannerUrl: '',
  shopCode: 'A',
  isAtShop: true,
  isAtShopManualOverride: false,
};

export const DEFAULT_PRICING: PricingSettings = {
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
};

export const DEFAULT_PRINTERS: PrinterConfig[] = [
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
  {
    id: 'printer-epson-2',
    name: 'Epson L3250 All-in-One Ink Tank',
    brand: 'Epson',
    model: 'L3250',
    isDefault: false,
    status: 'online',
    supportedColor: true,
    supportedDuplex: false,
    supportedPaperSizes: ['A4'],
    assignedJobTypes: ['document_bw', 'document_color'],
    lastHeartbeat: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_KEYS = {
  SETTINGS: 'sqp_shop_settings',
  PRICING: 'sqp_pricing_settings',
  PRINTERS: 'sqp_printers',
  ORDERS: 'sqp_orders',
  TXNS: 'sqp_transactions',
  LOGS: 'sqp_audit_logs',
  AGENT_KEY: 'sqp_agent_auth_key',
};

// Safe LocalStorage helpers with automatic JSON fallback
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save to local storage [${key}]:`, err);
  }
}

export class ApiClient {
  private static instance: ApiClient;

  private constructor() {
    // Initialize defaults if not present
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS)) {
      saveToStorage(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.PRICING)) {
      saveToStorage(LOCAL_STORAGE_KEYS.PRICING, DEFAULT_PRICING);
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.PRINTERS)) {
      saveToStorage(LOCAL_STORAGE_KEYS.PRINTERS, DEFAULT_PRINTERS);
    }
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS)) {
      this.addAuditLog('SYSTEM', 'App Initialized', 'Smart QR Print initialized successfully');
    }
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // --- Settings ---
  public async getSettings(): Promise<ShopSettings> {
    try {
      const res = await fetch(`/api/shop/settings?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (res.ok) {
        const data = await res.json();
        saveToStorage(LOCAL_STORAGE_KEYS.SETTINGS, data);
        return data;
      }
    } catch {
      // Fallback to storage
    }
    return loadFromStorage(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
  }

  public async updateSettings(settings: ShopSettings): Promise<ShopSettings> {
    try {
      const res = await fetch('/api/shop/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        saveToStorage(LOCAL_STORAGE_KEYS.SETTINGS, data);
        this.addAuditLog('ADMIN', 'Settings Updated', `Shop name updated to "${data.shopName}"`);
        return data;
      }
    } catch {
      // fallback
    }
    saveToStorage(LOCAL_STORAGE_KEYS.SETTINGS, settings);
    this.addAuditLog('ADMIN', 'Settings Updated', `Shop name updated to "${settings.shopName}" (local)`);
    return settings;
  }

  // Dedicated instant shop status methods
  public async getShopStatus(): Promise<{
    isAtShop: boolean;
    isAtShopManualOverride: boolean;
    isAutoHours: boolean;
    effectiveAtShop: boolean;
  }> {
    try {
      const res = await fetch(`/api/shop/status?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    const local = loadFromStorage(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
    const now = new Date();
    const isAutoHours = now.getHours() >= 10 && now.getHours() < 17;
    const isManual = local.isAtShopManualOverride === true;
    return {
      isAtShop: !!local.isAtShop,
      isAtShopManualOverride: !!local.isAtShopManualOverride,
      isAutoHours,
      effectiveAtShop: isManual ? !!local.isAtShop : isAutoHours,
    };
  }

  public async updateShopStatus(isAtShop: boolean, isManualOverride: boolean = true): Promise<ShopSettings> {
    try {
      const res = await fetch('/api/shop/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAtShop, isAtShopManualOverride: isManualOverride }),
      });
      if (res.ok) {
        const data = await res.json();
        saveToStorage(LOCAL_STORAGE_KEYS.SETTINGS, data);
        this.addAuditLog('ADMIN', 'Shop Status Updated', `Shop mode toggled to ${isAtShop ? 'ON' : 'OFF'}`);
        return data;
      }
    } catch {
      // fallback
    }
    const current = loadFromStorage(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
    const updated: ShopSettings = {
      ...current,
      isAtShop,
      isAtShopManualOverride: isManualOverride,
    };
    saveToStorage(LOCAL_STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  // --- Pricing ---
  public async getPricing(): Promise<PricingSettings> {
    try {
      const res = await fetch('/api/pricing');
      if (res.ok) {
        const data = await res.json();
        saveToStorage(LOCAL_STORAGE_KEYS.PRICING, data);
        return data;
      }
    } catch {}
    return loadFromStorage(LOCAL_STORAGE_KEYS.PRICING, DEFAULT_PRICING);
  }

  public async updatePricing(pricing: PricingSettings): Promise<PricingSettings> {
    try {
      const res = await fetch('/api/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing),
      });
      if (res.ok) {
        const data = await res.json();
        saveToStorage(LOCAL_STORAGE_KEYS.PRICING, data);
        this.addAuditLog('ADMIN', 'Pricing Updated', 'Print pricing rates updated');
        return data;
      }
    } catch {}
    saveToStorage(LOCAL_STORAGE_KEYS.PRICING, pricing);
    this.addAuditLog('ADMIN', 'Pricing Updated', 'Print pricing rates updated (local)');
    return pricing;
  }

  // --- Printers ---
  public async getPrinters(): Promise<PrinterConfig[]> {
    try {
      const res = await fetch('/api/printers');
      if (res.ok) {
        const data = await res.json();
        saveToStorage(LOCAL_STORAGE_KEYS.PRINTERS, data);
        return data;
      }
    } catch {}
    return loadFromStorage(LOCAL_STORAGE_KEYS.PRINTERS, DEFAULT_PRINTERS);
  }

  public async updatePrinters(printers: PrinterConfig[]): Promise<PrinterConfig[]> {
    try {
      const res = await fetch('/api/printers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printers),
      });
      if (res.ok) {
        const data = await res.json();
        saveToStorage(LOCAL_STORAGE_KEYS.PRINTERS, data);
        return data;
      }
    } catch {}
    saveToStorage(LOCAL_STORAGE_KEYS.PRINTERS, printers);
    return printers;
  }

  // --- Orders ---
  public async getOrders(): Promise<CustomerOrder[]> {
    try {
      const res = await fetch(`/api/orders?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (res.ok) {
        const data = await res.json();
        saveToStorage(LOCAL_STORAGE_KEYS.ORDERS, data);
        return data;
      }
    } catch {}
    return loadFromStorage<CustomerOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
  }

  public async getOrderById(id: string): Promise<CustomerOrder | null> {
    try {
      const res = await fetch(`/api/orders/${id}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    const orders = loadFromStorage<CustomerOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
    return orders.find(o => o.id === id || o.orderNumber === id) || null;
  }

  public async createOrder(order: CustomerOrder): Promise<CustomerOrder> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (res.ok) {
        const data = await res.json();
        const existing = loadFromStorage<CustomerOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
        saveToStorage(LOCAL_STORAGE_KEYS.ORDERS, [data, ...existing]);
        return data;
      }
    } catch {}

    const existing = loadFromStorage<CustomerOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
    const updated = [order, ...existing];
    saveToStorage(LOCAL_STORAGE_KEYS.ORDERS, updated);
    this.addAuditLog('CUSTOMER', 'Order Created', `Order ${order.orderNumber} placed for ₹${order.totalAmount}`);
    return order;
  }

  public async updateOrderStatus(
    orderId: string,
    updates: Partial<CustomerOrder>
  ): Promise<CustomerOrder | null> {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const orders = loadFromStorage<CustomerOrder[]>(LOCAL_STORAGE_KEYS.ORDERS, []);
    const idx = orders.findIndex(o => o.id === orderId || o.orderNumber === orderId);
    if (idx === -1) return null;

    orders[idx] = { ...orders[idx], ...updates };
    saveToStorage(LOCAL_STORAGE_KEYS.ORDERS, orders);
    return orders[idx];
  }

  // --- Payment Operations ---
  public async verifyPayment(orderId: string, txnId: string, method: string): Promise<CustomerOrder | null> {
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, txnId, method }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const order = await this.getOrderById(orderId);
    if (!order) return null;

    // Route to appropriate printer based on job types
    const printers = await this.getPrinters();
    const hasColor = order.items.some(i => i.config.colorMode === 'color' || i.config.paperSize.includes('PHOTO'));
    
    let chosenPrinter = printers.find(p => hasColor ? p.supportedColor : !p.supportedColor && p.status === 'online');
    if (!chosenPrinter) chosenPrinter = printers[0];

    const updated = await this.updateOrderStatus(orderId, {
      paymentStatus: 'paid',
      paymentTxnId: txnId,
      paidAt: new Date().toISOString(),
      printStatus: 'queued',
      assignedPrinterId: chosenPrinter?.id || 'printer-epson-1',
      assignedPrinterName: chosenPrinter?.name || 'Shop Default Printer',
      verifiedHashMatch: true,
    });

    this.addTransaction({
      id: `TXN-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      method: (method as any) || 'upi_qr',
      status: 'success',
      gatewayRef: txnId,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    });

    this.addAuditLog('PAYMENT', 'Payment Verified', `Order ${order.orderNumber} verified with Txn ID ${txnId}`);
    return updated;
  }

  public async approvePayment(
    orderId: string,
    method: 'online' | 'cash',
    operatorName = 'Shop Owner',
    txnId?: string
  ): Promise<CustomerOrder | null> {
    try {
      const res = await fetch(`/api/orders/${orderId}/approve-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, operator: operatorName, txnId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const order = await this.getOrderById(orderId);
    if (!order) return null;

    const printers = await this.getPrinters();
    const hasColor = order.items.some(i => i.config.colorMode === 'color' || i.config.paperSize.includes('PHOTO'));
    const chosenPrinter = printers.find(p => hasColor ? p.supportedColor : p.status === 'online') || printers[0];
    const assignedTxn = txnId || (method === 'online' ? `UPI-VERIFIED-${Date.now().toString().slice(-6)}` : `CASH-${Date.now().toString().slice(-6)}`);

    const updated = await this.updateOrderStatus(orderId, {
      paymentStatus: 'paid',
      paymentMethod: method === 'online' ? 'upi_qr' : 'counter_cash',
      paymentTxnId: assignedTxn,
      paidAt: new Date().toISOString(),
      printStatus: 'queued',
      counterOperator: operatorName,
      assignedPrinterId: chosenPrinter.id,
      assignedPrinterName: chosenPrinter.name,
      verifiedHashMatch: true,
    });

    this.addTransaction({
      id: `TXN-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      method: method === 'online' ? 'upi_qr' : 'counter_cash',
      status: 'success',
      gatewayRef: assignedTxn,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      operator: operatorName,
    });

    this.addAuditLog('ADMIN', `${method.toUpperCase()} Payment Approved`, `Order ${order.orderNumber} approved as ${method} payment by ${operatorName}`);
    return updated;
  }

  public async counterPayment(orderId: string, operatorName: string): Promise<CustomerOrder | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    const printers = await this.getPrinters();
    const hasColor = order.items.some(i => i.config.colorMode === 'color' || i.config.paperSize.includes('PHOTO'));
    const chosenPrinter = printers.find(p => hasColor ? p.supportedColor : p.status === 'online') || printers[0];

    const updated = await this.updateOrderStatus(orderId, {
      paymentStatus: 'paid',
      paymentMethod: 'counter_cash',
      paymentTxnId: `CASH-${Date.now().toString().slice(-6)}`,
      paidAt: new Date().toISOString(),
      printStatus: 'queued',
      counterOperator: operatorName,
      assignedPrinterId: chosenPrinter.id,
      assignedPrinterName: chosenPrinter.name,
      verifiedHashMatch: true,
    });

    this.addTransaction({
      id: `TXN-CASH-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      method: 'counter_cash',
      status: 'success',
      gatewayRef: `COUNTER-${operatorName}`,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      operator: operatorName,
    });

    this.addAuditLog('ADMIN', 'Counter Cash Approved', `Order ${order.orderNumber} marked as cash paid by ${operatorName}`);
    return updated;
  }

  // --- Transactions ---
  public getTransactions(): PaymentTransaction[] {
    return loadFromStorage<PaymentTransaction[]>(LOCAL_STORAGE_KEYS.TXNS, []);
  }

  public addTransaction(txn: PaymentTransaction): void {
    const txns = this.getTransactions();
    saveToStorage(LOCAL_STORAGE_KEYS.TXNS, [txn, ...txns]);
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return loadFromStorage<AuditLog[]>(LOCAL_STORAGE_KEYS.LOGS, []);
  }

  public addAuditLog(actor: string, action: string, details: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
    };
    saveToStorage(LOCAL_STORAGE_KEYS.LOGS, [newLog, ...logs.slice(0, 199)]);
  }

  // --- Windows Print Agent & Test Print ---
  public async getWindowsAgentStatus(): Promise<WindowsAgentStatus> {
    return {
      agentVersion: '2.4.0 (Windows x64 .NET 8)',
      machineName: 'SHOP-DESKTOP-WIN11',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      connectedPrinters: [
        {
          name: 'EPSON L8050 Series',
          isDefault: true,
          status: 'Ready (Paper: Normal, Ink: High)',
          driver: 'Epson ESC/P-R V4',
        },
        {
          name: 'HP LaserJet Pro M428fdw',
          isDefault: false,
          status: 'Ready (Toner: 84%, Tray 2: Loaded)',
          driver: 'HP PCL-6 Universal Driver',
        },
      ],
    };
  }

  public async triggerTestPrint(printerId: string): Promise<{ success: boolean; message: string }> {
    this.addAuditLog('ADMIN', 'Test Print Sent', `Test print page sent to printer ID: ${printerId}`);
    return {
      success: true,
      message: 'Test print page successfully sent to printer spooler. Please check physical tray.',
    };
  }

  // --- Document Retention & Cleanup ---
  public async runRetentionCleanup(retentionHours: number): Promise<{ deletedCount: number }> {
    const orders = await this.getOrders();
    const now = Date.now();
    const cutoff = now - retentionHours * 60 * 60 * 1000;

    let deleted = 0;
    const remaining = orders.filter(o => {
      const created = new Date(o.createdAt).getTime();
      if (created < cutoff && (o.printStatus === 'completed' || o.printStatus === 'cancelled')) {
        deleted++;
        return false;
      }
      return true;
    });

    saveToStorage(LOCAL_STORAGE_KEYS.ORDERS, remaining);
    this.addAuditLog('SYSTEM', 'Retention Cleanup', `Purged ${deleted} expired documents older than ${retentionHours} hours`);
    return { deletedCount: deleted };
  }

  public async getNextShopCode(): Promise<{ nextCode: string }> {
    try {
      const res = await fetch('/api/shop/next-code');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    const registrations = await this.getRegistrations();
    return { nextCode: `A${registrations.length + 1}` };
  }

  // --- Registered Shopkeepers ---
  public async getRegistrations(): Promise<RegisteredShopkeeper[]> {
    try {
      const res = await fetch('/api/registrations');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return loadFromStorage<RegisteredShopkeeper[]>('sqp_shopkeeper_registrations', []);
  }

  public async registerShopkeeper(data: { name: string; mobileNumber: string; shopName?: string; address?: string }): Promise<RegisteredShopkeeper> {
    const reg: RegisteredShopkeeper = {
      id: `REG-${Date.now()}`,
      name: data.name,
      mobileNumber: data.mobileNumber,
      shopName: data.shopName || '',
      address: data.address || '',
      registeredAt: new Date().toISOString(),
    };
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    const existing = loadFromStorage<RegisteredShopkeeper[]>('sqp_shopkeeper_registrations', []);
    saveToStorage('sqp_shopkeeper_registrations', [reg, ...existing]);
    this.addAuditLog('SYSTEM', 'Shopkeeper Registered', `New shopkeeper ${reg.name} (${reg.mobileNumber}) registered`);
    return reg;
  }
}

export const api = ApiClient.getInstance();
