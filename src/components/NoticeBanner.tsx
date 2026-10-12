import React from 'react';
import { ShieldCheck, FileCheck, Lock, AlertTriangle } from 'lucide-react';

interface NoticeBannerProps {
  language: 'hi' | 'en';
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({ language }) => {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>मूल प्रति संरक्षण गारंटी</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                Original Preservation Mode
              </span>
            </h3>
            <p className="text-xs text-slate-600">
              Zero generative tampering • SHA-256 Verified • Aadhaar / PAN / Official Safe
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs sm:text-sm text-slate-700 leading-relaxed bg-white/70 backdrop-blur-xs p-3.5 rounded-xl border border-amber-100">
        <p className="font-medium text-slate-900">
          "आपकी मूल फाइल में मौजूद जानकारी को बदलने के लिए Smart QR Print डिजाइन नहीं किया गया है। प्रिंट का आकार, प्रिंटर के मार्जिन, पेपर और प्रिंट क्वालिटी के कारण कागज पर परिणाम अलग दिख सकता है। भुगतान से पहले कृपया दस्तावेज का प्रीव्यू जाँच लें।"
        </p>
        <p className="mt-1.5 text-xs text-slate-500">
          (Smart QR Print preserves your source file byte-for-byte. Names, numbers, dates, signatures, and QR codes are never altered or rewritten.)
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-medium text-slate-600">
        <div className="flex items-center gap-1.5 bg-white/80 p-1.5 rounded-lg border border-slate-100">
          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>SHA-256 Hash Guard</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 p-1.5 rounded-lg border border-slate-100">
          <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Auto Purge in 24h</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 p-1.5 rounded-lg border border-slate-100">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Zero AI Hallucination</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 p-1.5 rounded-lg border border-slate-100">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Exact Dimensions Check</span>
        </div>
      </div>
    </div>
  );
};
