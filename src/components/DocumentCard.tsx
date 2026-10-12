import React from 'react';
import {
  FileText,
  Trash2,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Check,
  Copy,
  Layers,
  Sparkles,
  Maximize2,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { ColorMode, PaperSize, PricingSettings, PrintJobConfig, PrintQuality, ScalingMode, UploadedDocument } from '../types';
import { calculateItemPrice } from '../utils/pricing';

interface DocumentCardProps {
  document: UploadedDocument;
  config: PrintJobConfig;
  pricing: PricingSettings;
  language: 'hi' | 'en';
  onUpdateConfig: (newConfig: Partial<PrintJobConfig>) => void;
  onRemove: () => void;
  onOpenEditor: () => void;
  onOpenPreview?: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  config,
  pricing,
  language,
  onUpdateConfig,
  onRemove,
  onOpenEditor,
  onOpenPreview,
}) => {
  const isPdf = doc.mimeType === 'application/pdf' || doc.originalFileName.toLowerCase().endsWith('.pdf');
  const priceInfo = calculateItemPrice(doc, config, pricing);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-4 sm:p-5 space-y-4">
      {/* Top Header: File Preview Thumbnail, File Name, SHA-256 Badge, Remove */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Document Visual Preview Thumbnail */}
          <div
            onClick={onOpenPreview}
            className="relative cursor-pointer group w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center hover:ring-2 hover:ring-blue-500 transition shadow-xs"
            title="दस्तावेज का प्रीव्यू देखें (Click to View Preview)"
          >
            {doc.previewUrl && !isPdf ? (
              <img
                src={doc.previewUrl}
                alt={doc.originalFileName}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
              />
            ) : (
              <FileText className="w-7 h-7 text-blue-600" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Eye className="w-5 h-5 text-white" />
            </div>
            {isPdf && (
              <span className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl text-[9px] font-bold bg-rose-600 text-white">
                PDF
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                {doc.originalFileName}
              </h4>
              {doc.isOfficialIdDoc && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  पहचान दस्तावेज / Official ID
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
              <span>{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
              <span>•</span>
              <span>{isPdf ? `${doc.pageCount} pages (PDF)` : `${doc.dimensions.width}×${doc.dimensions.height}px`}</span>
            </div>

            {/* Document Preview Trigger Button */}
            {onOpenPreview && (
              <button
                type="button"
                onClick={onOpenPreview}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>प्रीव्यू देखें (View Preview)</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onRemove}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          title="Remove File"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* ID Card Merge Setting (Aadhaar, PAN, Jan Aadhaar on 1 Page) */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              {language === 'hi'
                ? 'छोटे दस्तावेज (आधार, पैन, जनआधार) 1 पेज पर मर्ज प्रिंट करें'
                : 'Merge Small ID Cards (Aadhaar / PAN / Jan Aadhaar) on 1 Page'}
            </span>
            <span className="text-[11px] text-slate-600 block">
              {language === 'hi'
                ? 'कार्ड की दोनों साइड एक ही A4 पेज पर प्रिंट होगी'
                : 'Prints both sides of card onto single A4 sheet'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onUpdateConfig({ mergeIdCards: !config.mergeIdCards })}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
            config.mergeIdCards
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          {config.mergeIdCards ? '✓ मर्ज सक्रिय (ON)' : 'मर्ज बंद (OFF)'}
        </button>
      </div>

      {/* Print Options Form Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* Paper Size */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {language === 'hi' ? 'कागज़ का आकार (Paper Size)' : 'Paper Size'}
          </label>
          <select
            value={config.paperSize}
            onChange={(e) => onUpdateConfig({ paperSize: e.target.value as PaperSize })}
            className="w-full text-xs font-medium rounded-xl border border-slate-300 bg-white py-2 px-3 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="A4">A4 (Standard 210×297mm)</option>
            <option value="A3">A3 (Large Poster/Plan)</option>
            <option value="PHOTO_4X6">4×6 Inch Photo (Glossy)</option>
            <option value="PASSPORT_SHEET">Passport Size Photos Sheet</option>
          </select>
        </div>

        {/* Color Mode */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {language === 'hi' ? 'रंग (Color Mode)' : 'Color Mode'}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateConfig({ colorMode: 'bw' })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                config.colorMode === 'bw'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              B&W (काली स्याही)
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ colorMode: 'color' })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                config.colorMode === 'color'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Colour (रंगीन)
            </button>
          </div>
        </div>

        {/* Copies Counter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {language === 'hi' ? 'प्रतियां (Copies)' : 'Number of Copies'}
          </label>
          <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => onUpdateConfig({ copies: Math.max(1, config.copies - 1) })}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="100"
              value={config.copies}
              onChange={(e) => onUpdateConfig({ copies: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full text-center text-xs font-bold py-1.5 border-x border-slate-200 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={() => onUpdateConfig({ copies: config.copies + 1 })}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Duplex Mode (Both Sides) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {language === 'hi' ? 'साइड (Duplex / Two-sided)' : 'Sides / Duplex'}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateConfig({ duplex: false })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                !config.duplex
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Single-Sided
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ duplex: true })}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                config.duplex
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Both Sides (Duplex)
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Controls: Page Range & Scaling Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 text-xs">
        {/* Page Range (if multi-page PDF) */}
        {isPdf && doc.pageCount > 1 ? (
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {language === 'hi' ? 'पेज रेंज (जैसे: all या 1-3, 5):' : 'Page Range (e.g. all or 1-3, 5):'}
            </label>
            <input
              type="text"
              value={config.pageRange}
              placeholder="all"
              onChange={(e) => onUpdateConfig({ pageRange: e.target.value })}
              className="w-full rounded-xl border border-slate-300 py-1.5 px-3 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Printing {priceInfo.pageCountToPrint} of {doc.pageCount} pages
            </span>
          </div>
        ) : (
          <div className="flex items-center text-slate-500">
            <Layers className="w-4 h-4 mr-1.5 text-slate-400" />
            <span>Single page document</span>
          </div>
        )}

        {/* Scaling Mode */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            {language === 'hi' ? 'स्केलिंग (Scaling Mode):' : 'Scaling Mode:'}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdateConfig({ scaling: 'actual_size' })}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition ${
                config.scaling === 'actual_size'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Actual Size (100%)
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ scaling: 'fit_to_page' })}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition ${
                config.scaling === 'fit_to_page'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Fit to Printable Area
            </button>
          </div>
        </div>
      </div>

      {/* Footer: Price breakdown & Image Editor button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {!isPdf && (
            <button
              type="button"
              onClick={onOpenEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'hi' ? 'फोटो संपादित करें (Edit Photo)' : 'Optional Photo Editor'}</span>
            </button>
          )}
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500 font-medium">{priceInfo.breakdown}</div>
          <div className="text-base sm:text-lg font-black text-slate-900">
            ₹{priceInfo.total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
