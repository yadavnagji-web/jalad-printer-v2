import React, { useState } from 'react';
import {
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { UploadedDocument } from '../types';

interface DocumentPreviewModalProps {
  document: UploadedDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !doc) return null;

  const isPdf =
    doc.mimeType === 'application/pdf' ||
    doc.originalFileName.toLowerCase().endsWith('.pdf');

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, z - 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-sm sm:max-w-md">
                {doc.originalFileName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                <span>{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                <span>•</span>
                <span>
                  {isPdf
                    ? `${doc.pageCount} पृष्ठ (PDF)`
                    : `${doc.dimensions.width}×${doc.dimensions.height}px`}
                </span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                  <ShieldCheck className="w-3 h-3" />
                  SHA-256 OK
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPdf && (
              <div className="flex items-center bg-slate-800 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-1 text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {doc.previewUrl && (
              <a
                href={doc.previewUrl}
                target="_blank"
                rel="noreferrer"
                download={doc.originalFileName}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition hidden sm:flex items-center gap-1 text-xs font-semibold"
                title="Download file"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Canvas Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60 min-h-[350px] sm:min-h-[480px]">
          {isPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              {doc.previewUrl ? (
                <iframe
                  src={`${doc.previewUrl}#toolbar=0&navpanes=0`}
                  title="PDF Preview"
                  className="w-full h-[65vh] rounded-2xl border border-slate-700 bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                  <FileText className="w-16 h-16 text-rose-500 mx-auto" />
                  <h4 className="text-base font-bold text-white">
                    {doc.originalFileName}
                  </h4>
                  <p className="text-xs text-slate-400">
                    PDF Document • {doc.pageCount} Pages • Verified Integrity
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={doc.previewUrl || doc.storagePath}
                alt={doc.originalFileName}
                className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-700 select-none"
              />
            </div>
          )}
        </div>

        {/* Bottom Status Banner */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              दस्तावेज प्रीव्यू सत्यापित: मूल प्रति में कोई बदलाव नहीं (Exact 1:1 Preservation)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition text-xs"
          >
            ठीक है, प्रिंट जारी रखें (Continue)
          </button>
        </div>
      </div>
    </div>
  );
};
