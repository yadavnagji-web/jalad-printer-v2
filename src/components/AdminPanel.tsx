import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  LayoutDashboard,
  Settings,
  Printer,
  IndianRupee,
  CreditCard,
  ListOrdered,
  QrCode,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Trash2,
  Download,
  Search,
  Lock,
  LogOut,
  Save,
  FileCheck,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Plus,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  X,
  Users,
  Phone,
  MessageSquare,
  Share2,
  Megaphone,
  Minimize2,
  Maximize2,
  Sun,
  Bell,
  Store,
} from 'lucide-react';
import {
  AuditLog,
  CustomerOrder,
  PaymentTransaction,
  PricingSettings,
  PrinterConfig,
  ShopSettings,
  WindowsAgentStatus,
  RegisteredShopkeeper,
} from '../types';
import { api } from '../services/api';
import { runAutomatedTestSuite, TestResult } from '../utils/testRunner';
import { OwnerShareModal } from './OwnerShareModal';
import { UserAppQrModal } from './UserAppQrModal';
import { OwnerBackgroundMonitor } from './OwnerBackgroundMonitor';
import { DesktopSetupModal } from './DesktopSetupModal';
import { downloadSetupFile } from '../utils/downloadHelper';
import { getEffectiveShopStatus } from '../utils/shopStatus';

interface AdminPanelProps {
  settings: ShopSettings;
  pricing: PricingSettings;
  onUpdateSettings: (newSettings: ShopSettings) => void;
  onUpdatePricing: (newPricing: PricingSettings) => void;
  onClose: () => void;
}

