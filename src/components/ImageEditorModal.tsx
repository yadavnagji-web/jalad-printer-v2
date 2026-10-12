import React, { useState } from 'react';
import { X, RotateCw, Sun, Sliders, RefreshCw, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { UploadedDocument } from '../types';

interface ImageEditorModalProps {
  document: UploadedDocument;
  isOpen: boolean;
  onClose: () => void;
  onSaveProcessedCopy: (processedDataUrl: string) => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onSaveProcessedCopy,
}) => {
  if (!isOpen) return null;

  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [officialConsentGiven, setOfficialConsentGiven] = useState<boolean>(!doc.isOfficialIdDoc);

  const handleReset = () => {
    setRotation(0);
    setBrightness(100);
    setContrast(100);
  };

  const handleApply = () => {
    // Generate separate working copy data URL using canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isRotated90or270 = rotation % 180 !== 0;
      canvas.width = isRotated90or270 ? img.height : img.width;
      canvas.height = isRotated90or270 ? img.width : img.height;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const processedUrl = canvas.toDataURL('image/jpeg', 0.95);
      onSaveProcessedCopy(processedUrl);
      onClose();
    };
    img.src = doc.previewUrl || doc.storagePath;
  };

  const filterStyle = {
    transform: `rotate(${rotation}deg)`,
    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
    transition: 'all 0.2s ease',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>फोटो एडिटर (Non-Destructive Image Editor)</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                Working Copy Only
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              मूल फाइल (Original SHA-256) 100% सुरक्षित रहेगी। सभी बदलाव अलग कॉपी पर लागू होंगे।
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Official Document Warning */}
        {doc.isOfficialIdDoc && !officialConsentGiven && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900">
                चेतावनी: पहचान या सरकारी दस्तावेज (Aadhaar / PAN / Certificate Detected)
              </h4>
              <p className="text-xs text-amber-800">
                सरकारी दस्तावेजों में फोटो एडिटिंग या क्रॉपिंग से QR कोड या टेक्स्ट खराब हो सकता है। Smart QR Print अनुशंसा करता है कि आप मूल प्रति (Original) ही प्रिंट करें।
              </p>
              <button
                type="button"
                onClick={() => setOfficialConsentGiven(true)}
                className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
              >
                मैं समझता हूँ, मुझे केवल अपनी फोटो एडजस्ट करनी है (Proceed)
              </button>
            </div>
          </div>
        )}

        {/* Content Body: Side-by-side comparison */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-100/60">
          {/* Left: Original File (Untouched) */}
          <div className="flex flex-col items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              मूल प्रति (Original Untouched)
            </span>
            <div className="w-full h-64 sm:h-80 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <img
                src={doc.previewUrl || doc.storagePath}
                alt="Original Document"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <span className="mt-2 font-mono text-[11px] text-slate-400">
              SHA-256: {doc.sha256Hash.substring(0, 16)}...
            </span>
          </div>

          {/* Right: Working Copy Preview */}
          <div className="flex flex-col items-center bg-white p-4 rounded-2xl border border-blue-200 shadow-xs">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
              संपादित प्रति प्रीव्यू (Working Copy Preview)
            </span>
            <div className="w-full h-64 sm:h-80 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <img
                src={doc.previewUrl || doc.storagePath}
                alt="Processed Preview"
                style={filterStyle}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
              <span>रोटेशन: {rotation}°</span>
              <span>ब्राइटनेस: {brightness}%</span>
              <span>कंट्रास्ट: {contrast}%</span>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 sm:p-6 bg-white border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Rotate */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <span className="text-xs font-bold text-slate-700">घूमाएँ (Rotate):</span>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                <span>+90° Rotate</span>
              </button>
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" /> ब्राइटनेस (Brightness)
                </span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" /> कंट्रास्ट (Contrast)
                </span>
                <span>{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>रीसेट (Reset to Original)</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={doc.isOfficialIdDoc && !officialConsentGiven}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                लागू करें (Apply to Print Copy)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
