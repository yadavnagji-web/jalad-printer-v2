import React, { useState } from 'react';
import {
  Laptop,
  Download,
  CheckCircle2,
  Minimize2,
  Volume2,
  Sun,
  ShieldCheck,
  Shield,
  X,
  FileCode,
  Sparkles,
  ExternalLink,
  Copy,
  Terminal,
} from 'lucide-react';
import { ShopSettings } from '../types';
import { playOrderChime } from '../utils/audioAlert';
import { downloadSetupFile } from '../utils/downloadHelper';

interface DesktopSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onActivateMinimizedMode?: () => void;
  onOpenAdmin?: () => void;
}

export const DesktopSetupModal: React.FC<DesktopSetupModalProps> = ({
  isOpen,
  onClose,
  settings,
  onActivateMinimizedMode,
  onOpenAdmin,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [soundTested, setSoundTested] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const autoStartUrl = `${origin}/?mode=owner&minimized=true&autostart=true`;

  const copyUrl = () => {
    navigator.clipboard.writeText(autoStartUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleTestSound = () => {
    playOrderChime();
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Laptop className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                दुकानदार डेस्कटॉप 24x7 ऑटो-स्टार्ट सेटअप
              </h3>
              <p className="text-xs text-blue-100">
                Shop: {settings.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI'}
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Key Guarantee Banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 space-y-1.5">
            <div className="flex items-center gap-2 font-black text-sm text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ब्राउज़र बंद होने पर भी 24x7 बैकग्राउंड ऑटो-पॉपअप गारंटी</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              यह सेटअप आपके कंप्यूटर पर 24x7 बैकग्राउंड में चलेगा। <strong>चाहे आपका ब्राउज़र बंद (Closed) हो</strong>, जैसे ही कोई ग्राहक अपने मोबाइल से नकद (Cash) या ऑनलाइन UPI से प्रिंट ऑर्डर करेगा, कंप्यूटर स्क्रीन पर <strong>अलार्म के साथ सत्यापन पॉपअप तुरंत खुल जाएगा</strong>! एक बार सत्यापन करने के बाद पॉपअप बंद हो जाएगा और <strong>केवल अगले नए प्रिंट ऑर्डर पर ही खुलेगा</strong>।
            </p>
          </div>

          {/* Download Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Windows 1-Click .BAT Installer */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/30 text-blue-400 border border-blue-500/30">
                    अनुशंसित (Recommended)
                  </span>
                  <Terminal className="w-4 h-4 text-blue-400" />
                </div>
                <h4 className="font-bold text-sm text-white">
                  1. Windows 1-Click 24x7 सेटअप (.bat)
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  डाउनलोड करके सिर्फ 1 बार रन करें। यह Windows Startup में 24x7 बैकग्राउंड मॉनिटर जोड़ देगा, जो ब्राउज़र बंद होने पर भी नया ऑर्डर आते ही पॉपअप खोलेगा।
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadSetupFile('bat', settings.shopName)}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 .BAT 24x7 सेटअप डाउनलोड करें</span>
              </button>
            </div>

            {/* 2. Standalone HTML Desktop Widget */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 transition flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600/30 text-purple-400 border border-purple-500/30">
                    स्टैंडअलोन विजेट
                  </span>
                  <FileCode className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="font-bold text-sm text-white">
                  2. डेस्कटॉप विजेट (.html)
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  एक सिंगल फाइल जिसे आप डेस्कटॉप पर रखकर Chrome या Edge में 24x7 मिनिमाइज चला सकते हैं।
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadSetupFile('widget', settings.shopName)}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-purple-600/30 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>HTML विजेट डाउनलोड करें</span>
              </button>
            </div>
          </div>

          {/* Quick Actions Strip */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h5 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>त्वरित परीक्षण और एक्टिवेशन (Quick Tools):</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTestSound}
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>{soundTested ? 'घंटी बजी ✓' : 'अलर्ट साउंड टेस्ट करें'}</span>
              </button>

              {onActivateMinimizedMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onActivateMinimizedMode();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>अभी मिनिमाइज मोड ऑन करें</span>
                </button>
              )}

              {onOpenAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="sm:col-span-2 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-slate-950" />
                  <span>🔐 एडमिन पैनल खोलें (Open Store Owner Admin Panel)</span>
                </button>
              )}
            </div>
          </div>

          {/* Auto-Start URL Reference */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">दुकानदार मॉनिटर डायरेक्ट URL:</span>
              <span>24x7 Sync Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={autoStartUrl}
                className="w-full bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-mono text-emerald-400 outline-none select-all"
              />
              <button
                type="button"
                onClick={copyUrl}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedUrl ? 'कॉपी हुआ ✓' : 'कॉपी'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-slate-400 text-xs">
          <span>कंप्यूटर ऑन होते ही ऑटोमैटिक चालू रहेगा</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
