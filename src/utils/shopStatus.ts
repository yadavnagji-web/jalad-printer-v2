import { ShopSettings } from '../types';

export interface ShopStatusInfo {
  isAtShop: boolean;
  scheduleText: string;
}

/**
 * Calculates whether the shop is currently open/at shop based purely on Admin's manual control.
 * 100% manual live control — no automatic time schedule.
 */
export function getEffectiveShopStatus(settings?: ShopSettings): ShopStatusInfo {
  // If settings not loaded yet, default to true (ON)
  if (!settings || typeof settings.isAtShop === 'undefined') {
    return {
      isAtShop: true,
      scheduleText: 'दुकान चालू है (ON)',
    };
  }

  const isAtShop = !!settings.isAtShop;
  return {
    isAtShop,
    scheduleText: isAtShop ? 'दुकान चालू है (ON)' : 'दुकान बंद है (OFF)',
  };
}
