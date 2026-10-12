import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X, Copy, ExternalLink, Check, QrCode } from 'lucide-react';
import { ShopSettings } from '../types';

interface CustomerQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
}

export const CustomerQrModal: React.FC<CustomerQrModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const customerAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?role=customer`
      : 'http://localhost:3000/?role=customer';

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(customerAppUrl, {
      width: 280,
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

  const copyUrl = () => {
    navigator.clipboard.writeText(customerAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                ग्राहक मोबाइल ऐप (Customer App)
              </h3>
              <p className="text-xs text-blue-100">
                {settings.shopName || 'Smart QR Print'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 inline-block">
              📱 फोन से स्कैन करें
            </span>
            <h4 className="text-sm font-bold text-slate-800 pt-1">
              ग्राहक अपने मोबाइल कैमरे से यह QR स्कैन करें
            </h4>
            <p className="text-xs text-slate-500">
              स्कैन करते ही ग्राहक के फोन में प्रिंट ऐप खुल जाएगी, जहां से वे दस्तावेज अपलोड कर नकद/QR से भुगतान करेंगे।
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Customer App QR"
                className="w-52 h-52 object-contain mx-auto rounded-xl"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center">
                <QrCode className="w-10 h-10 animate-pulse text-slate-400" />
              </div>
            )}
          </div>

          {/* Direct URL copy & open */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
              <span className="truncate flex-1 text-left">{customerAppUrl}</span>
              <button
                type="button"
                onClick={copyUrl}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-sans font-bold text-blue-600 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={customerAppUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>नए टैब में खोलें</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
