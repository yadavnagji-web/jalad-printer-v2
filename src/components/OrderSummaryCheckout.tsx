import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Loader2,
  Copy,
  Receipt,
  FileCheck,
  ExternalLink,
  Link as LinkIcon,
  Image as ImageIcon,
  Maximize2,
  X,
  Clock,
} from 'lucide-react';
import { CustomerOrder, OrderItem, PricingSettings, ShopSettings } from '../types';
import { api } from '../services/api';

interface OrderSummaryCheckoutProps {
  items: OrderItem[];
  pricing: PricingSettings;
  settings: ShopSettings;
  language: 'hi' | 'en';
  onOrderCompleted: (order: CustomerOrder) => void;
  onBackToEdit: () => void;
}

export const OrderSummaryCheckout: React.FC<OrderSummaryCheckoutProps> = ({
  items,
  pricing,
  settings,
  language,
  onOrderCompleted,
  onBackToEdit,
}) => {
  const [customerName] = useState('Walk-in Customer');
  const [customerPhone] = useState('Counter');
  const [confirmedPreservation] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'upi_intent' | 'gateway_razorpay' | 'counter_cash'>('upi_qr');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [activeQrTab, setActiveQrTab] = useState<'dynamic' | 'custom'>(
    settings.qrDisplayMode === 'custom_uploaded' && settings.customQrImageUrl ? 'custom' : 'dynamic'
  );
  const [customerUtrNumber, setCustomerUtrNumber] = useState('');
  const [isZoomQr, setIsZoomQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customPaymentLinkInput, setCustomPaymentLinkInput] = useState(settings.customPaymentLink || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<CustomerOrder | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const [awaitingOrder, setAwaitingOrder] = useState<CustomerOrder | null>(null);

  // Poll & SSE for instant owner approval when waiting for QR or Cash approval
  useEffect(() => {
    if (!isAwaitingApproval || !awaitingOrder) return;
    let isCancelled = false;
    let eventSource: EventSource | null = null;

    const checkApproval = async () => {
      try {
        const check = await api.getOrderById(awaitingOrder.id);
        if (isCancelled || !check) return;
        if (check.paymentStatus === 'paid') {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          setIsAwaitingApproval(false);
          onOrderCompleted(check);
        }
      } catch (e) {
        // Safe retry
      }
    };

    const interval = setInterval(checkApproval, 1200);

    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/orders/live');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'order_approved' && data.data?.id === awaitingOrder.id) {
              checkApproval();
            }
          } catch {}
        };
      } catch {}
    }

    return () => {
      isCancelled = true;
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [isAwaitingApproval, awaitingOrder?.id, onOrderCompleted]);

  // Compute subtotal and total
  const subtotal = items.reduce((sum, item) => sum + item.calculatedPrice, 0);
  const totalAmount = pricing.minOrderAmount && pricing.minOrderAmount > 0
    ? Math.max(pricing.minOrderAmount, subtotal + (pricing.serviceCharge || 0))
    : subtotal + (pricing.serviceCharge || 0);

  // Generate unique order number
  const [orderNumber] = useState(
    () => `SQP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Generate dynamic NPCI standard UPI URI
  const upiId = settings.shopUpiId || '8696312384@upi';
  const shopName = settings.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI';
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${orderNumber}`;

  useEffect(() => {
    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setUpiQrDataUrl)
      .catch(console.error);
  }, [upiUri]);

  const handlePlaceOrderAndPay = async (simulateDirectSuccess = false) => {
    if (!confirmedPreservation) {
      setErrorMsg(
        language === 'hi'
          ? 'कृपया दस्तावेज प्रीव्यू और मूल प्रति संरक्षण की पुष्टि करें।'
          : 'Please confirm document preview and original preservation notice.'
      );
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const newOrder: CustomerOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '9876543210',
      items,
      subtotal,
      tax: 0,
      totalAmount,
      paymentStatus: paymentMethod === 'gateway_razorpay' ? 'paid' : 'counter_pending',
      paymentMethod,
      paymentTxnId: customerUtrNumber || (paymentMethod === 'gateway_razorpay' ? `GW-${Date.now()}` : null),
      paidAt: paymentMethod === 'gateway_razorpay' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      printStatus: paymentMethod === 'gateway_razorpay' ? 'queued' : 'pending_payment',
      assignedPrinterId: null,
      assignedPrinterName: null,
      retryCount: 0,
      failureReason: null,
      completedAt: null,
      verifiedHashMatch: true,
    };

    try {
      const created = await api.createOrder(newOrder);
      setActiveOrder(created);

      // 1. If Online Gateway: Auto process immediately without owner intervention!
      if (paymentMethod === 'gateway_razorpay') {
        const txnId = customerUtrNumber || `GW-${Date.now()}`;
        const paid = await api.verifyPayment(created.id, txnId, 'gateway_razorpay');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setIsProcessing(false);
        onOrderCompleted(paid || created);
        return;
      }

      // 2. If UPI QR or Cash: Request Owner Approval popup on shopkeeper's screen
      setAwaitingOrder(created);
      setIsAwaitingApproval(true);
      setIsProcessing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment initiation failed');
      setIsProcessing(false);
    }
  };

  const handleSimulatePaymentWebhook = async () => {
    await handlePlaceOrderAndPay();
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // RENDER WAITING CARD IF WAITING FOR SHOP OWNER POPUP APPROVAL
  if (isAwaitingApproval && awaitingOrder) {
    return (
      <div className="max-w-xl mx-auto p-6 sm:p-8 bg-white rounded-3xl border-2 border-amber-300 shadow-xl text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            दुकानदार से पुष्टि की प्रतीक्षा (Awaiting Shopkeeper Approval)
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-2">
            ऑर्डर #{awaitingOrder.orderNumber}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            कुल बिल: <strong className="text-slate-900 text-base">₹{awaitingOrder.totalAmount.toFixed(2)}</strong>
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800">
            🔔 दुकानदार की स्क्रीन पर भुगतान का पॉप-अप भेजा गया है।
          </p>
          <p>
            दुकानदार जैसे ही <strong>"Online UPI"</strong> या <strong>"Cash"</strong> चुनेंगे, आपका प्रिंटर से प्रिंट तुरंत शुरू हो जाएगा।
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>सत्यापन की जाँच हो रही है (Live Polling & SSE)...</span>
        </div>

        {/* Cancel Order Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                if (awaitingOrder) {
                  await api.updateOrderStatus(awaitingOrder.id, {
                    paymentStatus: 'failed',
                    printStatus: 'cancelled',
                    failureReason: 'ग्राहक द्वारा रद्द किया गया (Cancelled by Customer)',
                  });
                }
              } catch {}
              setIsAwaitingApproval(false);
              setAwaitingOrder(null);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <X className="w-4 h-4 text-rose-600" />
            <span>❌ ऑर्डर रद्द करें (Cancel Print Order)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAwaitingApproval(false)}
            className="text-xs text-slate-400 hover:text-slate-600 underline py-1"
          >
            वापस जाएं (Back)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            {language === 'hi' ? 'ऑर्डर सारांश और भुगतान' : 'Order Review & Payment'}
          </h2>
          <p className="text-xs text-slate-500">Order Ref: {orderNumber}</p>
        </div>
        <button
          onClick={onBackToEdit}
          className="text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          {language === 'hi' ? '← फाइलें बदलें' : '← Edit Files'}
        </button>
      </div>

      {/* Item Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-700">
          <span>दस्तावेज (Document)</span>
          <span>विकल्प & मूल्य (Options & Price)</span>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item, idx) => {
            const isPdf = item.document.mimeType === 'application/pdf' || item.document.originalFileName.toLowerCase().endsWith('.pdf');
            return (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Visual Document Preview Thumbnail */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center">
                    {item.document.previewUrl && !isPdf ? (
                      <img
                        src={item.document.previewUrl}
                        alt={item.document.originalFileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileCheck className="w-6 h-6 text-blue-600" />
                    )}
                    {isPdf && (
                      <span className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl text-[8px] font-bold bg-rose-600 text-white">
                        PDF
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{item.document.originalFileName}</div>
                    <div className="text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700">{item.config.paperSize}</span>
                      <span>•</span>
                      <span>{item.config.colorMode === 'color' ? 'रंगीन (Colour)' : 'Black & White'}</span>
                      <span>•</span>
                      <span>{item.pageCountToPrint} पृष्ठ × {item.config.copies} प्रति</span>
                      <span>•</span>
                      <span>{item.config.duplex ? 'Both Sides' : 'Single Side'}</span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-emerald-700">
                      SHA-256: {item.document.sha256Hash.substring(0, 14)}...
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-sm text-slate-900">₹{item.calculatedPrice.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Subtotal, Surcharge, Total */}
        <div className="bg-slate-50/80 p-4 border-t border-slate-200/80 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>उप-योग (Subtotal):</span>
            <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
          </div>
          {pricing.serviceCharge > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>सेवा शुल्क (Service Fee):</span>
              <span className="font-semibold">₹{pricing.serviceCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>कुल देय राशि (Total Amount):</span>
            <span className="text-blue-700">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Direct One-Click Cash / Online Payment Trigger Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-4 sm:p-5 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
            Fast Print Checkout
          </span>
          <h3 className="text-base sm:text-lg font-black mt-1">
            {language === 'hi' ? 'प्रिंट ऑर्डर दर्ज करें' : 'Place Print Order'}
          </h3>
          <p className="text-xs text-blue-100">
            {language === 'hi'
              ? 'कैश या ऑनलाइन UPI चुनें • 1 क्लिक में ऑर्डर दर्ज होगा'
              : 'Choose Cash or Online UPI with instant counter verification'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handlePlaceOrderAndPay()}
          disabled={isProcessing}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-black/20 active:scale-95 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <CreditCard className="w-5 h-5 text-slate-900" />
          <span>{language === 'hi' ? `🖨️ प्रिंट ऑर्डर करें (₹${totalAmount.toFixed(2)})` : `Print Order (₹${totalAmount.toFixed(2)})`}</span>
          <ArrowRight className="w-4 h-4 text-slate-900" />
        </button>
      </div>

      {/* Payment Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
          <span>भुगतान का तरीका (Select Payment Method)</span>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Secure UPI
          </span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setPaymentMethod('upi_qr')}
            className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
              paymentMethod === 'upi_qr'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <QrCode className="w-5 h-5 text-blue-600" />
            <span>UPI QR Scan</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('upi_intent')}
            className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
              paymentMethod === 'upi_intent'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-5 h-5 text-purple-600" />
            <span>UPI App Intent</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('gateway_razorpay')}
            className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
              paymentMethod === 'gateway_razorpay'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span>Online Gateway</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('counter_cash')}
            className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
              paymentMethod === 'counter_cash'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Receipt className="w-5 h-5 text-amber-600" />
            <span>काउंटर नकद (Cash)</span>
          </button>
        </div>

        {/* Mode: Dynamic UPI QR Code */}
        {paymentMethod === 'upi_qr' && (
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            {/* Toggle between Dynamic QR and Uploaded Standee QR if available */}
            {settings.customQrImageUrl && (
              <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => setActiveQrTab('dynamic')}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition ${
                    activeQrTab === 'dynamic'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  स्वचालित राशि QR (₹{totalAmount.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQrTab('custom')}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition ${
                    activeQrTab === 'custom'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  दुकान Standee QR
                </button>
              </div>
            )}

            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-slate-700">
                {activeQrTab === 'custom' && settings.customQrImageUrl
                  ? 'दुकान के स्टैंडी QR कोड को स्कैन करके भुगतान करें'
                  : 'Google Pay, PhonePe, Paytm या BHIM से स्कैन करें'}
              </span>
              <p className="text-[11px] text-slate-500">
                Scan to pay exactly <strong className="text-slate-900 font-bold">₹{totalAmount.toFixed(2)}</strong>
              </p>
            </div>

            {/* QR Image Display */}
            {activeQrTab === 'custom' && settings.customQrImageUrl ? (
              <div className="relative group p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                <img
                  src={settings.customQrImageUrl}
                  alt="Shop Standee QR Code"
                  className="w-56 h-56 object-contain rounded-xl cursor-pointer"
                  onClick={() => setIsZoomQr(true)}
                />
                <button
                  type="button"
                  onClick={() => setIsZoomQr(true)}
                  className="absolute bottom-4 right-4 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                  title="Enlarge QR Code"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            ) : upiQrDataUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                <img src={upiQrDataUrl} alt="Shop UPI QR" className="w-52 h-52 object-contain" />
              </div>
            ) : (
              <div className="w-52 h-52 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* UPI ID copy */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-mono">{upiId}</span>
              <button
                type="button"
                onClick={copyUpiId}
                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copiedUpi ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Optional UTR / Reference Input */}
            <div className="w-full max-w-sm space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 text-left">
                UTR / यूपीआई रेफरेंस नंबर (वैकल्पिक):
              </label>
              <input
                type="text"
                placeholder="12-digit UPI UTR / Ref (e.g. 429381920194)"
                value={customerUtrNumber}
                onChange={(e) => setCustomerUtrNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-1.5 px-3 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Simulated Live Payment Verification button */}
            <div className="w-full pt-2 border-t border-slate-200 text-center space-y-2">
              <button
                type="button"
                onClick={() => handlePlaceOrderAndPay()}
                disabled={isProcessing}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>मैंने ऑनलाइन भुगतान कर दिया है (Confirm ₹{totalAmount.toFixed(2)})</span>
              </button>
              <p className="text-[11px] text-slate-400">
                (दुकानदार के कंप्यूटर/डेस्कटॉप पर अलार्म व पॉप-अप जाएगा)
              </p>
            </div>
          </div>
        )}

        {/* Mode: UPI Intent App Links */}
        {paymentMethod === 'upi_intent' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <p className="text-xs text-slate-600 text-center">
              अपने मोबाइल ऐप पर सीधे भुगतान करने के लिए नीचे दिए गए ऐप पर टैप करें:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <a
                href={upiUri}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-center hover:bg-slate-100 flex items-center justify-center gap-2"
              >
                Google Pay
              </a>
              <a
                href={upiUri}
                className="py-2.5 px-3 rounded-xl bg-purple-600 text-white text-center hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                PhonePe
              </a>
              <a
                href={upiUri}
                className="py-2.5 px-3 rounded-xl bg-blue-500 text-white text-center hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                Paytm
              </a>
              <a
                href={upiUri}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-center hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                BHIM UPI
              </a>
            </div>
            <button
              type="button"
              onClick={handleSimulatePaymentWebhook}
              disabled={!confirmedPreservation || isProcessing}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
            >
              मैंने भुगतान कर दिया है (I have completed payment)
            </button>
          </div>
        )}

        {/* Mode: Payment Gateway Link & Online Checkout */}
        {paymentMethod === 'gateway_razorpay' && (
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="text-center space-y-1">
              <CreditCard className="w-8 h-8 text-blue-600 mx-auto" />
              <h5 className="text-sm font-bold text-slate-800">
                पेमेंट गेटवे लिंक (Payment Gateway Checkout)
              </h5>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Pay ₹{totalAmount.toFixed(2)} directly through the shop's Razorpay, Cashfree, or Paytm merchant gateway link.
              </p>
            </div>

            {/* Custom Payment Gateway Link Box */}
            <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                  पेमेंट गेटवे लिंक (Payment URL):
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                  Secure Gateway
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://rzp.io/l/your_shop_payment_link"
                  value={customPaymentLinkInput}
                  onChange={(e) => setCustomPaymentLinkInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 py-2 px-3 font-mono text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                {customPaymentLinkInput && (
                  <div className="flex gap-1.5">
                    <a
                      href={customPaymentLinkInput}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Link</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(customPaymentLinkInput);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                    >
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                ऊपर दिए गए "Open Link" बटन पर क्लिक करके कार्ड, नेट बैंकिंग या UPI से भुगतान करें।
              </p>
            </div>

            {/* Transaction Reference / UTR Input */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                ट्रांजेक्शन आईडी / पेमेंट रेफरेंस नंबर (Payment Ref ID):
              </label>
              <input
                type="text"
                placeholder="e.g. pay_N294829184 or UTR 429381920194"
                value={customerUtrNumber}
                onChange={(e) => setCustomerUtrNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 px-3 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Confirm Payment and Start Printing */}
            <div className="pt-2 text-center space-y-2">
              <button
                type="button"
                onClick={handleSimulatePaymentWebhook}
                disabled={!confirmedPreservation || isProcessing}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Payment...
                  </span>
                ) : (
                  `गेटवे भुगतान की पुष्टि करें (Confirm ₹${totalAmount.toFixed(2)} Paid)`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mode: Counter Cash */}
        {paymentMethod === 'counter_cash' && (
          <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200 text-center space-y-3">
            <button
              type="button"
              onClick={() => handlePlaceOrderAndPay()}
              disabled={isProcessing}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              <span>नकद भुगतान से प्रिंट करें (Pay Cash ₹{totalAmount.toFixed(2)})</span>
            </button>
            <p className="text-xs text-amber-900">
              बटन दबाते ही दुकानदार के डेस्कटॉप/कंप्यूटर पर अलार्म बजेगा और पॉपअप खुल जाएगा।
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* QR Code Zoom Modal */}
      {isZoomQr && settings.customQrImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsZoomQr(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-slate-900">
              {settings.shopName} — Standee QR Code
            </h4>
            <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={settings.customQrImageUrl}
                alt="Enlarged QR Code"
                className="w-full h-auto object-contain rounded-xl max-h-80 mx-auto"
              />
            </div>
            <div className="text-xs text-slate-600 font-mono bg-slate-100 py-1.5 px-3 rounded-lg">
              UPI: {upiId}
            </div>
            <button
              onClick={() => setIsZoomQr(false)}
              className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              बंद करें (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
