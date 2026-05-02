import type { Lottery, Special4DSettings } from '../types/lotteries';

export const SPECIAL4D_LOTTERY_ID = 'special-chances-4d';

export const DEFAULT_SPECIAL4D_SETTINGS: Special4DSettings = {
  enabled: false,
  name: 'Especial Chances 4D',
  drawTime: '21:00',
  closingTime: '20:55',
  unitPrice: 0.25,
  commissionRate: 0,
  payouts: {
    p1: { first2: 0, last2: 0 },
    p2: { first2: 0, last2: 0 },
    p3: { first2: 0, last2: 0 },
  },
};

export const normalizeSpecial4DSettings = (settings?: Partial<Special4DSettings> | null): Special4DSettings => ({
  ...DEFAULT_SPECIAL4D_SETTINGS,
  ...(settings || {}),
  name: (settings?.name || DEFAULT_SPECIAL4D_SETTINGS.name).trim() || DEFAULT_SPECIAL4D_SETTINGS.name,
  payouts: {
    p1: {
      ...DEFAULT_SPECIAL4D_SETTINGS.payouts.p1,
      ...(settings?.payouts?.p1 || {}),
    },
    p2: {
      ...DEFAULT_SPECIAL4D_SETTINGS.payouts.p2,
      ...(settings?.payouts?.p2 || {}),
    },
    p3: {
      ...DEFAULT_SPECIAL4D_SETTINGS.payouts.p3,
      ...(settings?.payouts?.p3 || {}),
    },
  },
});

export const buildSpecial4DLottery = (settings?: Partial<Special4DSettings> | null): Lottery => {
  const normalizedSettings = normalizeSpecial4DSettings(settings);

  return {
    id: SPECIAL4D_LOTTERY_ID,
    name: normalizedSettings.name,
    drawTime: normalizedSettings.drawTime,
    closingTime: normalizedSettings.closingTime,
    active: normalizedSettings.enabled,
    pricePerUnit: normalizedSettings.unitPrice,
    isFourDigits: true,
    isSpecial4D: true,
  };
};
