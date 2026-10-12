import { ShopSettings } from '../types';

export interface ShopStatusInfo {
  isAtShop: boolean;
  isAutoHours: boolean;
  isManualOverride: boolean;
  scheduleText: string;
}

/**
 * Calculates whether the shop is currently open/at shop based on:
 * 1. Automatic time schedule: Morning 10:00 AM to 5:00 PM (hours 10 to 16)
 * 2. Admin manual override: If manual override flag is true, use admin's explicit boolean preference.
 */
export function getEffectiveShopStatus(settings?: ShopSettings): ShopStatusInfo {
  const now = new Date();
  const hours = now.getHours();
  // 10:00 AM to 5:00 PM (10:00 to 16:59:59)
  const isAutoHours = hours >= 10 && hours < 17;

  if (settings && settings.isAtShopManualOverride === true) {
    return {
      isAtShop: !!settings.isAtShop,
      isAutoHours,
      isManualOverride: true,
      scheduleText: 'मैनुअल (Manual Override Active)',
    };
  }

  // Automatic schedule
  return {
    isAtShop: settings?.isAtShop !== undefined ? settings.isAtShop : isAutoHours,
    isAutoHours,
    isManualOverride: false,
    scheduleText: 'ऑटो (10:00 AM - 5:00 PM)',
  };
}
