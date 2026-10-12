import React, { useEffect, useState, useRef } from 'react';
import {
  Bell,
  CheckCircle,
  Printer,
  X,
  FileText,
  User,
  Shield,
  ExternalLink,
  Eye,
  Check,
} from 'lucide-react';
import { CustomerOrder } from '../types';
import { api } from '../services/api';
import { playOrderChime } from '../utils/audioAlert';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../utils/wakeLock';
import { triggerBrowserPrintDialog } from '../utils/silentPrinter';

interface OwnerPaymentApprovalModalProps {
  onOrderApproved?: (order: CustomerOrder) => void;
  onOpenAdmin?: () => void;
  currentShopCode?: string;
}

export const OwnerPaymentApprovalModal: React.FC<OwnerPaymentApprovalModalProps> = ({
  onOrderApproved,
  onOpenAdmin,
  currentShopCode,
}) => {
  const [pendingOrders, setPendingOrders] = useState<CustomerOrder[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(new Set());
  const lastAlertedOrderId = useRef<string | null>(null);

  // Persistent record of approved / processed orders so they NEVER reopen
  const processedOrderIdsRef = useRef<Set<string>>(
    (() => {
      const set = new Set<string>();
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sqp_verified_order_ids');
          if (raw) {
            const list: string[] = JSON.parse(raw);
            list.forEach((id) => set.add(id));
          }
        } catch {}
      }
      return set;
    })()
  );

  const markOrderAsProcessed = (orderId: string) => {
    processedOrderIdsRef.current.add(orderId);
    setDismissedOrderIds((prev) => new Set(prev).add(orderId));
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (typeof window !== 'undefined') {
      try {
        const arr = Array.from(processedOrderIdsRef.current).slice(-100);
        localStorage.setItem('sqp_verified_order_ids', JSON.stringify(arr));
      } catch {}
    }
  };

  // Poll and SSE for orders awaiting approval for instant popup response
  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

    const checkPending = async () => {
      try {
        const allOrders = await api.getOrders();
        if (!isMounted) return;
        const targetShopCode =
          currentShopCode ||
          (typeof window !== 'undefined' ? localStorage.getItem('sqp_shop_code') : null) ||
          'A';
        const awaiting = allOrders.filter(
          (o) =>
            (o.paymentStatus === 'counter_pending' || o.paymentStatus === 'pending') &&
            o.printStatus !== 'cancelled' &&
            o.printStatus !== 'completed' &&
            (!o.shopCode || o.shopCode === targetShopCode || targetShopCode === 'A') &&
            !dismissedOrderIds.has(o.id) &&
            !processedOrderIdsRef.current.has(o.id)
        );
        setPendingOrders(awaiting);
      } catch (e) {
        // Safe fallback
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 1200);

    // Live Server-Sent Events for 0ms latency desktop popup
    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/orders/live');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'order_created' || data.type === 'order_updated' || data.type === 'order_approved') {
              if (isMounted) checkPending();
            }
          } catch {}
        };
      } catch {}
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [dismissedOrderIds]);

  const currentOrder = pendingOrders[0];

  // Trigger Audio Alert, Notification, and Wake Lock when an order appears
  useEffect(() => {
    if (!currentOrder) {
      document.title = 'Smart QR Print';
      releaseScreenWakeLock();
      return;
    }

    // Keep screen awake while order is pending
    requestScreenWakeLock();

    // Vibrate if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 100, 300]);
      } catch (e) {}
    }

    // Immediate sound alert
    playOrderChime();

    // Repeat chime every 4 seconds until owner verifies
    const chimeTimer = setInterval(() => {
      playOrderChime();
    }, 4000);

    // Desktop browser notification if permission granted
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      lastAlertedOrderId.current !== currentOrder.id
    ) {
      try {
        new Notification('🔔 नया प्रिंट अनुरोध आया!', {
          body: `ऑर्डर #${currentOrder.orderNumber} - स्वीकार करें व प्रिंट निकालें`,
          icon: '/favicon.ico',
        });
        lastAlertedOrderId.current = currentOrder.id;
      } catch (e) {}
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) {}
    }

    // Flashing tab title alert
    let toggle = false;
    const originalTitle = document.title;
    const titleTimer = setInterval(() => {
      document.title = toggle
        ? `🚨 नया प्रिंट अनुरोध: #${currentOrder.orderNumber}`
        : `🔔 Smart QR Print - प्रिंट स्वीकार करें`;
      toggle = !toggle;
    }, 1000);

    return () => {
      clearInterval(chimeTimer);
      clearInterval(titleTimer);
      document.title = originalTitle;
      releaseScreenWakeLock();
    };
  }, [currentOrder?.id]);

  if (!currentOrder) return null;

  const handleAcceptAndPrint = async () => {
    if (!currentOrder) return;
    const orderToApprove = currentOrder;
    setIsProcessing(true);
    markOrderAsProcessed(orderToApprove.id);
    try {
      const approved = await api.approvePayment(
        orderToApprove.id,
        'cash',
        'Shop Owner',
        orderToApprove.paymentTxnId || undefined
      );

      const completedOrder = await api.updateOrderStatus(orderToApprove.id, {
        printStatus: 'completed',
        completedAt: new Date().toISOString(),
      });

      // Trigger browser's native print dialog for the documents
      if (orderToApprove.items && orderToApprove.items.length > 0) {
        for (const it of orderToApprove.items) {
          const doc = it.document;
          const fileUrl = doc.storagePath || doc.previewUrl;
          if (fileUrl) {
            await triggerBrowserPrintDialog(fileUrl, doc.mimeType, doc.originalFileName);
          }
        }
      }

      if (approved && onOrderApproved) {
        onOrderApproved(approved);
      }
    } catch (err) {
      console.error('Failed to accept and print:', err);
    } finally {
      setIsProcessing(false);
      if (typeof window !== 'undefined' && window.location.search.includes('popup=true')) {
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 1200);
      }
    }
  };

  const handleReject = async () => {
    if (!currentOrder) return;
    const orderToReject = currentOrder;
    setIsProcessing(true);
    markOrderAsProcessed(orderToReject.id);
    try {
      await api.updateOrderStatus(orderToReject.id, {
        paymentStatus: 'failed',
        printStatus: 'cancelled',
        failureReason: 'दुकानदार द्वारा अस्वीकृत (Rejected by Shopkeeper)',
      });
    } finally {
      setIsProcessing(false);
      if (typeof window !== 'undefined' && window.location.search.includes('popup=true')) {
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 500);
      }
    }
  };

  const firstDoc = currentOrder.items[0]?.document;
  const isFirstDocPdf =
    firstDoc &&
    (firstDoc.mimeType === 'application/pdf' || firstDoc.originalFileName.toLowerCase().endsWith('.pdf'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-emerald-500 overflow-hidden transform animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 sm:px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl animate-bounce">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                🔔 नया प्रिंट अनुरोध (New Print Request)
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                ग्राहक ने दस्तावेज प्रिंट के लिए भेजा है • स्वीकार करें
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-2.5 py-1 rounded-xl bg-black/30 hover:bg-black/50 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                title="एडमिन पैनल खोलें"
              >
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                <span>एडमिन</span>
              </button>
            )}
            <button
              onClick={() => setDismissedOrderIds((prev) => new Set(prev).add(currentOrder.id))}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
              title="Dismiss Alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Order Details & Document Preview */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Order Header Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ऑर्डर नंबर • शॉप कोड
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 font-mono">
                  {currentOrder.orderNumber}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-black">
                  कोड: {currentOrder.shopCode || 'A'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                कुल फाइलें
              </span>
              <span className="text-sm font-black text-slate-800">
                {currentOrder.items.length} दस्तावेज
              </span>
            </div>
          </div>

          {/* DOCUMENT PREVIEW CARD */}
          {firstDoc && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                <span className="truncate max-w-[240px] text-slate-900">• {firstDoc.originalFileName}</span>
                {firstDoc.previewUrl && (
                  <a
                    href={firstDoc.storagePath || firstDoc.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>बड़ी फाइल देखें</span>
                  </a>
                )}
              </div>

              {/* Visual preview */}
              <div className="relative bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2 min-h-[140px] max-h-[220px] overflow-hidden">
                {firstDoc.previewUrl && !isFirstDocPdf ? (
                  <img
                    src={firstDoc.previewUrl}
                    alt={firstDoc.originalFileName}
                    className="max-h-[200px] w-auto max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-1 text-slate-600">
                    <FileText className="w-10 h-10 text-rose-500" />
                    <span className="text-xs font-bold text-slate-800">{firstDoc.originalFileName}</span>
                    <span className="text-[11px] text-slate-500">
                      PDF • {firstDoc.pageCount || 1} पृष्ठ
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons: 1-Click Accept & Open Print Dialog OR Reject */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleAcceptAndPrint}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/30 active:scale-95 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-5 h-5 text-white" />
              <span>✓ स्वीकार करें और प्रिंट डायलॉग खोलें (Accept & Print)</span>
            </button>

            <p className="text-[11px] text-slate-500 text-center">
              स्वीकार करते ही कंप्यूटर पर प्रिंट डायलॉग बॉक्स खुलेगा, जहाँ आप मनचाही सेटिंग करके प्रिंट निकाल सकते हैं।
            </p>
          </div>

          {/* Reject Option */}
          <div className="pt-1 text-center">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleReject}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 py-1 transition cursor-pointer"
            >
              अस्वीकार करें (Reject Request)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
