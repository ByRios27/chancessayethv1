import { useEffect, useState } from 'react';

import { DEFAULT_SPECIAL4D_SETTINGS, normalizeSpecial4DSettings } from '../config/special4d';
import { db, doc, onSnapshot, serverTimestamp, setDoc } from '../firebase';
import type { GlobalSettings } from '../types/lotteries';

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  id: 'global',
  chancePrices: [
    { price: 0.20, ch1: 14, ch2: 3, ch3: 2 },
    { price: 0.25, ch1: 11, ch2: 3, ch3: 2 }
  ],
  palesEnabled: true,
  billetesEnabled: true,
  pl12Multiplier: 1000,
  pl13Multiplier: 1000,
  pl23Multiplier: 200,
  nextSellerNumber: 2,
  special4d: DEFAULT_SPECIAL4D_SETTINGS
};

const INITIAL_CEO_GLOBAL_SETTINGS: GlobalSettings = {
  id: 'global',
  chancePrices: [
    { price: 5, ch1: 300, ch2: 50, ch3: 10 },
    { price: 10, ch1: 600, ch2: 100, ch3: 20 },
    { price: 20, ch1: 1200, ch2: 200, ch3: 40 }
  ],
  palesEnabled: true,
  billetesEnabled: true,
  pl12Multiplier: 1000,
  pl13Multiplier: 1000,
  pl23Multiplier: 200,
  nextSellerNumber: 1,
  special4d: DEFAULT_SPECIAL4D_SETTINGS
};

interface UseGlobalSettingsParams {
  enabled: boolean;
  userRole?: string;
  onError: (error: unknown, operation: 'get' | 'write', target: string) => void;
}

export function useGlobalSettings({ enabled, userRole, onError }: UseGlobalSettingsParams) {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);

  useEffect(() => {
    if (!enabled || !userRole) return;

    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<GlobalSettings>;
        setGlobalSettings({
          ...DEFAULT_GLOBAL_SETTINGS,
          ...data,
          id: snapshot.id,
          special4d: normalizeSpecial4DSettings(data.special4d),
        } as GlobalSettings);
        return;
      }

      if (userRole !== 'ceo') return;

      setDoc(settingsRef, INITIAL_CEO_GLOBAL_SETTINGS)
        .then(() => setDoc(doc(db, 'public', 'connectivity'), { lastTested: serverTimestamp() }))
        .catch((error) => {
          console.error('Error creating global settings:', error);
          onError(error, 'write', 'settings/global');
        });
    }, (error) => {
      console.error('Error listening global settings:', error);
      onError(error, 'get', 'settings/global');
    });

    return unsubscribe;
  }, [enabled, onError, userRole]);

  return {
    globalSettings,
    setGlobalSettings,
  };
}
