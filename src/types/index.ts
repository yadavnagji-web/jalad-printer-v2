export type PaperSize = 'A4' | 'A3' | 'PHOTO_4X6' | 'PASSPORT_SHEET';
export type ColorMode = 'bw' | 'color';
export type ScalingMode = 'actual_size' | 'fit_to_page';
export type PrintQuality = 'draft' | 'standard' | 'high';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'counter_pending' | 'refunded';
export type PrintStatus = 'pending_payment' | 'queued' | 'downloading' | 'printing' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'upi_qr' | 'upi_intent' | 'gateway_razorpay' | 'gateway_cashfree' | 'counter_cash';

export interface ShopSettings {
  shopName: string;
  shopLogo: string;
  shopAddress: string;
  mobileNumber: string;
  whatsappNumber: string;
  shopUpiId: string;
  openingHours: string;
  customerInstructions: string;
  supportContact: string;
  defaultPaperSize: PaperSize;
  defaultPrintQuality: PrintQuality;
  defaultPrinter: string;
  supportedPaperSizes: PaperSize[];
  maxFileSizeMb: number;
  documentRetentionHours: number;
  autoPrintEnabled: boolean;
  shopUrl: string;
  customPaymentLink: string;
  customQrImageUrl: string;
  qrDisplayMode: 'dynamic' | 'custom_uploaded' | 'both';
  ownerPhotoUrl?: string;
  adsEnabled?: boolean;
  adsContent?: string;
  adsBannerUrl?: string;
  shopCode?: string;
  isAtShop?: boolean;
  isAtShopManualOverride?: boolean;
}

export interface RegisteredShopkeeper {
  id: string;
  name: string;
  mobileNumber: string;
  shopName?: string;
  address?: string;
  registeredAt: string;
  shopCode?: string;
}

export interface PricingSettings {
  bwSingleA4: number;
  bwDuplexA4: number;
  colorSingleA4: number;
  colorDuplexA4: number;
  bwSingleA3: number;
  colorSingleA3: number;
  photo4x6: number;
  passportSheet: number;
  minOrderAmount: number;
  serviceCharge: number;
}

export interface PrinterConfig {
  id: string;
  name: string;
  brand: 'Epson' | 'HP' | 'Canon' | 'Brother' | 'Other';
  model: string;
  isDefault: boolean;
  status: 'online' | 'offline' | 'busy' | 'paper_low';
  supportedColor: boolean;
  supportedDuplex: boolean;
  supportedPaperSizes: PaperSize[];
  assignedJobTypes: ('document_bw' | 'document_color' | 'photo' | 'id_card')[];
  lastHeartbeat: string;
}

export interface UploadedDocument {
  id: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  uploadedAt: string;
  storagePath: string;
  previewUrl?: string;
  pageCount: number;
  dimensions: {
    width: number;
    height: number;
    unit: 'px' | 'pt' | 'mm';
  };
  effectiveDpi: number;
  estimatedBlurScore: number;
  qualityRecommendation: PrintQuality;
  isOfficialIdDoc: boolean;
  qualityWarning: string | null;
}

export interface PrintJobConfig {
  paperSize: PaperSize;
  orientation: 'portrait' | 'landscape';
  pageRange: string;
  copies: number;
  colorMode: ColorMode;
  duplex: boolean;
  scaling: ScalingMode;
  quality: PrintQuality;
  photoDimensions?: string;
  mergeIdCards?: boolean;
}

export interface OrderItem {
  id: string;
  document: UploadedDocument;
  config: PrintJobConfig;
  calculatedPrice: number;
  pageCountToPrint: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentTxnId: string | null;
  paidAt: string | null;
  createdAt: string;
  printStatus: PrintStatus;
  assignedPrinterId: string | null;
  assignedPrinterName: string | null;
  retryCount: number;
  failureReason: string | null;
  completedAt: string | null;
  verifiedHashMatch: boolean;
  counterOperator?: string;
  shopCode?: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  status: 'created' | 'success' | 'failed' | 'refunded';
  gatewayRef: string;
  createdAt: string;
  verifiedAt: string | null;
  operator?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  ipAddress?: string;
}

export interface WindowsAgentStatus {
  agentVersion: string;
  machineName: string;
  isOnline: boolean;
  lastSeen: string;
  connectedPrinters: {
    name: string;
    isDefault: boolean;
    status: string;
    driver: string;
  }[];
}
