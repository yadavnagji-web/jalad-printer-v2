import React, { useState, useEffect } from 'react';
import {
  Printer,
  Maximize2,
  Volume2,
  Sun,
  Laptop,
  CheckCircle,
  Copy,
  ExternalLink,
  Power,
  Shield,
  HelpCircle,
  X,
  Download,
} from 'lucide-react';
import { ShopSettings } from '../types';
import { playOrderChime } from '../utils/audioAlert';
import { requestScreenWakeLock } from '../utils/wakeLock';
import { downloadSetupFile } from '../utils/downloadHelper';

interface OwnerBackgroundMonitorProps {
  settings: ShopSettings;
  onMaximize: () => void;
  onExit: () => void;
}

export const OwnerBackgroundMonitor: React.FC<OwnerBackgroundMonitorProps> = ({
  settings,
  onMaximize,
  onExit,
}) => {
  const [showAutoStartHelp, setShowAutoStartHelp] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundTested, setSoundTested] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Keep screen awake while in monitor mode
  useEffect(() => {
    requestScreenWakeLock().then((active) => {
      setWakeLockActive(active);
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestScreenWakeLock().then((active) => setWakeLockActive(active));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleTestSound = () => {
    playOrderChime();
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 2000);
  };

  const autoStartUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?admin=true&minimized=true`
      : '/?admin=true&minimized=true';

  const handleCopyAutoStartUrl = () => {
    navigator.clipboard.writeText(autoStartUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 selection:bg-blue-600 selection:text-white">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-xs">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm font-black text-white tracking-wide uppercase">
                स्मार्ट प्रिंटर बैकग्राउंड मॉनिटर सक्रिय
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              दुकानदार डेस्कटॉप मोड • नया ऑर्डर आते ही ऑटोमेटिक कैश/ऑनलाइन पॉपअप खुलेगा
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition"
            title="ऑडियो घंटी की जांच करें"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>{soundTested ? 'घंटी बजी ✓' : 'साउंड टेस्ट'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAutoStartHelp(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition"
            title="कंप्यूटर ऑन होते ही ऑटो-चालू कैसे रखें"
          >
            <Laptop className="w-4 h-4 text-blue-400" />
            <span>PC ऑटो-स्टार्ट गाइड</span>
          </button>

          <button
            type="button"
            onClick={onMaximize}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/30"
          >
            <Maximize2 className="w-4 h-4" />
            <span>पूरा एडमिन पैनल खोलें</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
            title="ग्राहक स्क्रीन पर जाएं"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Calm State: Clean, Distraction-Free Desktop Dashboard */}
      <div className="my-auto max-w-xl mx-auto w-full text-center space-y-6 py-12">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-2xl">
            <Printer className="w-12 h-12 animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 items-center justify-center text-slate-950 font-black text-[10px]">
              ✓
            </span>
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            सिस्टम प्रिंट ऑर्डर्स का इंतज़ार कर रहा है...
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            यह विंडो बैकग्राउंड में एक्टिव है। जब भी कोई ग्राहक नया प्रिंट ऑर्डर करेगा, तो कंप्यूटर की स्क्रीन पर तुरंत{' '}
            <strong className="text-amber-400 font-bold">कैश / ऑनलाइन पेमेंट पॉपअप</strong> आ जाएगा और घंटी बजेगी।
          </p>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              स्क्रीन स्थिति
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-emerald-400">
              <Sun className="w-3.5 h-3.5" />
              <span>स्लीप-रोधी सक्रिय</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              अलर्ट साउंड
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-amber-400">
              <Volume2 className="w-3.5 h-3.5" />
              <span>लाउड अलार्म ऑन</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              प्रिंटर
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-blue-400 truncate">
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{settings.shopName || 'रेडी'}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic">
          💡 आप इस विंडो को खुला रखकर कंप्यूटर पर अपना दूसरा कोई भी काम (Photoshop, ई-मित्र, ब्राउज़िंग आदि) कर सकते हैं।
        </p>
      </div>

      {/* Bottom Minimal Hint */}
      <div className="border-t border-slate-900 pt-3 flex items-center justify-between text-xs text-slate-500">
        <span>स्मार्ट क्यूआर प्रिंट • ऑटोमैटिक स्पूलर</span>
        <button
          onClick={onMaximize}
          className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 transition"
        >
          <span>रेट लिस्ट / इतिहास / सेटिंग्स</span>
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Auto-Start Help Modal */}
      {showAutoStartHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 text-slate-200 relative shadow-2xl">
            <button
              onClick={() => setShowAutoStartHelp(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  कंप्यूटर चालू होते ही ऑटो-स्टार्ट कैसे रखें
                </h3>
                <p className="text-xs text-slate-400">
                  Windows PC ऑन होते ही यह मॉनिटर मोड अपने आप खुल जाएगा
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-white block font-bold text-xs">⚡ Windows 1-Click ऑटो-स्टार्ट इंस्टालर:</strong>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold">24x7 Active</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  नीचे दिए गए बटन पर क्लिक करके <code className="text-blue-400">.bat</code> फाइल डाउनलोड करें और एक बार चलाएं।
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => downloadSetupFile('bat', settings.shopName)}
                    className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-center text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.BAT डाउनलोड करें (1-क्लिक)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSetupFile('widget', settings.shopName)}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>HTML विजेट</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <strong className="text-white block font-bold">1. डायरेक्ट ऑटो-स्टार्ट URL:</strong>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={autoStartUrl}
                    className="w-full bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-mono text-emerald-400 outline-none select-all"
                  />
                  <button
                    onClick={handleCopyAutoStartUrl}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shrink-0 transition flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'कॉपी हुआ ✓' : 'कॉपी'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <strong className="text-white block font-bold">2. Windows Startup फोल्डर में डालना:</strong>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                  <li>
                    कीबोर्ड पर <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Win + R</kbd> दबाएं।
                  </li>
                  <li>
                    उसमें <code className="text-amber-400 font-mono">shell:startup</code> लिखकर Enter करें।
                  </li>
                  <li>
                    वहां राइट क्लिक करके <strong className="text-slate-200">New → Shortcut</strong> बनाएं और ऊपर वाला URL पेस्ट कर दें।
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-[11px]">
                ✓ इसके बाद जब भी दुकान का कंप्यूटर ऑन होगा, यह मॉनिटर विंडो तुरंत एक्टिव हो जाएगी और नया प्रिंट आते ही सामने आ जाएगी।
              </div>
            </div>

            <button
              onClick={() => setShowAutoStartHelp(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              समझ गया (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
