import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Share2,
  Copy,
  Printer,
  Smartphone,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { ShopSettings } from '../types';

interface UserAppQrModalProps {
  settings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const UserAppQrModal: React.FC<UserAppQrModalProps> = ({
  settings,
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const currentShopCode = settings.shopCode || 'A';
  const customerAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?shop=${currentShopCode}&src=customer_qr`
      : `https://smartqrprint.in/?shop=${currentShopCode}&src=customer_qr`;

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(customerAppUrl, {
      width: 400,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [isOpen, customerAppUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customerAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Scan-To-Print-QR-${settings.shopName.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 sm:p-6 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2 backdrop-blur-xs">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight">
            ग्राहक ऐप QR कोड (Customer Scan & Print QR)
          </h3>
          <p className="text-xs text-blue-100 font-medium mt-0.5">
            काउंटर पर लगाएं • ग्राहक स्कैन करके सीधे प्रिंट कर सकेंगे
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-center">
          {/* Shop Header Details */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h4 className="text-sm font-black text-slate-900">
                {settings.shopName}
              </h4>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-black">
                कोड: {currentShopCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              {settings.shopAddress}
            </p>
            <p className="text-[11px] text-blue-600 font-bold">
              WhatsApp / Mobile: {settings.whatsappNumber}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-4 bg-white rounded-3xl shadow-lg border-2 border-blue-500/30 ring-8 ring-blue-50">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Customer Scan to Print QR"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400">
                  QR Generating...
                </div>
              )}
            </div>
            <span className="mt-2 text-xs font-bold text-slate-800">
              📱 फोन कैमरा या स्कैनर से सीधे स्कैन करें
            </span>
          </div>

          {/* User Instructions & PWA Install Notice */}
          <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-left space-y-2 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>सीधे मोबाइल में चलेगा और ऐप भी इंस्टॉल हो जाएगा!</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              • ग्राहक को कोई ऐप डाउनलोड करने का झंझट नहीं, QR स्कैन करते ही वेब ऐप खुल जाएगा।
              <br />
              • ग्राहक चाहें तो फोन में <strong>"Add to Home Screen"</strong> या <strong>"Install App"</strong> बटन पर क्लिक करके इसे परमानेंट ऐप भी बना सकते हैं।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>QR इमेज डाउनलोड</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Copy className="w-4 h-4 text-blue-600" />
              <span>{copiedLink ? 'लिंक कॉपी हो गया!' : 'ऐप लिंक कॉपी करें'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