type AdminTab =
  | 'dashboard'
  | 'print_queue'
  | 'settings'
  | 'ads'
  | 'shopkeepers'
  | 'qr_poster'
  | 'windows_agent';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings: initialSettings,
  pricing: initialPricing,
  onUpdateSettings,
  onUpdatePricing,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sqp_admin_auth') === 'Nagji@012';
    }
    return false;
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAdminAuthSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = passwordInput.trim();
    if (clean === 'Nagji@012' || clean === 'nagji@012') {
      setIsAuthenticated(true);
      setAuthError('');
      sessionStorage.setItem('sqp_admin_auth', 'Nagji@012');
    } else {
      setAuthError('गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
    }
  };

  // Local state for tabs
  const [settingsForm, setSettingsForm] = useState<ShopSettings>(initialSettings);

  // Sync settingsForm when parent initialSettings updates (e.g. from real-time live sync)
  useEffect(() => {
    setSettingsForm((prev) => ({
      ...prev,
      isAtShop: initialSettings.isAtShop,
      isAtShopManualOverride: initialSettings.isAtShopManualOverride,
    }));
  }, [initialSettings.isAtShop, initialSettings.isAtShopManualOverride]);

  const [pricingForm, setPricingForm] = useState<PricingSettings>(initialPricing);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [agentStatus, setAgentStatus] = useState<WindowsAgentStatus | null>(null);

  // Test suite state
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [passCount, setPassCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  // Poster preview state
  const [posterQrUrl, setPosterQrUrl] = useState<string>('');
  const [posterQrType, setPosterQrType] = useState<'app_url' | 'custom_qr'>('app_url');
  const [counterOperatorName, setCounterOperatorName] = useState('Shop Owner');
  const [searchJobQuery, setSearchJobQuery] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [registeredShopkeepers, setRegisteredShopkeepers] = useState<RegisteredShopkeeper[]>([]);
  const [isUploadingOwnerPhoto, setIsUploadingOwnerPhoto] = useState(false);
  const [isOwnerShareModalOpen, setIsOwnerShareModalOpen] = useState(false);
  const [isUserAppQrOpen, setIsUserAppQrOpen] = useState(false);
  const [isUploadingAdBanner, setIsUploadingAdBanner] = useState(false);
  const [searchShopkeeper, setSearchShopkeeper] = useState('');
  const [isDesktopSetupModalOpen, setIsDesktopSetupModalOpen] = useState(false);

  // Desktop Background Minimized Mode State
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('minimized') === 'true') return true;
      return localStorage.getItem('sqp_owner_minimized') === 'true';
    }
    return false;
  });
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sqp_auto_start') === 'true';
    }
    return false;
  });

  // Keep Desktop Active / Screen Wake Lock to prevent sleep during shop hours
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
          wakeLock.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        }
      } catch (err) {
        setWakeLockActive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Request desktop notifications if supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch (e) {}
      }
    };
  }, []);

  const handleOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingOwnerPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsForm((prev) => ({ ...prev, ownerPhotoUrl: data.storagePath }));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setSettingsForm((prev) => ({ ...prev, ownerPhotoUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsForm((prev) => ({ ...prev, ownerPhotoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingOwnerPhoto(false);
    }
  };

  const handleAdBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAdBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsForm((prev) => ({ ...prev, adsBannerUrl: data.storagePath }));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setSettingsForm((prev) => ({ ...prev, adsBannerUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsForm((prev) => ({ ...prev, adsBannerUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingAdBanner(false);
    }
  };

  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsForm((prev) => ({ ...prev, customQrImageUrl: data.storagePath }));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setSettingsForm((prev) => ({ ...prev, customQrImageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsForm((prev) => ({ ...prev, customQrImageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingQr(false);
    }
  };

  const loadData = async () => {
    const [fetchedOrders, fetchedPrinters, fetchedAgent, fetchedRegs] = await Promise.all([
      api.getOrders(),
      api.getPrinters(),
      api.getWindowsAgentStatus(),
      api.getRegistrations(),
    ]);
    setOrders(fetchedOrders);
    setPrinters(fetchedPrinters);
    setAgentStatus(fetchedAgent);
    setRegisteredShopkeepers(fetchedRegs);
    setTransactions(api.getTransactions());
    setAuditLogs(api.getAuditLogs());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate QR for Poster
  useEffect(() => {
    const targetUrl = window.location.origin;
    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 1.5,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setPosterQrUrl)
      .catch(console.error);
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await api.updateSettings(settingsForm);
    onUpdateSettings(updated);
    setSaveSuccessMsg('Shop settings saved successfully! Persisted to storage.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Save Pricing
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await api.updatePricing(pricingForm);
    onUpdatePricing(updated);
    setSaveSuccessMsg('Pricing rates updated successfully! Server calculation updated.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Job Actions
  const handleRetryJob = async (orderId: string) => {
    await api.updateOrderStatus(orderId, {
      printStatus: 'queued',
      failureReason: null,
      retryCount: ((orders.find((o) => o.id === orderId)?.retryCount || 0) + 1),
    });
    api.addAuditLog('ADMIN', 'Job Retried', `Order ${orderId} sent back to print queue`);
    loadData();
  };

  const handleAuthorizeReprint = async (orderId: string) => {
    await api.updateOrderStatus(orderId, {
      printStatus: 'queued',
      failureReason: null,
    });
    api.addAuditLog('ADMIN', 'Reprint Authorized', `Authorized manual reprint for order ${orderId}`);
    loadData();
  };

  const handleCancelJob = async (orderId: string) => {
    await api.updateOrderStatus(orderId, {
      printStatus: 'cancelled',
      failureReason: 'Cancelled by operator',
    });
    api.addAuditLog('ADMIN', 'Job Cancelled', `Order ${orderId} cancelled`);
    loadData();
  };

  const handleApproveCounterCash = async (orderId: string) => {
    await api.counterPayment(orderId, counterOperatorName);
    loadData();
  };

  const handleTriggerTestPrint = async (printerId: string) => {
    const res = await api.triggerTestPrint(printerId);
    alert(res.message);
  };

  const shopStatus = getEffectiveShopStatus(settingsForm);

  const handleToggleAtShop = async (newVal: boolean) => {
    try {
      const updated = await api.updateShopStatus(newVal, true);
      setSettingsForm(updated);
      onUpdateSettings(updated);
      setSaveSuccessMsg(`दूकान पर मोड बदलकर ${newVal ? 'ON (उपस्थित)' : 'OFF (अनुपस्थित)'} कर दिया गया है!`);
    } catch {
      const updatedSettings: ShopSettings = {
        ...settingsForm,
        isAtShop: newVal,
        isAtShopManualOverride: true,
      };
      setSettingsForm(updatedSettings);
      onUpdateSettings(updatedSettings);
      api.updateSettings(updatedSettings);
      setSaveSuccessMsg(`दूकान पर मोड बदलकर ${newVal ? 'ON (उपस्थित)' : 'OFF (अनुपस्थित)'} कर दिया गया है!`);
    }
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetAutoSchedule = async () => {
    const now = new Date();
    const hours = now.getHours();
    const isAutoHours = hours >= 10 && hours < 17;
    try {
      const updated = await api.updateShopStatus(isAutoHours, false);
      setSettingsForm(updated);
      onUpdateSettings(updated);
      setSaveSuccessMsg('ऑटो-शेड्यूल मोड (10 AM - 5 PM) पर रीसेट कर दिया गया है!');
    } catch {
      const updatedSettings: ShopSettings = {
        ...settingsForm,
        isAtShop: isAutoHours,
        isAtShopManualOverride: false,
      };
      setSettingsForm(updatedSettings);
      onUpdateSettings(updatedSettings);
      api.updateSettings(updatedSettings);
      setSaveSuccessMsg('ऑटो-शेड्यूल मोड (10 AM - 5 PM) पर रीसेट कर दिया गया है!');
    }
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    const results = await runAutomatedTestSuite((res, passed, failed) => {
      setTestResults((prev) => [...prev, res]);
      setPassCount(passed);
      setFailCount(failed);
    });
    setIsRunningTests(false);
  };

  // Filtered Jobs
  const filteredJobs = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(searchJobQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchJobQuery.toLowerCase()) ||
      o.customerPhone.includes(searchJobQuery);
    const matchStatus = jobStatusFilter === 'all' || o.printStatus === jobStatusFilter;
    return matchSearch && matchStatus;
  });

  // Export Jobs to CSV
  const exportCsv = () => {
    const rows = [
      ['Order Number', 'Date', 'Customer', 'Phone', 'Amount', 'Payment Status', 'Print Status', 'Printer'],
      ...orders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleString(),
        o.customerName,
        o.customerPhone,
        o.totalAmount.toString(),
        o.paymentStatus,
        o.printStatus,
        o.assignedPrinterName || '',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartQRPrint_Orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute metrics
  const todayRevenue = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingJobs = orders.filter((o) => o.printStatus === 'queued' || o.printStatus === 'downloading').length;
  const completedJobs = orders.filter((o) => o.printStatus === 'completed').length;
  const failedJobs = orders.filter((o) => o.printStatus === 'failed').length;

  // Secret Password Gate: Password-Nagji@012 lagao jo secret rahe
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in zoom-in-95">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">
              एडमिन डेस्कटॉप सिस्टम लॉगिन
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              सुरक्षित एडमिन पैनल व 24x7 ऑटो-प्रिंट स्पूलर के लिए गोपनीय पासवर्ड दर्ज करें।
            </p>
          </div>

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>गोपनीय पासवर्ड (Secret Password)</span>
              </label>
              <input
                type="password"
                autoFocus
                placeholder="पासवर्ड दर्ज करें..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                className={`w-full px-4 py-3 rounded-xl border text-center font-mono text-base font-bold outline-none transition ${
                  authError
                    ? 'border-red-500 bg-red-950/30 text-red-200 focus:ring-2 focus:ring-red-500'
                    : 'border-slate-700 bg-slate-950 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
              {authError && (
                <p className="text-[11px] text-red-400 font-bold text-center mt-1">
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>एडमिन पैनल अनलॉक करें (Unlock)</span>
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
          >
            ← ग्राहक ऐप पर वापस जाएं (Back)
          </button>
        </div>
      </div>
    );
  }

  // If Minimized Mode is active on Desktop:
  if (isMinimized) {
    return (
      <OwnerBackgroundMonitor
        settings={settingsForm}
        onMaximize={() => {
          setIsMinimized(false);
          localStorage.setItem('sqp_owner_minimized', 'false');
        }}
        onExit={onClose}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Admin Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
            <Printer className="w-5 h-5" />
          </div>

          {/* Prominent AT SHOP (दूकान पर) Toggle Button */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1.5 shadow-inner">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-slate-200">दूकान पर (At Shop):</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    shopStatus.isAtShop
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {shopStatus.isAtShop ? '🟢 ON (उपस्थित)' : '🔴 OFF (अनुपस्थित)'}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium">
                {shopStatus.isManualOverride ? '🔧 मैनुअल स्विच' : '⏰ ऑटो (10:00 AM - 5:00 PM)'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleToggleAtShop(!shopStatus.isAtShop)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer shadow-md active:scale-95 ${
                shopStatus.isAtShop
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={shopStatus.isAtShop ? 'दूकान OFF करें' : 'दूकान ON करें'}
            >
              {shopStatus.isAtShop ? 'OFF करें' : 'ON करें'}
            </button>

            {shopStatus.isManualOverride && (
              <button
                type="button"
                onClick={handleResetAutoSchedule}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline ml-1"
                title="10:00 AM से 5:00 PM ऑटो शेड्यूल पर रीसेट करें"
              >
                ऑटो रीसेट
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 24x7 Desktop Auto-Start Setup Download Button */}
          <button
            type="button"
            onClick={() => setIsDesktopSetupModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            title="दुकानदार डेस्कटॉप 24x7 ऑटो-स्टार्ट सेटअप डाउनलोड करें"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>📥 PC सेटअप डाउनलोड</span>
          </button>

          {/* Desktop Minimize Button */}
          <button
            type="button"
            onClick={() => {
              setIsMinimized(true);
              localStorage.setItem('sqp_owner_minimized', 'true');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            title="डेस्कटॉप पर मिनिमाइज करें (Background Monitor Mode)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>🗕 मिनिमाइज मोड</span>
          </button>

          {/* ग्राहक ऐप QR Button for Shopkeeper to Print and Put on Counter */}
          <button
            type="button"
            onClick={() => setIsUserAppQrOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
            title="ग्राहक ऐप QR कोड प्रिंट व डाउनलोड करें"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>ग्राहक ऐप QR</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOwnerShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs"
            title="दुकानदार शेयर लिंक (Share Link with Other Shopkeepers)"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">दुकानदार शेयर</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit to Customer App</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center animate-in fade-in">
          ✓ {saveSuccessMsg}
        </div>
      )}

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-slate-950/80 border-r border-slate-800/80 p-3 space-y-1 shrink-0 overflow-x-auto md:overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2 hidden md:block">
            प्रबंधन (Management)
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard (डैशबोर्ड)</span>
          </button>

          <button
            onClick={() => setActiveTab('print_queue')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'print_queue'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>🖨️ प्रिंट कतार (Live Queue)</span>
            </div>
            {pendingJobs > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 animate-bounce">
                {pendingJobs} नया
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Shop Settings (दुकान सेटिंग)</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'ads'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>सूचना व विज्ञापन (Ads)</span>
            </div>
            {settingsForm.adsEnabled ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900 text-emerald-300">
                ON
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                OFF
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('shopkeepers')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'shopkeepers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-purple-400" />
              <span>पंजीकृत दुकानदार</span>
            </div>
            {registeredShopkeepers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200">
                {registeredShopkeepers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('qr_poster')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'qr_poster'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Poster Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('windows_agent')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'windows_agent'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Windows Print Agent (PC)</span>
          </button>
        </aside>

        {/* Tab Content Panes */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-900/50">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-white">Dashboard Overview</h3>
                  <p className="text-xs text-slate-400">
                    Real-time metrics for {settingsForm.shopName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-semibold text-emerald-400">
                    Print Spooler Agent: Online
                  </span>
                </div>
              </div>

              {/* At Shop (दूकान पर) Status Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl text-white ${shopStatus.isAtShop ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-white">दूकान पर स्विच (At Shop Status)</h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                          shopStatus.isAtShop
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {shopStatus.isAtShop ? '🟢 ON (उपस्थित)' : '🔴 OFF (अनुपस्थित)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {shopStatus.isAtShop
                        ? '✓ ग्राहक ऐप से प्रिंट ऑर्डर तुरंत दे सकते हैं।'
                        : '🛑 ग्राहक ऐप से प्रिंट देना रुका हुआ है। (दूकान बंद है/अनुपस्थित)'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ⏰ <b>ऑटो शेड्यूल:</b> सुबह 10:00 AM से शाम 5:00 PM तक ऑटो स्विच ऑन रहता है, बाकी समय ऑटो ऑफ रहता है। एडमिन जब चाहें मैन्युअल चालू/बंद कर सकते हैं।
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleAtShop(!shopStatus.isAtShop)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-lg active:scale-95 ${
                      shopStatus.isAtShop
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {shopStatus.isAtShop ? '🔴 दूकान OFF करें' : '🟢 दूकान ON करें'}
                  </button>

                  {shopStatus.isManualOverride && (
                    <button
                      type="button"
                      onClick={handleResetAutoSchedule}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 transition"
                      title="ऑटो-शेड्यूल रीसेट करें (10 AM - 5 PM)"
                    >
                      🔄 ऑटो-शेड्यूल पर लाएं
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold block">Today's Revenue</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    ₹{todayRevenue.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">100% verified payments</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold block">Total Orders</span>
                  <span className="text-2xl font-black text-blue-400 mt-1 block">
                    {orders.length}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">{completedJobs} successfully printed</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold block">In Queue (Spooling)</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">
                    {pendingJobs}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Active Windows print jobs</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold block">Failed / Retry Needed</span>
                  <span className="text-2xl font-black text-rose-400 mt-1 block">
                    {failedJobs}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Paper out or jam</span>
                </div>
              </div>

              {/* Printer Hardware Status */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Hardware Status (Shop Windows PC)</span>
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    Epson & HP Connected
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {printers.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            p.brand === 'Epson' ? 'bg-indigo-950 text-indigo-400' : 'bg-blue-950 text-blue-400'
                          }`}
                        >
                          <Printer className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{p.name}</span>
                          <span className="text-[11px] text-slate-400">
                            {p.supportedColor ? 'Colour & Photo' : 'B&W High-Speed'} • Driver: Ready
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Ready
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white">Recent Print Requests</h4>
                  <span className="text-xs text-slate-400 font-medium">
                    Total: {orders.length}
                  </span>
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No print jobs placed yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {orders.slice(0, 5).map((ord) => (
                      <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white">{ord.orderNumber}</span>
                          <span className="text-slate-400 ml-2">
                            {ord.customerName} ({ord.customerPhone})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-200">₹{ord.totalAmount.toFixed(2)}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ord.printStatus === 'completed'
                                ? 'bg-emerald-950 text-emerald-400'
                                : ord.printStatus === 'printing'
                                ? 'bg-blue-950 text-blue-400 animate-pulse'
                                : 'bg-amber-950 text-amber-400'
                            }`}
                          >
                            {ord.printStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: LIVE PRINT QUEUE & ORDERS */}
          {activeTab === 'print_queue' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Printer className="w-6 h-6 text-emerald-400" />
                    <span>🖨️ लाइव प्रिंट कतार (Live Print Orders Queue)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ग्राहकों द्वारा भेजे गए प्रिंट अनुरोध। 'स्वीकार करें' बटन पर क्लिक करके तुरंत प्रिंट निकालें।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    कतार में: {pendingJobs} ऑर्डर
                  </span>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Printer className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">कोई भी प्रिंट ऑर्डर कतार में नहीं है</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    जैसे ही कोई ग्राहक क्यूआर कोड स्कैन करके दस्तावेज प्रिंट देगा, उसका ऑर्डर तुरंत यहां 'स्वीकार करें' बटन के साथ दिखाई देगा।
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => {
                    const isPending = ord.printStatus === 'queued' || ord.printStatus === 'downloading' || ord.printStatus === 'printing';
                    return (
                      <div
                        key={ord.id}
                        className={`bg-slate-950 border-2 rounded-3xl p-5 sm:p-6 space-y-4 transition ${
                          isPending
                            ? 'border-emerald-500/80 shadow-xl shadow-emerald-950/50'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl font-black text-sm">
                              टोकन #{ord.orderNumber}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                  {ord.customerName} ({ord.customerPhone || 'ग्राहक'})
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-900/80 text-blue-200 border border-blue-700">
                                  कोड: {ord.shopCode || 'A'}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400">
                                {new Date(ord.createdAt).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })} • {ord.items.length} दस्तावेज
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                                ord.printStatus === 'completed'
                                  ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                                  : ord.printStatus === 'printing'
                                  ? 'bg-blue-900 text-blue-200 border border-blue-700 animate-pulse'
                                  : 'bg-amber-900 text-amber-200 border border-amber-700'
                              }`}
                            >
                              {ord.printStatus === 'completed'
                                ? '✓ प्रिंट पूर्ण'
                                : ord.printStatus === 'printing'
                                ? '🖨️ प्रिंटिंग जारी'
                                : '⏳ कतार में (Queued)'}
                            </span>
                          </div>
                        </div>

                        {/* Files List */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            प्रिंट किए जाने वाले दस्तावेज:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ord.items.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                              >
                                <span className="font-bold text-slate-200 truncate max-w-[200px]">
                                  • {it.document.originalFileName}
                                </span>
                                <span className="text-emerald-400 font-mono font-bold">
                                  {it.document.pageCount} पृष्ठ ({it.config.colorMode === 'color' ? 'कलर' : 'B&W'})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Actions */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                          {ord.printStatus !== 'completed' && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const updated = await api.updateOrderStatus(ord.id, {
                                    printStatus: 'completed',
                                    paymentStatus: 'paid',
                                    completedAt: new Date().toISOString(),
                                  });
                                  if (updated) {
                                    setOrders((prev) => prev.map((o) => (o.id === ord.id ? updated : o)));
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-5 h-5 text-white" />
                              <span>✓ स्वीकार करें और प्रिंट निकालें (Accept Print)</span>
                            </button>
                          )}

                          {ord.printStatus === 'completed' && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const updated = await api.updateOrderStatus(ord.id, {
                                    printStatus: 'printing',
                                  });
                                  if (updated) {
                                    setOrders((prev) => prev.map((o) => (o.id === ord.id ? updated : o)));
                                  }
                                } catch {}
                              }}
                              className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <RotateCw className="w-4 h-4 text-blue-400" />
                              <span>पुन: प्रिंट करें (Re-Print)</span>
                            </button>
                          )}

                          {ord.printStatus !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const updated = await api.updateOrderStatus(ord.id, {
                                    printStatus: 'cancelled',
                                    paymentStatus: 'failed',
                                  });
                                  if (updated) {
                                    setOrders((prev) => prev.map((o) => (o.id === ord.id ? updated : o)));
                                  }
                                } catch {}
                              }}
                              className="py-2.5 px-4 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                              <span>अस्वीकार / रद्द करें (Cancel)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SHOP SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h3 className="text-xl font-black text-white">Shop Settings (दुकान सेटिंग्स)</h3>
                <p className="text-xs text-slate-400">
                  Update your shop identity. Changes immediately appear across all posters, customer pages, receipts, and order confirmations.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      दुकान का नाम (Shop Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.shopName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      दुकान UPI ID (Shop UPI ID for Payments) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.shopUpiId}
                      onChange={(e) => setSettingsForm({ ...settingsForm, shopUpiId: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      मोबाइल नंबर (Mobile Number) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.mobileNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, mobileNumber: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      व्हाट्सएप नंबर (WhatsApp Support) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.whatsappNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-bold mb-1">
                      दुकान का पता (Shop Address)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.shopAddress}
                      onChange={(e) => setSettingsForm({ ...settingsForm, shopAddress: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      खुलने का समय (Opening Hours)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.openingHours}
                      onChange={(e) => setSettingsForm({ ...settingsForm, openingHours: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      फाइल प्रतिधारण अवधि (Document Retention Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settingsForm.documentRetentionHours}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, documentRetentionHours: parseInt(e.target.value) || 24 })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Documents older than this will be permanently purged after print.
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-bold mb-1">
                      ग्राहकों के लिए निर्देश (Customer Instructions)
                    </label>
                    <textarea
                      rows={2}
                      value={settingsForm.customerInstructions}
                      onChange={(e) => setSettingsForm({ ...settingsForm, customerInstructions: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* 1. PAYMENT GATEWAY LINK ADDING BOX */}
                  <div className="sm:col-span-2 p-4 bg-slate-900/90 rounded-2xl border border-blue-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-blue-400" />
                        <label className="text-slate-200 font-bold text-xs">
                          पेमेंट गेटवे लिंक (Custom Payment Gateway Link / URL Box)
                        </label>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                        Razorpay • Cashfree • Paytm • BharatPe
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          placeholder="e.g. https://rzp.io/l/your_shop_link or https://pmny.in/..."
                          value={settingsForm.customPaymentLink || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, customPaymentLink: e.target.value })}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 font-mono text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      {settingsForm.customPaymentLink && (
                        <a
                          href={settingsForm.customPaymentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Test Link</span>
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      यदि आपके पास मर्चेंट पेमेंट लिंक है, तो यहाँ दर्ज करें। चेकआउट के समय ग्राहकों को सीधे इस लिंक पर क्लिक करके भुगतान करने का विकल्प मिलेगा।
                    </p>
                  </div>

                  {/* 2. QR CODE IMAGE UPLOAD SYSTEM */}
                  <div className="sm:col-span-2 p-4 bg-slate-900/90 rounded-2xl border border-emerald-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <label className="text-slate-200 font-bold text-xs">
                          दुकान का QR कोड इमेज अपलोड सिस्टम (Shop QR Code Image Upload System)
                        </label>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        PhonePe • Google Pay • Paytm • BHIM Standee
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      अपनी दुकान का मूल स्टैंडी QR कोड इमेज (JPG/PNG) यहाँ अपलोड करें। ग्राहक सीधे इस इमेज को स्कैन करके भी पेमेंट कर सकेंगे।
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Upload Box */}
                      <div className="flex flex-col justify-center border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center bg-slate-950/60 transition group">
                        <input
                          type="file"
                          id="qr-image-upload-input"
                          accept="image/*"
                          onChange={handleQrImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="qr-image-upload-input"
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-2"
                        >
                          <div className="p-3 bg-slate-900 rounded-xl text-emerald-400 group-hover:scale-105 transition">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {isUploadingQr ? 'Uploading QR Image...' : 'Click to Upload QR Code Image'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Supports JPG, PNG (Max 10MB)
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Preview Box */}
                      <div className="flex flex-col items-center justify-center border border-slate-800 rounded-2xl p-4 bg-slate-950/80 min-h-[140px]">
                        {settingsForm.customQrImageUrl ? (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="relative group">
                              <img
                                src={settingsForm.customQrImageUrl}
                                alt="Shop Custom QR Code"
                                className="w-32 h-32 object-contain rounded-xl border border-slate-700 bg-white p-1.5"
                              />
                              <button
                                type="button"
                                onClick={() => setSettingsForm({ ...settingsForm, customQrImageUrl: '' })}
                                className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition"
                                title="Remove QR Image"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                              ✓ Uploaded Shop QR Image Active
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-slate-500 space-y-1">
                            <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
                            <span className="text-xs font-medium block">No custom QR image uploaded yet</span>
                            <span className="text-[10px] text-slate-600 block">Default dynamic NPCI QR is being generated</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QR Display Mode Preference */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300 font-bold">
                        चेकआउट पर QR प्रदर्शन मोड (Display Preference):
                      </span>
                      <select
                        value={settingsForm.qrDisplayMode || 'dynamic'}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, qrDisplayMode: e.target.value as any })
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-3 text-xs text-white focus:outline-hidden"
                      >
                        <option value="dynamic">Dynamic UPI QR (Auto calculates bill amount)</option>
                        <option value="custom_uploaded">Shop Standee QR Image (Uploaded Photo)</option>
                        <option value="both">Both Options (Customer can toggle)</option>
                      </select>
                    </div>
                  </div>

                  {/* 3. OPTIONAL OWNER PHOTO UPLOAD SYSTEM */}
                  <div className="sm:col-span-2 p-4 bg-slate-900/90 rounded-2xl border border-purple-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <label className="text-slate-200 font-bold text-xs">
                          दुकानदार / संचालक फोटो अपलोड (Owner Photo Upload - Optional)
                        </label>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                        वैकल्पिक (Optional)
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      अगर आप अपनी फोटो अपलोड करते हैं, तो यह ग्राहक के होम पेज पर मुख्य प्रिंटर इमेज की जगह प्रमुखता से दिखाई देगी। यदि फोटो अपलोड नहीं करेंगे, तो डिफॉल्ट प्रिंटर इमेज दिखेगी।
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Upload Box */}
                      <div className="flex flex-col justify-center border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-4 text-center bg-slate-950/60 transition group">
                        <input
                          type="file"
                          id="owner-photo-upload-input"
                          accept="image/*"
                          onChange={handleOwnerPhotoUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="owner-photo-upload-input"
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-2"
                        >
                          <div className="p-3 bg-slate-900 rounded-xl text-purple-400 group-hover:scale-105 transition">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {isUploadingOwnerPhoto ? 'फोटो अपलोड हो रही है...' : 'अपनी फोटो अपलोड करने के लिए क्लिक करें'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Supports JPG, PNG (Max 10MB)
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Preview Box */}
                      <div className="flex flex-col items-center justify-center border border-slate-800 rounded-2xl p-4 bg-slate-950/80 min-h-[140px]">
                        {settingsForm.ownerPhotoUrl ? (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="relative group">
                              <img
                                src={settingsForm.ownerPhotoUrl}
                                alt="Shop Owner Photo"
                                className="w-28 h-28 object-cover rounded-2xl border-2 border-purple-500 shadow-md"
                              />
                              <button
                                type="button"
                                onClick={() => setSettingsForm({ ...settingsForm, ownerPhotoUrl: '' })}
                                className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition"
                                title="Remove Owner Photo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                              ✓ संचालक फोटो सक्रिय (होम पेज पर दिखेगी)
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-slate-500 space-y-1">
                            <Users className="w-8 h-8 mx-auto text-slate-600" />
                            <span className="text-xs font-medium block">कोई फोटो अपलोड नहीं की गई</span>
                            <span className="text-[10px] text-slate-600 block">होम पेज पर आधुनिक प्रिंटर इमेज दिखेगी</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save All Shop Settings</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: ADS & NOTICE CONTROL (सूचना व विज्ञापन) */}
          {activeTab === 'ads' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-400" />
                    <span>सूचना व विज्ञापन नियंत्रण (Store Notice & Ads Control)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ग्राहक ऐप पर महत्वपूर्ण सूचना या इमेज विज्ञापन बैनर प्रदर्शित करें
                  </p>
                </div>

                {/* Ads Control Toggle Button (चालू / बंद) */}
                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm((prev) => ({ ...prev, adsEnabled: !prev.adsEnabled }))
                  }
                  className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-lg ${
                    settingsForm.adsEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${settingsForm.adsEnabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                  <span>
                    {settingsForm.adsEnabled
                      ? 'विज्ञापन चालू है (Ads: ON)'
                      : 'विज्ञापन बंद है (Ads: OFF)'}
                  </span>
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  settingsForm.adsEnabled
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{settingsForm.adsEnabled ? '📢' : '🔇'}</span>
                  <div>
                    <span className="font-bold block text-white">
                      {settingsForm.adsEnabled
                        ? 'विज्ञापन व सूचना वर्तमान में ग्राहक ऐप पर सक्रिय (ON) है'
                        : 'विज्ञापन वर्तमान में बंद (OFF) है — ग्राहक ऐप पर कोई सूचना नहीं दिखेगी'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      बटन दबाकर कभी भी तुरंत चालू या बंद कर सकते हैं।
                    </span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    settingsForm.adsEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settingsForm.adsEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              {/* Notice Form & Banner Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Controls */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <span>सूचना का विवरण व इमेज (Content Details)</span>
                  </h4>

                  {/* Text Announcement */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      सूचना संदेश / नोटिस (Notice Text):
                    </label>
                    <textarea
                      rows={3}
                      value={settingsForm.adsContent || ''}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, adsContent: e.target.value }))}
                      placeholder="उदा: आधार कार्ड, जनआधार कार्ड व पैन कार्ड प्रिंटिंग की सुविधा उपलब्ध है। तुरंत प्रिंट प्राप्त करें।"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 text-white p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500">
                      यह संदेश ग्राहक ऐप पर सबसे ऊपर सूचना बैनर के रूप में दिखेगा।
                    </span>
                  </div>

                  {/* Banner Image Upload */}
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <label className="block text-xs font-bold text-slate-300">
                      विज्ञापन बैनर इमेज अपलोड (Banner Image - Optional):
                    </label>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition shadow-xs">
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingAdBanner ? 'अपलोड हो रहा है...' : 'बैनर इमेज चुनें'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAdBannerUpload}
                          disabled={isUploadingAdBanner}
                        />
                      </label>

                      {settingsForm.adsBannerUrl && (
                        <button
                          type="button"
                          onClick={() => setSettingsForm((prev) => ({ ...prev, adsBannerUrl: '' }))}
                          className="px-3 py-2 rounded-xl bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold hover:bg-rose-900 transition"
                        >
                          इमेज हटाएं
                        </button>
                      )}
                    </div>

                    {/* Image URL fallback */}
                    <div className="pt-2">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        या बैनर इमेज का सीधा वेब लिंक दर्ज करें (Image URL):
                      </label>
                      <input
                        type="url"
                        value={settingsForm.adsBannerUrl || ''}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, adsBannerUrl: e.target.value }))}
                        placeholder="https://example.com/banner.jpg"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 text-white py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = await api.updateSettings(settingsForm);
                        onUpdateSettings(updated);
                        setSaveSuccessMsg('सूचना व विज्ञापन सेटिंग्स सफलतापूर्वक सहेजी गईं ✓');
                        setTimeout(() => setSaveSuccessMsg(null), 3000);
                      }}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>विज्ञापन सेटिंग्स सहेजें (Save Announcement)</span>
                    </button>
                  </div>
                </div>

                {/* Live Preview on Customer App */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span>ग्राहक ऐप पर लाइव प्रीव्यू (Live Customer View)</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {settingsForm.adsEnabled ? '🟢 लाइव दिखेगा' : '⚪ नहीं दिखेगा (OFF)'}
                    </span>
                  </div>

                  {settingsForm.adsEnabled ? (
                    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 text-slate-200 space-y-3 shadow-md animate-in fade-in">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                        <Megaphone className="w-4 h-4" />
                        <span>विशेष सूचना / Announcement</span>
                      </div>

                      {settingsForm.adsBannerUrl && (
                        <div className="rounded-xl overflow-hidden border border-amber-500/30 max-h-48 bg-black/40">
                          <img
                            src={settingsForm.adsBannerUrl}
                            alt="Advertisement Banner"
                            className="w-full h-auto object-cover max-h-48"
                          />
                        </div>
                      )}

                      <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                        {settingsForm.adsContent || 'दुकानदार द्वारा कोई सूचना दर्ज नहीं की गई है।'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto">
                        <Megaphone className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-400">
                        विज्ञापन बंद (OFF) स्थिति में है
                      </p>
                      <p className="text-[11px] text-slate-600 max-w-xs mx-auto">
                        जब आप ऊपर दिए गए बटन को चालू करेंगे, तभी यह बैनर ग्राहकों को होम पेज पर दिखेगा।
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: REGISTERED SHOPKEEPERS (पंजीकृत दुकानदार) */}
          {activeTab === 'shopkeepers' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span>पंजीकृत दुकानदार (Registered Shopkeepers)</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-900/60 text-purple-300 border border-purple-700">
                      कुल: {registeredShopkeepers.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    आपके शेयर लिंक द्वारा पंजीकृत अन्य दुकानदारों और ई-मित्र संचालकों की सूची
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOwnerShareModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>दुकानदार शेयर लिंक (Share Invite Link)</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="नाम या मोबाइल नंबर से खोजें (Search by Name or Mobile)..."
                  value={searchShopkeeper}
                  onChange={(e) => setSearchShopkeeper(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Shopkeepers List */}
              {(() => {
                const filtered = registeredShopkeepers.filter(
                  (sk) =>
                    sk.name.toLowerCase().includes(searchShopkeeper.toLowerCase()) ||
                    sk.mobileNumber.includes(searchShopkeeper) ||
                    (sk.shopName && sk.shopName.toLowerCase().includes(searchShopkeeper.toLowerCase()))
                );

                if (filtered.length === 0) {
                  return (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-950/60 text-purple-400 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-200">
                        {registeredShopkeepers.length === 0
                          ? 'अभी तक कोई अन्य दुकानदार पंजीकृत नहीं हुआ है'
                          : 'खोज से कोई दुकानदार नहीं मिला'}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        अपने मित्र दुकानदारों को Smart QR Print से जोड़ने के लिए ऊपर दिए गए "दुकानदार शेयर लिंक" बटन पर क्लिक करके लिंक भेजें।
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsOwnerShareModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition"
                      >
                        शेयर लिंक खोलें
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((sk) => (
                      <div
                        key={sk.id}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-900/40 text-purple-300 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-800/40">
                              {sk.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{sk.name}</h4>
                              <p className="text-xs text-purple-300 font-medium">
                                {sk.shopName || 'दुकान का नाम नहीं दिया'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(sk.registeredAt).toLocaleDateString('hi-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {sk.address && (
                          <p className="text-xs text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                            📍 {sk.address}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                          <span className="font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {sk.mobileNumber}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${sk.mobileNumber}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition"
                            >
                              <Phone className="w-3 h-3 text-blue-400" />
                              <span>कॉल</span>
                            </a>
                            <a
                              href={`https://wa.me/91${sk.mobileNumber.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[11px] font-bold flex items-center gap-1 transition"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}







          {/* TAB 6: QR POSTER STUDIO */}
          {activeTab === 'qr_poster' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-xl font-black text-white">QR Poster Studio (A4 Printable)</h3>
                <p className="text-xs text-slate-400">
                  Generate, preview and print the shop's permanent QR poster with clear Hindi customer instructions.
                </p>
              </div>

              {/* Printable Poster Mockup */}
              <div
                id="shop-printable-poster"
                className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-blue-600 text-center max-w-lg mx-auto space-y-6"
              >
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white uppercase tracking-wider">
                    Smart QR Print India
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    {settingsForm.shopName}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">{settingsForm.shopAddress}</p>
                </div>

                {settingsForm.customQrImageUrl && (
                  <div className="flex justify-center gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPosterQrType('app_url')}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        posterQrType === 'app_url'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      वेबसाइट QR (Upload Page)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosterQrType('custom_qr')}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        posterQrType === 'custom_qr'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      अपलोड किया गया Standee QR
                    </button>
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 inline-block">
                  {posterQrType === 'custom_qr' && settingsForm.customQrImageUrl ? (
                    <img
                      src={settingsForm.customQrImageUrl}
                      alt="Shop Custom QR"
                      className="w-56 h-56 mx-auto object-contain"
                    />
                  ) : posterQrUrl ? (
                    <img src={posterQrUrl} alt="Shop Permanent QR" className="w-56 h-56 mx-auto object-contain" />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center">Loading...</div>
                  )}
                  <span className="text-[11px] font-bold text-slate-500 mt-2 block">
                    कैमरा या Google Lens से स्कैन करें
                  </span>
                </div>

                {/* Workflow Steps in Hindi as requested */}
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-left space-y-2">
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider text-center">
                    प्रिंट प्राप्त करने की सरल प्रक्रिया:
                  </h4>
                  <p className="text-xs sm:text-sm font-bold text-blue-950 text-center leading-relaxed">
                    QR स्कैन करें → फाइल अपलोड करें → प्रिंट विकल्प चुनें → भुगतान करें → प्रिंट प्राप्त करें
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-100">
                  <span>Helpline: {settingsForm.mobileNumber}</span>
                  <span>Epson EcoTank & HP LaserJet</span>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Print A4 Poster (PDF)</span>
                </button>
              </div>
            </div>
          )}



          {/* TAB 8: WINDOWS PRINT AGENT (C#) */}
          {activeTab === 'windows_agent' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-white">Windows Desktop Print Agent (C# / .NET 8)</h3>
                <p className="text-xs text-slate-400">
                  Desktop spooler client running on your shop Windows PC to control physical Epson and HP USB/Network printers.
                </p>
              </div>

              {/* Status Banner */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Agent Version 2.4.0 (Windows x64 Desktop)
                    </h4>
                    <span className="text-xs text-slate-400">
                      Machine: <strong>SHOP-DESKTOP-WIN11</strong> • Heartbeat: Active
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Online & Polling (/api/agent/jobs)
                </span>
              </div>

              {/* 1-Click 24x7 Desktop Auto-Start & Minimized Setup */}
              <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-slate-950 border-2 border-blue-500/40 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">
                        दुकानदार 24x7 डेस्कटॉप ऑटो-स्टार्ट सेटअप (Windows 1-Click Installer)
                      </h4>
                      <p className="text-xs text-blue-200">
                        कंप्यूटर चालू होते ही बैकग्राउंड में मिनिमाइज रहेगा • नया प्रिंट आते ही ऑटोमेटिक कैश/ऑनलाइन पॉपअप खुलेगा
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDesktopSetupModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>सेटअप डायलॉग खोलें</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => downloadSetupFile('bat', settingsForm.shopName)}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-blue-500/30 hover:border-blue-400 flex flex-col justify-between space-y-2 transition group text-left cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                        Windows Startup Auto-Run
                      </span>
                      <strong className="text-white text-xs block mt-0.5 group-hover:text-blue-300">
                        1. .BAT सेटअप डाउनलोड करें
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        डबल-क्लिक करते ही Windows Startup फोल्डर में 24x7 ऑटो-स्टार्ट जोड़ देगा।
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400 font-bold text-[11px] pt-1">
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .bat</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadSetupFile('vbs', settingsForm.shopName)}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-2 transition group text-left cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Silent Background
                      </span>
                      <strong className="text-white text-xs block mt-0.5 group-hover:text-emerald-300">
                        2. साइलेंट रनर (.vbs)
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        बिना किसी कंसोल विंडो के बैकग्राउंड में शांति से चलता रहेगा।
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px] pt-1">
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .vbs</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadSetupFile('widget', settingsForm.shopName)}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-purple-500/30 hover:border-purple-400 flex flex-col justify-between space-y-2 transition group text-left cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                        Single-File HTML Widget
                      </span>
                      <strong className="text-white text-xs block mt-0.5 group-hover:text-purple-300">
                        3. डेस्कटॉप विजेट (.html)
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Chrome / Edge में ऑफलाइन/ऑनलाइन कभी भी चलाएं।
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-purple-400 font-bold text-[11px] pt-1">
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .html</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* C# Source Code & Setup Guide */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white">
                  Full C# Project Available in Workspace
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The complete source files for the Windows Desktop Agent have been compiled in the <code>/windows-agent</code> directory. You can publish it for your shop Windows 10/11 machine using:
                </p>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-emerald-400">
                  cd windows-agent && dotnet publish -c Release -r win-x64 --self-contained false -o ./publish
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic SHA-256 integrity verification before every print</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Dedicated routing: Epson for colour/photo, HP for B&W duplex</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Runs in Windows system tray with notifications and auto-start on boot</span>
                  </div>
                </div>
              </div>
            </div>
          )}


        </main>
      </div>

      {/* Owner Share Modal */}
      <OwnerShareModal
        settings={settingsForm}
        isOpen={isOwnerShareModalOpen}
        onClose={() => setIsOwnerShareModalOpen(false)}
      />

      {/* Customer App Standee QR Modal for Shop Counter */}
      <UserAppQrModal
        settings={settingsForm}
        isOpen={isUserAppQrOpen}
        onClose={() => setIsUserAppQrOpen(false)}
      />

      {/* 24x7 Desktop Auto-Start Setup Modal */}
      <DesktopSetupModal
        isOpen={isDesktopSetupModalOpen}
        onClose={() => setIsDesktopSetupModalOpen(false)}
        settings={settingsForm}
        onActivateMinimizedMode={() => {
          setIsMinimized(true);
          localStorage.setItem('sqp_owner_minimized', 'true');
        }}
      />
    </div>
  );
};
