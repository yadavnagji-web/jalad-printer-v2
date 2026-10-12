import React, { useState, useEffect } from 'react';
import {
  Printer,
  AlertCircle,
  CheckCircle2,
  X,
  Play,
  RotateCcw,
  Clock,
  Layers,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { CustomerOrder, PrinterConfig } from '../types';
import { api } from '../services/api';
import { autoPrintOrder } from '../utils/silentPrinter';

interface PrinterQueueTaskbarWidgetProps {
  onOrderUpdated?: () => void;
}

export const PrinterQueueTaskbarWidget: React.FC<PrinterQueueTaskbarWidgetProps> = ({
  onOrderUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dueOrders, setDueOrders] = useState<CustomerOrder[]>([]);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Poll & SSE for queued print jobs
  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

    const fetchQueue = async () => {
      try {
        const [allOrders, allPrinters] = await Promise.all([
          api.getOrders(),
          api.getPrinters().catch(() => []),
        ]);
        if (!isMounted) return;

        setPrinters(allPrinters);

        // Filter orders that are paid and awaiting printing (due / queued)
        const queued = allOrders.filter(
          (o) =>
            o.paymentStatus === 'paid' &&
            (o.printStatus === 'queued' || o.printStatus === 'downloading' || o.printStatus === 'printing')
        );
        setDueOrders(queued);
      } catch {}
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 2000);

    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/orders/live');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'order_approved' || data.type === 'order_updated') {
              fetchQueue();
            }
          } catch {}
        };
      } catch {}
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  const defaultPrinter = printers.find((p) => p.status === 'online') || printers[0] || {
    id: 'default-system-printer',
    name: 'Windows Default System Printer',
    status: 'online',
    supportedColor: true,
  };

  const isPrinterOnline = defaultPrinter.status === 'online';

  const handlePrintSingle = async (order: CustomerOrder) => {
    setIsProcessing(true);
    try {
      await autoPrintOrder(order);
      // Mark as completed
      await api.updateOrderStatus(order.id, { printStatus: 'completed', completedAt: new Date().toISOString() });
      setDueOrders((prev) => prev.filter((o) => o.id !== order.id));
      if (onOrderUpdated) onOrderUpdated();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintAll = async () => {
    if (dueOrders.length === 0) return;
    setIsProcessing(true);
    try {
      for (const order of dueOrders) {
        await autoPrintOrder(order);
        await api.updateOrderStatus(order.id, { printStatus: 'completed', completedAt: new Date().toISOString() });
      }
      setDueOrders([]);
      if (onOrderUpdated) onOrderUpdated();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setIsProcessing(true);
    try {
      await api.updateOrderStatus(orderId, {
        printStatus: 'cancelled',
        failureReason: 'दुकानदार द्वारा रद्द किया गया (Cancelled from Printer Queue)',
      });
      setDueOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (onOrderUpdated) onOrderUpdated();
    } finally {
      setIsProcessing(false);
    }
  };

  // Only render when there are due orders awaiting printing
  if (dueOrders.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end animate-in fade-in select-none">
      {/* Expanded Queue Drawer */}
      {isOpen && (
        <div className="mb-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border-2 border-slate-300 overflow-hidden text-slate-900 animate-in zoom-in-95">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-xl ${isPrinterOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400 animate-pulse'}`}>
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-tight flex items-center gap-1.5">
                  <span>प्रिंटर कतार (Due Print Queue)</span>
                  <span className={`w-2 h-2 rounded-full ${isPrinterOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                </h4>
                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                  {defaultPrinter.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 space-y-3 max-h-80 overflow-y-auto text-xs">
            {/* Status notice */}
            {!isPrinterOnline && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
                <span>प्रिंटर कंप्यूटर पर लाइव नहीं है! कृपया प्रिंटर ऑन/कनेक्ट करें।</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="font-bold text-slate-700">
                कुल बकाया / ड्यू प्रिंट: <strong className="text-blue-600">{dueOrders.length}</strong>
              </span>

              {dueOrders.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePrintAll}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>सभी प्रिंट करें</span>
                </button>
              )}
            </div>

            {/* List of due orders */}
            {dueOrders.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs">
                कोई ड्यू प्रिंट नहीं है (Queue Empty ✓)
              </div>
            ) : (
              <div className="space-y-2">
                {dueOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-slate-900">
                        #{ord.orderNumber}
                      </span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                        ₹{ord.totalAmount.toFixed(2)} (Paid)
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between truncate">
                          <span className="truncate max-w-[160px]">• {it.document.originalFileName}</span>
                          <span className="font-semibold text-slate-800">
                            {it.config.colorMode === 'color' ? 'Color' : 'B&W'} × {it.config.copies}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1 flex items-center justify-end gap-1.5 border-t border-slate-200">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleCancelOrder(ord.id)}
                        className="px-2 py-1 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-[10px] font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>रद्द करें</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handlePrintSingle(ord)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition flex items-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>प्रिंट निकालें</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtle Tray Printer Icon (Shown only when print orders are due) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xl border-2 border-amber-400 ring-4 ring-amber-400/30 transition active:scale-95 cursor-pointer group flex items-center justify-center"
        title={`${dueOrders.length} प्रिंट ड्यू हैं - क्लिक करके सभी देखें`}
      >
        <div className="relative">
          <Printer className="w-6 h-6 text-amber-400 group-hover:scale-110 transition" />
          <span
            className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
              isPrinterOnline ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
            }`}
          />
        </div>
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
          {dueOrders.length}
        </span>
      </button>
    </div>
  );
};
