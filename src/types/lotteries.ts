export interface Lottery {
  id: string;
  name: string;
  drawTime: string;
  active: boolean;
  pricePerUnit?: number;
  closingTime?: string;
  isFourDigits?: boolean;
  isSpecial4D?: boolean;
}

export interface ChancePriceConfig {
  price: number;
  ch1: number;
  ch2: number;
  ch3: number;
}

export interface BilletePrizeMultipliers {
  full4: number;
  first3: number;
  last3: number;
  first2: number;
  last2: number;
}

export interface Special4DPrizePayouts {
  first2: number;
  last2: number;
}

export interface Special4DSettings {
  enabled: boolean;
  name: string;
  drawTime: string;
  closingTime: string;
  unitPrice: number;
  commissionRate: number;
  payouts: {
    p1: Special4DPrizePayouts;
    p2: Special4DPrizePayouts;
    p3: Special4DPrizePayouts;
  };
}

export interface GlobalSettings {
  id: string;
  chancePrices: ChancePriceConfig[];
  palesEnabled: boolean;
  billetesEnabled: boolean;
  pl12Multiplier: number;
  pl13Multiplier: number;
  pl23Multiplier: number;
  nextSellerNumber?: number;
  billeteMultipliers?: {
    p1: BilletePrizeMultipliers;
    p2: BilletePrizeMultipliers;
    p3: BilletePrizeMultipliers;
  };
  special4d?: Special4DSettings;
}
