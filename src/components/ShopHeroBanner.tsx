import React from 'react';
import {
  Printer,
  Store,
  Phone,
  MessageSquare,
  Clock,
  QrCode,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Zap,
  User,
} from 'lucide-react';
import { ShopSettings } from '../types';

interface ShopHeroBannerProps {
  settings: ShopSettings;
  language: 'hi' | 'en';
  onOpenUserQr: () => void;
  onOpenOwnerShare: () => void;
  onScrollToUpload: () => void;
}

export const ShopHeroBanner: React.FC<ShopHeroBannerProps> = ({
  settings,
  language,
  onOpenUserQr,
  onOpenOwnerShare,
  onScrollToUpload,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-8 border border-blue-900/40 shadow-xl">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Information Column */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Smart QR Print • ई-मित्र & फोटोकॉपी केंद्र</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>हाई-स्पीड प्रिंटिंग सक्रिय</span>
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              {settings.shopName}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 font-medium flex items-center gap-1.5">
              <Store className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{settings.shopAddress}</span>
            </p>
          </div>

          {/* Contact Details & Quick Badges */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
            <a
              href={`tel:${settings.mobileNumber}`}
              className="flex items-center gap-1.5 hover:text-white transition font-medium"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{settings.mobileNumber}</span>
            </a>

            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition font-medium text-emerald-400"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Support: {settings.whatsappNumber}</span>
            </a>

            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{settings.openingHours}</span>
            </span>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onScrollToUpload}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>दस्तावेज प्रिंट करें (Upload Now)</span>
            </button>

            <button
              type="button"
              onClick={onOpenUserQr}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 border border-white/10 transition"
              title="ग्राहक ऐप QR कोड"
            >
              <QrCode className="w-4 h-4 text-blue-400" />
              <span>ग्राहक ऐप QR</span>
            </button>

            <button
              type="button"
              onClick={onOpenOwnerShare}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-1.5 border border-slate-700 transition"
              title="दुकानदार शेयर लिंक"
            >
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>दुकानदार शेयर</span>
            </button>
          </div>
        </div>

        {/* Right Column: Owner Photo OR Printer Graphic */}
        <div className="md:col-span-4 flex justify-center md:justify-end">
          {settings.ownerPhotoUrl ? (
            /* OWNER PHOTO UPLOAD DISPLAY (Replaces printer image if uploaded) */
            <div className="relative group">
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl overflow-hidden border-4 border-blue-500/40 shadow-2xl bg-slate-800 ring-8 ring-blue-500/10">
                <img
                  src={settings.ownerPhotoUrl}
                  alt="Shop Owner"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3">
                  <div className="text-left">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                      <User className="w-3 h-3" /> दुकान संचालक
                    </span>
                    <span className="block text-xs font-bold text-white mt-0.5 truncate max-w-[160px]">
                      {settings.shopName.split('&')[0] || 'Shop Owner'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* DEFAULT HIGH-TECH PRINTER GRAPHIC (Shown when no owner photo uploaded) */
            <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl max-w-[240px] w-full text-center">
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3 animate-pulse">
                <Printer className="w-12 h-12 text-white" />
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                  Active
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                Epson & HP Connected
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                EcoTank L8050 Colour & HP LaserJet High-Speed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
