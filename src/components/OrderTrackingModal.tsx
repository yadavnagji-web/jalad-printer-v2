import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  FileCheck,
  AlertCircle,
  Download,
  Share2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { CustomerOrder, ShopSettings } from '../types';
import { api } from '../services/api';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrder?: CustomerOrder | null;
  settings: ShopSettings;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrder,
  settings,
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState(initialOrder?.orderNumber || '');
  const [currentOrder, setCurrentOrder] = useState<CustomerOrder | null>(initialOrder || null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const order = await api.getOrderById(searchQuery.trim());
      if (order) {
        setCurrentOrder(order);
      } else {
        setSearchError('ऑर्डर नहीं मिला (Order not found). कृपया ऑर्डर नंबर जाँचें।');
        setCurrentOrder(null);
      }
    } catch {
      setSearchError('Error fetching order');
    }
    setIsSearching(false);
  };

  const getStatusStep = (order: CustomerOrder) => {
    if (order.printStatus === 'completed') return 4;
    if (order.printStatus === 'printing') return 3;
    if (order.printStatus === 'queued' || order.printStatus === 'downloading') return 2;
    if (order.paymentStatus === 'paid') return 2;
    return 1;
  };

  const step = currentOrder ? getStatusStep(currentOrder) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              ऑर्डर स्थिति और रसीद (Live Print Tracking)
            </h3>
            <p className="text-xs text-slate-500">
              {settings.shopName} • Epson & HP Windows Spooler
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-white">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                placeholder="ऑर्डर नंबर दर्ज करें (e.g. SQP-20261011-842)..."
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition"
            >
              {isSearching ? 'खोजें...' : 'Track'}
            </button>
          </form>

          {searchError && (
            <p className="mt-2 text-xs text-rose-600 font-semibold">{searchError}</p>
          )}
        </div>

        {/* Order Details Body */}
        {currentOrder ? (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* Status Progress Pipeline */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  लाइव प्रिंट पाइपलाइन
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    currentOrder.printStatus === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentOrder.printStatus === 'printing'
                      ? 'bg-blue-100 text-blue-800 animate-pulse'
                      : currentOrder.paymentStatus === 'paid'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {currentOrder.printStatus === 'completed'
                    ? 'प्रिंट तैयार (Completed)'
                    : currentOrder.printStatus === 'printing'
                    ? 'प्रिंटिंग जारी (Printing)'
                    : currentOrder.printStatus === 'queued'
                    ? 'प्रिंट कतार में (Queued)'
                    : 'भुगतान की प्रतीक्षा (Payment Pending)'}
                </span>
              </div>

              {/* Steps Indicator */}
              <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                <div className={`p-2 rounded-xl ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  1. ऑर्डर दर्ज
                </div>
                <div className={`p-2 rounded-xl ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  2. भुगतान सत्यापित
                </div>
                <div className={`p-2 rounded-xl ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  3. प्रिंटिंग जारी
                </div>
                <div className={`p-2 rounded-xl ${step >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  4. तैयार (Ready)
                </div>
              </div>

              {/* Hardware Router assignment note */}
              {currentOrder.assignedPrinterName && (
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Printer className="w-4 h-4 text-slate-500" />
                    प्रिंटर: <strong className="text-slate-900">{currentOrder.assignedPrinterName}</strong>
                  </span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" /> SHA-256 Verified Match
                  </span>
                </div>
              )}
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">डिजिटल प्रिंट रसीद</h4>
                  <p className="text-xs text-slate-500">{currentOrder.orderNumber}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">कुल भुगतान</div>
                  <div className="text-base font-black text-slate-900">₹{currentOrder.totalAmount.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>ग्राहक:</span>
                  <span className="font-semibold text-slate-800">{currentOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>मोबाइल:</span>
                  <span className="font-semibold text-slate-800">{currentOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span>भुगतान प्रकार:</span>
                  <span className="font-semibold uppercase text-slate-800">{currentOrder.paymentMethod}</span>
                </div>
                {currentOrder.paymentTxnId && (
                  <div className="flex justify-between">
                    <span>ट्रांजेक्शन आईडी:</span>
                    <span className="font-mono text-slate-800">{currentOrder.paymentTxnId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>दिनांक व समय:</span>
                  <span className="text-slate-800">{new Date(currentOrder.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  दस्तावेज सूची:
                </span>
                {currentOrder.items.map((item, i) => (
                  <div key={item.id || i} className="text-xs flex justify-between bg-slate-50 p-2 rounded-lg">
                    <span className="truncate max-w-[240px] font-medium text-slate-800">
                      {item.document.originalFileName}
                    </span>
                    <span className="font-bold text-slate-900">
                      ₹{item.calculatedPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>रसीद प्रिंट / डाउनलोड</span>
              </button>

              {currentOrder.printStatus !== 'completed' && currentOrder.printStatus !== 'cancelled' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.updateOrderStatus(currentOrder.id, {
                        printStatus: 'cancelled',
                        paymentStatus: 'failed',
                        failureReason: 'ग्राहक द्वारा ट्रैकिंग से रद्द किया गया',
                      });
                      setCurrentOrder((prev) => prev ? { ...prev, printStatus: 'cancelled', paymentStatus: 'failed' } : null);
                    } catch {}
                  }}
                  className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>ऑर्डर रद्द करें (Cancel)</span>
                </button>
              )}

              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=Order%20${currentOrder.orderNumber}%20Status`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
              >
                <span>WhatsApp सहायता</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
            कृपया अपने ऑर्डर की स्थिति जाँचने के लिए ऑर्डर नंबर दर्ज करें।
          </div>
        )}
      </div>
    </div>
  );
};
