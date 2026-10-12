import React, { useState } from 'react';
import {
  Printer,
  Shield,
  Search,
  Share2,
  Check,
} from 'lucide-react';
import { ShopSettings } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { getEffectiveShopStatus } from '../utils/shopStatus';

interface HeaderProps {
  settings: ShopSettings;
  language: 'hi' | 'en';
  onLanguageToggle: () => void;
  onOpenTracking: () => void;
  onOpenAdmin: () => void;
  isAdmin: boolean;
  currentShopCode?: string;
  isOwnerDevice?: boolean;
  onToggleOwnerDevice?: () => void;
  onOpenDesktopSetup?: () => void;
  onMinimizeToTray?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  language,
  onLanguageToggle,
  onOpenTracking,
  onOpenAdmin,
  isAdmin,
  currentShopCode,
}) => {
  const [copiedAppShare, setCopiedAppShare] = useState(false);
  const clickCountRef = React.useRef(0);
  const clickTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const activeCode =
    currentShopCode ||
    settings.shopCode ||
    (typeof window !== 'undefined' ? localStorage.getItem('sqp_shop_code') : null) ||
    'A';

  const shopStatus = getEffectiveShopStatus(settings);

  const handleSecretLogoClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      onOpenAdmin();
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 1500);
    }
  };

  const handleShareApp = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const shareUrl = `${origin}/?code=${activeCode}`;
    const shareData = {
      title: settings.shopName || 'Smart QR Print',
      text: `${settings.shopName || 'Smart QR Print'} (कोड: ${activeCode}) - अपने मोबाइल से सीधे दस्तावेज और फोटो प्रिंट करें:`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedAppShare(true);
      setTimeout(() => setCopiedAppShare(false), 2500);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Main Bar - Clean, Professional Customer Header */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* Mobile View: Line 1 = Shop Name, Line 2 = Action Buttons */}
        <div className="block sm:hidden space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSecretLogoClick}
              className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition"
              title="Smart QR Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <h1
              onClick={handleSecretLogoClick}
              className="text-sm font-black text-slate-900 truncate tracking-tight flex-1 cursor-pointer select-none"
              title={settings.shopName}
            >
              {settings.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI'}
            </h1>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                shopStatus.isAtShop
                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-300'
                  : 'bg-rose-500/10 text-rose-700 border border-rose-300 animate-pulse'
              }`}
            >
              {shopStatus.isAtShop ? '🟢 ON' : '🔴 बंद'}
            </span>
          </div>

          {/* Line 2: All buttons in single line */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <PWAInstallButton />
              <button
                type="button"
                onClick={onOpenTracking}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition shrink-0"
              >
                <Search className="w-3 h-3 text-slate-500" />
                <span>Track Order</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* User App Share Button - 1 Click Share */}
              <button
                type="button"
                onClick={handleShareApp}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shrink-0 cursor-pointer shadow-xs active:scale-95"
                title="ग्राहक ऐप शेयर करें (Click to Share App)"
              >
                {copiedAppShare ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5 text-white" />}
                <span>{copiedAppShare ? 'कॉपी हुआ ✓' : 'ऐप शेयर'}</span>
              </button>

              <button
                type="button"
                onClick={onLanguageToggle}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition shrink-0"
              >
                {language === 'hi' ? 'EN' : 'हिन्दी'}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition bg-amber-600 text-white shrink-0"
                >
                  <Shield className="w-3 h-3" />
                  <span>Exit Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop / Tablet View */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleSecretLogoClick}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0 cursor-pointer active:scale-95 transition"
              title="Smart QR Print"
            >
              <Printer className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  onClick={handleSecretLogoClick}
                  className="text-base font-black tracking-tight text-slate-900 truncate cursor-pointer select-none"
                  title={settings.shopName}
                >
                  {settings.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI'}
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  Online Print
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  कोड: {activeCode}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                    shopStatus.isAtShop
                      ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-300'
                      : 'bg-rose-500/10 text-rose-700 border border-rose-300 animate-pulse'
                  }`}
                  title={
                    shopStatus.isAtShop
                      ? 'दूकान पर उपस्थित (10 AM - 5 PM या मैन्युअल ON)'
                      : 'दूकान बंद / अनुपस्थित (प्रिंट सेवा बंद)'
                  }
                >
                  {shopStatus.isAtShop ? '🟢 दूकान पर (ON)' : '🔴 बंद (OFF)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {settings.shopAddress || 'VPO CHIKHALI, TEH CHIKHALI, DIST. DUNGARPUR RAJASTHAN'}
              </p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            
            {/* User App Share Button */}
            <button
              type="button"
              onClick={handleShareApp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
              title="ग्राहक ऐप शेयर करें (Click to Share App)"
            >
              {copiedAppShare ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5 text-white" />}
              <span>{copiedAppShare ? 'लिंक कॉपी हुआ ✓' : (language === 'hi' ? 'ऐप शेयर करें' : 'Share App')}</span>
            </button>

            <button
              onClick={onOpenTracking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'hi' ? 'ऑर्डर ट्रैक करें' : 'Track Order'}</span>
            </button>
            <button
              onClick={onLanguageToggle}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              {language === 'hi' ? 'EN' : 'हिन्दी'}
            </button>
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition bg-amber-600 text-white shadow-xs hover:bg-amber-700 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Exit Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
