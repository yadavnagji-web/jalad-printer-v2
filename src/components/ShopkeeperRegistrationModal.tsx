import React, { useState } from 'react';
import {
  Store,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { RegisteredShopkeeper } from '../types';
import { api } from '../services/api';

interface ShopkeeperRegistrationModalProps {
  isOpen: boolean;
  onRegistered: (shopkeeper: RegisteredShopkeeper) => void;
  onCancel?: () => void;
}

export const ShopkeeperRegistrationModal: React.FC<ShopkeeperRegistrationModalProps> = ({
  isOpen,
  onRegistered,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('कृपया अपना पूरा नाम दर्ज करें (Please enter your name)');
      return;
    }
    const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      setErrorMsg('कृपया वैध 10-अंकों का मोबाइल नंबर दर्ज करें (Please enter valid 10-digit mobile number)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const reg: RegisteredShopkeeper = {
        id: `reg-${Date.now()}`,
        name: name.trim(),
        mobileNumber: cleanMobile,
        shopName: shopName.trim() || undefined,
        address: address.trim() || undefined,
        registeredAt: new Date().toISOString(),
      };

      const result = await api.registerShopkeeper(reg);
      if (typeof window !== 'undefined' && result.shopCode) {
        localStorage.setItem('sqp_shop_code', result.shopCode);
      }
      onRegistered(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'पंजीकरण विफल रहा। पुनः प्रयास करें।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-blue-500 overflow-hidden transform animate-in zoom-in-95 text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-black tracking-tight">
            दुकानदार / संचालक पंजीकरण (Shopkeeper Registration)
          </h3>
          <p className="text-xs text-blue-100 font-medium mt-1">
            Smart QR Print सिस्टम का उपयोग करने के लिए अपना विवरण दर्ज करें
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              नाम और मोबाइल नंबर पंजीकरण अनिवार्य है। यह विवरण मुख्य एडमिन में सुरक्षित दर्ज होगा।
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              पूरा नाम (Full Name) *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Mohan Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              मोबाइल नंबर (Mobile Number) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit Mobile Number (e.g. 9876543210)"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              दुकान का नाम (Shop / Cyber Cafe Name)
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="e.g. Sharma Emitra & Photostat"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              पता / गाँव / तहसील (Address / Location)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="e.g. Main Market, Sagwara, Dungarpur"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>पंजीकरण हो रहा है...</span>
                </>
              ) : (
                <>
                  <span>रजिस्टर करें और एडमिन शुरू करें (Register as Owner)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
