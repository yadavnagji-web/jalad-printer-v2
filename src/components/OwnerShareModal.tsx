import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  MessageSquare,
  Users,
  CheckCircle2,
  ExternalLink,
  Store,
} from 'lucide-react';
import { ShopSettings } from '../types';

interface OwnerShareModalProps {
  settings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerShareModal: React.FC<OwnerShareModalProps> = ({
  settings,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = settings.shopCode || 'A';
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}?mode=new_shopkeeper&ref=${currentCode}`
      : `https://smartqrprint.in?mode=new_shopkeeper&ref=${currentCode}`;

  const shareText = `नमस्ते! Smart QR Print ऐप से अपनी दुकान या ई-मित्र सेंटर पर ऑनलाइन QR डॉक्यूमेंट प्रिंटिंग शुरू करें। पंजीकरण लिंक (रेफरल ${currentCode}): ${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-5 sm:p-6 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2 backdrop-blur-xs">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight">
            दुकानदार शेयर लिंक (Share with Other Shopkeepers)
          </h3>
          <p className="text-xs text-blue-100 font-medium mt-0.5">
            अन्य दुकानदारों को जोड़ें • उनका रजिस्ट्रेशन आपके एडमिन में दिखेगा
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Instructions Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                <span>दूसरे दुकानदार को ऐप शेयर करें:</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-black">
                आपका कोड: {currentCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              इस शेयर लिंक से जो भी नया दुकानदार जुड़ेगा, उसे स्वतः क्रमशः <strong>A1, A2, A3...</strong> शॉप कोड मिलेगा। उस दुकानदार के ग्राहक द्वारा दिया गया प्रिंट कमांड सीधे उसी के रिलेटेड डेस्कटॉप पर जाएगा!
            </p>
          </div>

          {/* Share Link Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              दुकानदार पंजीकरण लिंक (Shopkeeper Invite URL):
            </label>
            <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-300">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs font-mono text-slate-800 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shrink-0 flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'कॉपी!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Direct Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>व्हाट्सएप पर शेयर करें (Share on WhatsApp)</span>
          </button>

          {/* Info pill */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>
              पंजीकृत दुकानदारों का रिकॉर्ड आपके Admin → "पंजीकृत दुकानदार" में दिखेगा
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
