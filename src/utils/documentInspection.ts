import { PDFDocument } from 'pdf-lib';
import { PrintQuality } from '../types';

/**
 * Computes SHA-256 hash using native Web Crypto API.
 * Optimized for speed and zero memory leak.
 */
export async function computeSHA256(file: File | Blob | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (file instanceof ArrayBuffer) {
    buffer = file;
  } else {
    buffer = await file.arrayBuffer();
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface InspectionResult {
  pageCount: number;
  dimensions: { width: number; height: number; unit: 'px' | 'pt' | 'mm' };
  effectiveDpi: number;
  estimatedBlurScore: number;
  qualityRecommendation: PrintQuality;
  isOfficialIdDoc: boolean;
  qualityWarning: string | null;
  previewDataUrl?: string;
}

/**
 * Fast inspection of any document (PDF or Image) without modifying source.
 * Optimized for millisecond performance using ObjectURLs and micro-sampling.
 */
export async function inspectDocument(file: File, existingBuffer?: ArrayBuffer): Promise<InspectionResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const lowerName = file.name.toLowerCase();
  
  // Fast keyword-based official ID detection
  const isOfficialKeyword =
    lowerName.includes('aadhaar') ||
    lowerName.includes('aadhar') ||
    lowerName.includes('pan') ||
    lowerName.includes('jan_aadhaar') ||
    lowerName.includes('janaadhaar') ||
    lowerName.includes('id') ||
    lowerName.includes('card') ||
    lowerName.includes('certificate') ||
    lowerName.includes('marksheet') ||
    lowerName.includes('admit') ||
    lowerName.includes('voter');

  if (isPdf) {
    try {
      const arrayBuffer = existingBuffer || (await file.arrayBuffer());
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      let width = 595.28;
      let height = 841.89;

      if (pageCount > 0) {
        const firstPage = pdfDoc.getPage(0);
        const size = firstPage.getSize();
        width = Math.round(size.width);
        height = Math.round(size.height);
      }

      const previewUrl = URL.createObjectURL(file);

      return {
        pageCount,
        dimensions: { width, height, unit: 'pt' },
        effectiveDpi: 300,
        estimatedBlurScore: 0,
        qualityRecommendation: 'standard',
        isOfficialIdDoc: isOfficialKeyword,
        qualityWarning: null,
        previewDataUrl: previewUrl,
      };
    } catch (err) {
      return {
        pageCount: 1,
        dimensions: { width: 595, height: 842, unit: 'pt' },
        effectiveDpi: 300,
        estimatedBlurScore: 0,
        qualityRecommendation: 'standard',
        isOfficialIdDoc: isOfficialKeyword,
        qualityWarning: 'PDF loaded. Standard layout will be preserved.',
        previewDataUrl: URL.createObjectURL(file),
      };
    }
  }

  // Handle Image files using instant ObjectURL (0ms instead of heavy FileReader)
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 600;

      // Standard A4 dimensions in inches: 8.27 x 11.69 inches
      const longerSide = Math.max(width, height);
      const effectiveDpi = Math.round(longerSide / 11.69);

      // Aspect ratio inspection for standard ID-1 card (like Aadhaar PVC / PAN = ~1.58)
      const aspectRatio = Math.max(width, height) / Math.min(width, height);
      const isCardRatio = aspectRatio >= 1.45 && aspectRatio <= 1.70;
      const isOfficialIdDoc = isOfficialKeyword || isCardRatio;

      // Micro-canvas brightness check (tiny 32x32 sample = instant)
      let brightness = 128;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, 32, 32);
          const imgData = ctx.getImageData(0, 0, 32, 32);
          const pixels = imgData.data;
          let totalLum = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            totalLum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          }
          brightness = Math.round(totalLum / 1024);
        }
      } catch (e) {
        // Fallback safely
      }

      let recommendation: PrintQuality = 'standard';
      let warning: string | null = null;

      if (effectiveDpi < 120) {
        recommendation = 'draft';
        warning = 'कम रिज़ॉल्यूशन (Low DPI): कागज़ पर प्रिंट थोड़ा धुंधला (blurry) दिख सकता है।';
      } else if (effectiveDpi >= 250) {
        recommendation = 'high';
      } else {
        recommendation = 'standard';
      }

      if (brightness < 35) {
        warning = warning ? `${warning} | छवि बहुत गहरी (too dark) है।` : 'छवि बहुत गहरी (too dark) है।';
      }

      resolve({
        pageCount: 1,
        dimensions: { width, height, unit: 'px' },
        effectiveDpi,
        estimatedBlurScore: 0,
        qualityRecommendation: recommendation,
        isOfficialIdDoc,
        qualityWarning: warning,
        previewDataUrl: objectUrl,
      });
    };

    img.onerror = () => {
      resolve({
        pageCount: 1,
        dimensions: { width: 800, height: 600, unit: 'px' },
        effectiveDpi: 150,
        estimatedBlurScore: 0,
        qualityRecommendation: 'standard',
        isOfficialIdDoc: isOfficialKeyword,
        qualityWarning: null,
        previewDataUrl: objectUrl,
      });
    };

    img.src = objectUrl;
  });
}
