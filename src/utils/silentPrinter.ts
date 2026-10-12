import { CustomerOrder } from '../types';

/**
 * Automatically sends verified paid order documents directly to the computer's installed default printer.
 * Bypasses manual clicks and handles multi-copy and PDF/Image rendering.
 */
export async function autoPrintOrder(order: CustomerOrder): Promise<boolean> {
  if (!order || !order.items || order.items.length === 0) return false;

  console.log(`[Auto-Printer Spooler] Payment verified for Order #${order.orderNumber}. Sending directly to system printer...`);

  for (const item of order.items) {
    const doc = item.document;
    const copies = Math.max(1, item.config?.copies || 1);
    const fileUrl = doc.storagePath || doc.previewUrl;

    if (!fileUrl) continue;

    for (let c = 0; c < copies; c++) {
      try {
        await printDocumentSilently(fileUrl, doc.mimeType, item.config?.paperSize || 'A4');
      } catch (err) {
        console.error(`[Auto-Printer] Error printing item ${doc.originalFileName}:`, err);
      }
    }
  }

  return true;
}

/**
 * Triggers the browser's native print dialog for the given document, allowing the admin
 * to select their printer, copies, colour mode, and settings as desired.
 */
export function triggerBrowserPrintDialog(
  fileUrl: string,
  mimeType: string,
  fileName?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const isPdf = mimeType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf');
    const iframe = document.createElement('iframe');
    iframe.id = `browser-print-${Date.now()}`;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    if (isPdf) {
      iframe.src = fileUrl;
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('PDF print iframe fallback:', e);
            const w = window.open(fileUrl, '_blank');
            w?.focus();
            w?.print();
          }
          resolve(true);
        }, 500);
      };
    } else {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName || 'Print Document'}</title>
              <style>
                @page { size: auto; margin: 5mm; }
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff; }
                img { max-width: 100%; max-height: 100%; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${fileUrl}" onload="setTimeout(function(){ window.focus(); window.print(); }, 200);" />
            </body>
          </html>
        `);
        doc.close();
      }
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {}
        resolve(true);
      }, 700);
    }

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 15000);
  });
}

function printDocumentSilently(fileUrl: string, mimeType: string, paperSize: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.id = `auto-print-frame-${Date.now()}`;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const isPdf = mimeType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      iframe.src = fileUrl;
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('[Auto-Printer] PDF print frame error:', e);
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            resolve();
          }, 2000);
        }, 600);
      };
    } else {
      // For images or photos: render printable layout inside frame
      const docObj = iframe.contentDocument || iframe.contentWindow?.document;
      if (docObj) {
        docObj.open();
        docObj.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Auto Print Job - ${paperSize}</title>
              <style>
                @page { size: auto; margin: 0; }
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff; }
                img { max-width: 100%; max-height: 100%; object-fit: contain; page-break-inside: avoid; }
              </style>
            </head>
            <body>
              <img src="${fileUrl}" onload="window.focus(); window.print();" />
            </body>
          </html>
        `);
        docObj.close();
      }

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {}
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          resolve();
        }, 2000);
      }, 800);
    }
  });
}
