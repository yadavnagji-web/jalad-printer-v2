import React, { useEffect, useState } from 'react';
import {
  ShopSettings,
  PricingSettings,
  UploadedDocument,
  PrintJobConfig,
  OrderItem,
  CustomerOrder,
  RegisteredShopkeeper,
} from './types';
import { api, DEFAULT_PRICING, DEFAULT_SHOP_SETTINGS } from './services/api';
import { Header } from './components/Header';
import { DocumentUploader } from './components/DocumentUploader';
import { DocumentCard } from './components/DocumentCard';
import { ImageEditorModal } from './components/ImageEditorModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { OrderSummaryCheckout } from './components/OrderSummaryCheckout';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { UserAppQrModal } from './components/UserAppQrModal';
import { OwnerShareModal } from './components/OwnerShareModal';
import { ShopkeeperRegistrationModal } from './components/ShopkeeperRegistrationModal';
import { AdminPanel } from './components/AdminPanel';
import { OwnerPaymentApprovalModal } from './components/OwnerPaymentApprovalModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { DesktopSetupModal } from './components/DesktopSetupModal';
import { OwnerBackgroundMonitor } from './components/OwnerBackgroundMonitor';
import { ShopHeroBanner } from './components/ShopHeroBanner';
import { playOrderChime } from './utils/audioAlert';
import { calculateOrderTotal } from './utils/pricing';
import { getEffectiveShopStatus } from './utils/shopStatus';
import {
  ArrowRight,
  ArrowLeft,
  Printer,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Plus,
  FileText,
  Clock,
  Layers,
  CreditCard,
  RotateCcw,
  QrCode,
  Share2,
  Lock,
  Megaphone,
  X,
  Smartphone,
  Laptop,
  Download,
} from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('mode') === 'admin' ||
        params.get('role') === 'admin' ||
        params.get('mode') === 'owner' ||
        params.get('admin') === 'true' ||
        params.get('desktop') === 'true' ||
        localStorage.getItem('sqp_system_role') === 'admin'
      );
    }
    return false;
  });

  const [currentShopCode, setCurrentShopCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code') || params.get('shopCode') || params.get('shop') || params.get('ref');
      if (code) {
        localStorage.setItem('sqp_shop_code', code.toUpperCase());
        return code.toUpperCase();
      }
      const saved = localStorage.getItem('sqp_shop_code');
      if (saved) return saved;
    }
    return 'A';
  });

  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Customer document state
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [configs, setConfigs] = useState<{ [docId: string]: PrintJobConfig }>({});

  // Modals state
  const [editingDoc, setEditingDoc] = useState<UploadedDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<CustomerOrder | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isUserAppQrOpen, setIsUserAppQrOpen] = useState(false);
  const [isOwnerShareModalOpen, setIsOwnerShareModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isOwnerLoginModalOpen, setIsOwnerLoginModalOpen] = useState(false);
  const [isDesktopSetupOpen, setIsDesktopSetupOpen] = useState(false);
  const [isAppUpdateAvailable, setIsAppUpdateAvailable] = useState(false);
  const [isOwnerDevice, setIsOwnerDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('mode') === 'owner' ||
        params.get('mode') === 'desktop' ||
        params.get('desktop') === 'true' ||
        localStorage.getItem('sqp_is_owner_device') === 'true' ||
        localStorage.getItem('sqp_auto_start') === 'true' ||
        localStorage.getItem('sqp_owner_minimized') === 'true'
      );
    }
    return false;
  });

  const [isOwnerMinimizedView, setIsOwnerMinimizedView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('minimized') === 'true' ||
        localStorage.getItem('sqp_owner_minimized') === 'true'
      );
    }
    return false;
  });

  const [isSubmittingDirectPrint, setIsSubmittingDirectPrint] = useState(false);

  const shopStatus = getEffectiveShopStatus(settings);

  // Initial load, URL routing, and Automatic User App Update Detection
  useEffect(() => {
    let currentAppVersion: string | null = null;

    const init = async () => {
      const [s, p] = await Promise.all([api.getSettings(), api.getPricing()]);
      setSettings(s);
      setPricing(p);

      // Check URL parameters for Owner or New Shopkeeper flows
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (
          params.get('mode') === 'owner' ||
          params.get('admin') === 'true' ||
          params.get('minimized') === 'true' ||
          localStorage.getItem('sqp_auto_start') === 'true'
        ) {
          setIsAdminOpen(true);
        }
        if (params.get('minimized') === 'true' || localStorage.getItem('sqp_owner_minimized') === 'true') {
          setIsOwnerMinimizedView(true);
        }
        if (params.get('mode') === 'new_shopkeeper' || params.get('join') === 'shopkeeper') {
          setIsRegistrationModalOpen(true);
        }
      }
    };
    init();

    // Automatic update detection: polls server version and reloads on update
    const checkAppVersion = async () => {
      try {
        const res = await fetch('/api/version');
        if (res.ok) {
          const data = await res.json();
          if (!currentAppVersion) {
            currentAppVersion = data.version;
          } else if (currentAppVersion !== data.version) {
            console.log('[Auto-Update] New app version detected. Displaying update notification popup...');
            setIsAppUpdateAvailable(true);
          }
        }
      } catch {
        // Safe offline check
      }
    };

    checkAppVersion();
    const updateInterval = setInterval(checkAppVersion, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkAppVersion();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Register service worker if supported
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    // Secret keyboard shortcut (Ctrl+Shift+A or Ctrl+Alt+A) to open Owner Admin Login
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') ||
        (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a')
      ) {
        e.preventDefault();
        setIsOwnerLoginModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(updateInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDocumentsAdded = (newDocs: UploadedDocument[]) => {
    setDocuments((prev) => [...prev, ...newDocs]);
    // Initialize default configs for new documents: Strictly B&W by default and High Quality internally
    setConfigs((prev) => {
      const updated = { ...prev };
      newDocs.forEach((d) => {
        if (!updated[d.id]) {
          updated[d.id] = {
            paperSize: settings.defaultPaperSize || 'A4',
            orientation: 'portrait',
            pageRange: 'all',
            copies: 1,
            colorMode: 'bw', // BY DEFAULT B&W HI RAKHE
            duplex: false,
            scaling: 'actual_size',
            quality: 'high', // QUALITY AUTOMATIC HIGH RAKHO INTERNAL
            mergeIdCards: false,
          };
        }
      });
      return updated;
    });
  };

  const handleUpdateConfig = (docId: string, partial: Partial<PrintJobConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], ...partial },
    }));
  };

  const handleRemoveDoc = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setConfigs((prev) => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  };

  // Convert documents + configs to OrderItems
  const orderItems: OrderItem[] = documents.map((doc) => {
    const config = configs[doc.id] || {
      paperSize: 'A4',
      orientation: 'portrait',
      pageRange: 'all',
      copies: 1,
      colorMode: 'bw',
      duplex: false,
      scaling: 'actual_size',
      quality: 'standard',
    };
    const totalCalc = calculateOrderTotal([{ doc, config }], pricing);
    return {
      id: `item-${doc.id}`,
      document: doc,
      config,
      calculatedPrice: totalCalc.subtotal,
      pageCountToPrint: doc.pageCount,
    };
  });

  const totals = calculateOrderTotal(
    documents.map((d) => ({ doc: d, config: configs[d.id] })),
    pricing
  );

  const handleOrderCompleted = (order: CustomerOrder) => {
    setTrackingOrder(order);
    setWizardStep(4);
  };

  const handleResetForNewOrder = () => {
    setDocuments([]);
    setConfigs({});
    setTrackingOrder(null);
    setWizardStep(1);
  };

  const handleDirectSubmitPrint = async () => {
    if (documents.length === 0) return;
    const shopStatus = getEffectiveShopStatus(settings);
    if (!shopStatus.isAtShop) {
      alert(
        "🛑 दुकानदार वर्तमान में अनुपस्थित हैं ('दूकान पर' मोड OFF है)।\n\nप्रिंट सेवा सुबह 10:00 बजे से शाम 5:00 बजे तक या दुकानदार के 'दूकान पर' ऑन करने पर ही उपलब्ध रहती है।"
      );
      return;
    }
    setIsSubmittingDirectPrint(true);
    try {
      const orderId = `order-${Date.now()}`;
      const orderNumber = Math.floor(1000 + Math.random() * 9000).toString();
      const newOrder: CustomerOrder = {
        id: orderId,
        orderNumber,
        customerName: 'Grahak',
        customerPhone: '',
        items: documents.map((doc) => ({
          id: `item-${doc.id}`,
          document: doc,
          config: configs[doc.id] || {
            paperSize: 'A4',
            orientation: 'portrait',
            pageRange: 'all',
            copies: 1,
            colorMode: 'bw',
            duplex: false,
            scaling: 'actual_size',
            quality: 'high',
          },
          calculatedPrice: 0,
          pageCountToPrint: doc.pageCount || 1,
        })),
        subtotal: 0,
        tax: 0,
        totalAmount: 0,
        paymentStatus: 'pending',
        paymentMethod: 'counter_cash',
        paymentTxnId: null,
        paidAt: null,
        printStatus: 'queued',
        assignedPrinterId: null,
        assignedPrinterName: 'Epson & HP Connected Printer',
        retryCount: 0,
        failureReason: null,
        completedAt: null,
        verifiedHashMatch: true,
        shopCode: currentShopCode,
        createdAt: new Date().toISOString(),
      };

      const created = await api.createOrder(newOrder);
      playOrderChime();
      setTrackingOrder(created);
    } catch (err) {
      console.error('Failed to submit print request:', err);
    } finally {
      setIsSubmittingDirectPrint(false);
    }
  };

  const handleOwnerAccessPrompt = () => {
    setIsOwnerLoginModalOpen(true);
  };

  // Dedicated Native Desktop Popup Mode (Launched automatically by 24x7 Windows Background Daemon)
  const isPopupMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('popup') === 'true';

  if (isPopupMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-3 select-none">
        <OwnerPaymentApprovalModal
          currentShopCode={currentShopCode}
          onOrderApproved={(order) => {
            if (trackingOrder && trackingOrder.id === order.id) {
              setTrackingOrder(order);
            }
          }}
        />
      </div>
    );
  }

  // 24x7 Minimized Shopkeeper Background Monitor View (Runs 24x7 on Desktop)
  if (isOwnerMinimizedView) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
        <OwnerBackgroundMonitor
          settings={settings}
          onMaximize={() => {
            setIsOwnerMinimizedView(false);
            localStorage.setItem('sqp_owner_minimized', 'false');
            setIsAdminOpen(true);
          }}
          onExit={() => {
            setIsOwnerMinimizedView(false);
            localStorage.setItem('sqp_owner_minimized', 'false');
          }}
        />

        {/* 24x7 Instant Payment Popup Modal (Loud Audio Chime & Verification) */}
        <OwnerPaymentApprovalModal
          currentShopCode={currentShopCode}
          onOrderApproved={(order) => {
            if (trackingOrder && trackingOrder.id === order.id) {
              setTrackingOrder(order);
            }
          }}
          onOpenAdmin={() => {
            setIsOwnerMinimizedView(false);
            setIsAdminOpen(true);
            setIsOwnerDevice(true);
          }}
        />

        <DesktopSetupModal
          isOpen={isDesktopSetupOpen}
          onClose={() => setIsDesktopSetupOpen(false)}
          settings={settings}
          onOpenAdmin={() => {
            setIsDesktopSetupOpen(false);
            setIsOwnerLoginModalOpen(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        settings={settings}
        language={language}
        currentShopCode={currentShopCode}
        onLanguageToggle={() => setLanguage((l) => (l === 'hi' ? 'en' : 'hi'))}
        onOpenTracking={() => setIsTrackingModalOpen(true)}
        onOpenAdmin={() => {
          if (isAdminOpen) {
            setIsAdminOpen(false);
          } else {
            setIsOwnerLoginModalOpen(true);
          }
        }}
        isAdmin={isAdminOpen}
        isOwnerDevice={isOwnerDevice}
        onToggleOwnerDevice={() => {
          const next = !isOwnerDevice;
          setIsOwnerDevice(next);
          localStorage.setItem('sqp_is_owner_device', next ? 'true' : 'false');
          if (next) playOrderChime();
        }}
        onOpenDesktopSetup={() => setIsDesktopSetupOpen(true)}
        onMinimizeToTray={() => {
          setIsOwnerMinimizedView(true);
          localStorage.setItem('sqp_owner_minimized', 'true');
        }}
      />

      {/* 
        Shop Owner Payment Approval Popup:
        Active ONLY when Admin Panel is open or in Minimized Monitor Mode.
        Never shows on the customer's mobile app view.
      */}
      {isAdminOpen && (
        <OwnerPaymentApprovalModal
          currentShopCode={currentShopCode}
          onOrderApproved={(order) => {
            if (trackingOrder && trackingOrder.id === order.id) {
              setTrackingOrder(order);
            }
          }}
          onOpenAdmin={() => {
            setIsAdminOpen(true);
            setIsOwnerDevice(true);
          }}
        />
      )}

      {/* Main View Area: Admin Panel OR Customer App */}
      {isAdminOpen ? (
        <AdminPanel
          settings={settings}
          pricing={pricing}
          onUpdateSettings={setSettings}
          onUpdatePricing={setPricing}
          onClose={() => setIsAdminOpen(false)}
        />
      ) : (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 space-y-5">
          {/* Shopkeeper Away / At Shop OFF Notice Banner */}
          {!shopStatus.isAtShop && (
            <div className="bg-gradient-to-r from-rose-500/10 via-red-500/10 to-rose-500/10 border-2 border-rose-500/40 rounded-3xl p-4 sm:p-5 text-slate-900 space-y-2 shadow-md animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>🛑 दुकान बंद / दुकानदार अनुपस्थित (Shop Closed)</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-rose-950 leading-relaxed">
                दुकानदार वर्तमान में उपलब्ध नहीं हैं ('दूकान पर' मोड OFF है)। प्रिंट सेवा केवल सुबह 10:00 बजे से शाम 5:00 बजे तक अथवा दुकानदार के चालू करने पर ही उपलब्ध रहती है।
              </p>
            </div>
          )}

          {/* Store Owner Notice & Ads Announcement (Shown ONLY when Ads Control Button is ON) */}
          {settings.adsEnabled && (
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 text-slate-900 space-y-3 shadow-md animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <span>विशेष सूचना / Announcement</span>
              </div>
              {settings.adsBannerUrl && (
                <div className="rounded-2xl overflow-hidden border border-amber-300 max-h-60 bg-black/5 flex items-center justify-center">
                  <img
                    src={settings.adsBannerUrl}
                    alt="Notice Banner"
                    className="w-full h-auto object-cover max-h-60 rounded-xl"
                  />
                </div>
              )}
              {settings.adsContent && (
                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                  {settings.adsContent}
                </p>
              )}
            </div>
          )}

          {/* Simplified Direct 1-Click Print View */}
          {trackingOrder ? (
            <div className="bg-white rounded-3xl border-2 border-emerald-500 p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-inner animate-bounce">
                  <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" />
                </div>
                <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider inline-block">
                  ✓ प्रिंट अनुरोध सफलतापूर्वक भेजा गया!
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  ऑर्डर टोकन #{trackingOrder.orderNumber}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-medium">
                  दुकानदार के कंप्यूटर पर आपका प्रिंट अनुरोध पहुँच चुका है। जैसे ही दुकानदार 'स्वीकार' करेंगे, प्रिंट तुरंत निकल जाएगा।
                </p>
              </div>

              {/* Uploaded Files Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">
                  भेजे गए दस्तावेज ({trackingOrder.items.length}):
                </span>
                <div className="space-y-2">
                  {trackingOrder.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200"
                    >
                      <span className="font-bold text-slate-800 truncate max-w-[220px]">
                        • {it.document.originalFileName}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {it.document.pageCount} पृष्ठ
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset / New Print Action */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResetForNewOrder}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>नया दस्तावेज प्रिंट करें (Start New Print)</span>
                </button>
              </div>
            </div>
          ) : (
            <DocumentUploader
              settings={settings}
              language={language}
              uploadedDocuments={documents}
              onDocumentsAdded={handleDocumentsAdded}
              onRemoveDocument={handleRemoveDoc}
              onNextStep={handleDirectSubmitPrint}
              onOpenPreview={(doc) => setPreviewDoc(doc)}
              isSubmitting={isSubmittingDirectPrint}
            />
          )}
        </main>
      )}

      {/* MODALS */}

      {/* 1. Document Visual Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* 2. Photo Editor Modal */}
      {editingDoc && (
        <ImageEditorModal
          document={editingDoc}
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSaveProcessedCopy={(processedUrl) => {
            setDocuments((prev) =>
              prev.map((d) => (d.id === editingDoc.id ? { ...d, previewUrl: processedUrl } : d))
            );
          }}
        />
      )}

      {/* 3. Customer Scan to Print QR Modal */}
      <UserAppQrModal
        settings={settings}
        isOpen={isUserAppQrOpen}
        onClose={() => setIsUserAppQrOpen(false)}
      />

      {/* 4. Owner Share Modal */}
      <OwnerShareModal
        settings={settings}
        isOpen={isOwnerShareModalOpen}
        onClose={() => setIsOwnerShareModalOpen(false)}
      />

      {/* 5. Shopkeeper Multi-Owner Registration Modal */}
      <ShopkeeperRegistrationModal
        isOpen={isRegistrationModalOpen}
        onRegistered={(reg) => {
          setIsRegistrationModalOpen(false);
          setIsAdminOpen(true);
        }}
        onCancel={() => setIsRegistrationModalOpen(false)}
      />

      {/* 6. Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        initialOrder={trackingOrder}
        settings={settings}
      />

      {/* 7. Store Owner PIN Login Modal */}
      <OwnerLoginModal
        isOpen={isOwnerLoginModalOpen}
        onClose={() => setIsOwnerLoginModalOpen(false)}
        onSuccess={() => {
          setIsOwnerLoginModalOpen(false);
          setIsAdminOpen(true);
          localStorage.setItem('sqp_is_owner_device', 'true');
          setIsOwnerDevice(true);
        }}
      />

      {/* 8. Desktop 24x7 Auto-Start Setup Modal */}
      <DesktopSetupModal
        isOpen={isDesktopSetupOpen}
        onClose={() => setIsDesktopSetupOpen(false)}
        settings={settings}
        onActivateMinimizedMode={() => {
          setIsOwnerMinimizedView(true);
          localStorage.setItem('sqp_owner_minimized', 'true');
        }}
        onOpenAdmin={() => {
          setIsDesktopSetupOpen(false);
          setIsOwnerLoginModalOpen(true);
        }}
      />

      {/* Auto-Update Notification Banner / Popup */}
      {isAppUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-amber-400/80 animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shrink-0 font-black">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  🚀 नया ऐप अपडेट उपलब्ध!
                </span>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-xs text-blue-200 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-sm font-black text-white">ऐप का नया संस्करण जारी हुआ है!</h4>
              <p className="text-xs text-blue-100 leading-relaxed">
                नवीनतम सुविधाओं, सुरक्षा सुधारों और तेज स्पीड के लिए कृपया बटन पर क्लिक करके ऐप रीलोड करें।
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>अभी ऐप रीलोड करें (Update App Now)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Clean and Customer-Focused */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3 sm:py-4 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <p className="text-xs font-semibold text-slate-700">
            Designed by Nagji Yadav Sakodar, 9982151938
          </p>
          <p className="text-[11px] text-slate-400">
            {settings.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI'} • Fast Smart QR Print
          </p>
        </div>
      </footer>
    </div>
  );
}
