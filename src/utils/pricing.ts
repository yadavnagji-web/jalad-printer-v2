import { PricingSettings, PrintJobConfig, UploadedDocument } from '../types';

export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const clean = part.trim();
    if (!clean) continue;

    if (clean.includes('-')) {
      const [startStr, endStr] = clean.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          pages.add(i);
        }
      }
    } else {
      const pageNum = parseInt(clean, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pages.add(pageNum);
      }
    }
  }

  const result = Array.from(pages).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: totalPages }, (_, i) => i + 1);
}

export function calculateItemPrice(
  doc: UploadedDocument,
  config: PrintJobConfig,
  pricing: PricingSettings
): {
  pageCountToPrint: number;
  pricePerPage: number;
  subtotal: number;
  total: number;
  breakdown: string;
} {
  const selectedPages = parsePageRange(config.pageRange, Math.max(1, doc.pageCount));
  const pagesToPrint = selectedPages.length;
  const copies = Math.max(1, config.copies);

  let pricePerPage = 0;
  let breakdown = '';

  if (config.paperSize === 'PHOTO_4X6') {
    pricePerPage = pricing.photo4x6;
    breakdown = `Photo 4x6: ₹${pricing.photo4x6} × ${copies} copies`;
    const total = pricePerPage * copies;
    return { pageCountToPrint: 1, pricePerPage, subtotal: total, total, breakdown };
  }

  if (config.paperSize === 'PASSPORT_SHEET') {
    pricePerPage = pricing.passportSheet;
    breakdown = `Passport Photo Sheet: ₹${pricing.passportSheet} × ${copies} copies`;
    const total = pricePerPage * copies;
    return { pageCountToPrint: 1, pricePerPage, subtotal: total, total, breakdown };
  }

  if (config.paperSize === 'A3') {
    if (config.colorMode === 'color') {
      pricePerPage = pricing.colorSingleA3;
      breakdown = `A3 Colour: ₹${pricing.colorSingleA3}/page`;
    } else {
      pricePerPage = pricing.bwSingleA3;
      breakdown = `A3 Black & White: ₹${pricing.bwSingleA3}/page`;
    }
  } else {
    // A4 or standard
    if (config.colorMode === 'color') {
      if (config.duplex) {
        const fullSheets = Math.floor(pagesToPrint / 2);
        const remainingPages = pagesToPrint % 2;
        const perCopyCost = fullSheets * pricing.colorDuplexA4 + remainingPages * pricing.colorSingleA4;
        const subtotal = perCopyCost * copies;
        pricePerPage = pagesToPrint > 0 ? perCopyCost / pagesToPrint : pricing.colorSingleA4;
        breakdown = `A4 Colour Both-Sides (Duplex): ${fullSheets} शीट (${fullSheets * 2} पृष्ठ) @ ₹${pricing.colorDuplexA4}${
          remainingPages ? ` + ${remainingPages} एकतरफा पृष्ठ @ ₹${pricing.colorSingleA4}` : ''
        }`;
        return {
          pageCountToPrint: pagesToPrint,
          pricePerPage,
          subtotal,
          total: subtotal,
          breakdown: `${breakdown} × ${copies} प्रति = ₹${subtotal.toFixed(2)}`,
        };
      } else {
        pricePerPage = pricing.colorSingleA4;
        breakdown = `A4 Colour Single-Side: ₹${pricing.colorSingleA4}/page`;
      }
    } else {
      if (config.duplex) {
        const fullSheets = Math.floor(pagesToPrint / 2);
        const remainingPages = pagesToPrint % 2;
        const perCopyCost = fullSheets * pricing.bwDuplexA4 + remainingPages * pricing.bwSingleA4;
        const subtotal = perCopyCost * copies;
        pricePerPage = pagesToPrint > 0 ? perCopyCost / pagesToPrint : pricing.bwSingleA4;
        breakdown = `A4 B&W Both-Sides (Duplex): ${fullSheets} शीट (${fullSheets * 2} पृष्ठ) @ ₹${pricing.bwDuplexA4}${
          remainingPages ? ` + ${remainingPages} एकतरफा पृष्ठ @ ₹${pricing.bwSingleA4}` : ''
        }`;
        return {
          pageCountToPrint: pagesToPrint,
          pricePerPage,
          subtotal,
          total: subtotal,
          breakdown: `${breakdown} × ${copies} प्रति = ₹${subtotal.toFixed(2)}`,
        };
      } else {
        pricePerPage = pricing.bwSingleA4;
        breakdown = `A4 B&W Single-Side: ₹${pricing.bwSingleA4}/page`;
      }
    }
  }

  const subtotal = pricePerPage * pagesToPrint * copies;
  return {
    pageCountToPrint: pagesToPrint,
    pricePerPage,
    subtotal,
    total: subtotal,
    breakdown: `${breakdown} (${pagesToPrint} pages × ${copies} copies = ₹${subtotal.toFixed(2)})`
  };
}

export function calculateOrderTotal(
  items: { doc: UploadedDocument; config: PrintJobConfig }[],
  pricing: PricingSettings
): {
  subtotal: number;
  serviceCharge: number;
  total: number;
  itemPrices: { [docId: string]: number };
} {
  let subtotal = 0;
  const itemPrices: { [docId: string]: number } = {};

  for (const item of items) {
    const calc = calculateItemPrice(item.doc, item.config, pricing);
    itemPrices[item.doc.id] = calc.total;
    subtotal += calc.total;
  }

  const serviceCharge = pricing.serviceCharge || 0;
  let total = subtotal + serviceCharge;

  // Apply minimum order amount only if configured and greater than 0
  if (pricing.minOrderAmount && pricing.minOrderAmount > 0 && total > 0 && total < pricing.minOrderAmount) {
    total = pricing.minOrderAmount;
  }

  return { subtotal, serviceCharge, total, itemPrices };
}
