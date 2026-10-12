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
 * 2. Admin manual override: If manual override flag is true, strictly use admin's explicit boolean preference.
 */
export function getEffectiveShopStatus(settings?: ShopSettings): ShopStatusInfo {
  const now = new Date();
  const hours = now.getHours();
  // Morning 10:00 AM to 5:00 PM (hours 10:00 to 16:59:59)
  const isAutoHours = hours >= 10 && hours < 17;

  if (!settings) {
    return {
      isAtShop: isAutoHours,
      isAutoHours,
      isManualOverride: false,
      scheduleText: isAutoHours ? 'ऑटो: 10 AM - 5 PM (ON)' : 'ऑटो: 10 AM - 5 PM (OFF)',
    };
  }

  // 1. If explicitly set to Auto Schedule Mode (isAtShopManualOverride === false)
  if (settings.isAtShopManualOverride === false) {
    return {
      isAtShop: isAutoHours,
      isAutoHours,
      isManualOverride: false,
      scheduleText: isAutoHours ? 'ऑटो: 10 AM - 5 PM (ON)' : 'ऑटो: 10 AM - 5 PM (OFF)',
    };
  }

  // 2. Strict Admin Control: Manual ON / OFF (isAtShop boolean is the sole authority)
  const isAtShop = settings.isAtShop !== undefined ? !!settings.isAtShop : isAutoHours;
  return {
    isAtShop,
    isAutoHours,
    isManualOverride: true,
    scheduleText: isAtShop ? 'मैनुअल: ON (दुकानदार द्वारा चालू)' : 'मैनुअल: OFF (दुकानदार द्वारा बंद)',
  };
}
