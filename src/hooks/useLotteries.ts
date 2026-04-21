import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from '../firebase';
import { db } from '../firebase';
import type { Lottery } from '../types/lotteries';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useLotteries({
  enabled,
  selectedLottery,
  setSelectedLottery,
  onError,
}: {
  enabled: boolean;
  selectedLottery: string;
  setSelectedLottery: (value: string) => void;
  onError?: FirestoreErrorHandler;
}) {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const qLot = query(collection(db, 'lotteries'), orderBy('name'));
    const unsubscribe = onSnapshot(qLot, (snapshot) => {
      const docs = snapshot.docs.map((lotteryDoc) => ({ id: lotteryDoc.id, ...lotteryDoc.data() } as Lottery));
      setLotteries(docs);

      if (docs.length > 0 && !selectedLottery) {
        const getSortValue = (time: string) => {
          const [h, m] = time.split(':').map(Number);
          let val = h * 60 + m;
          if (val < 11 * 60) val += 24 * 60;
          return val;
        };
        const sorted = [...docs].sort((a, b) => getSortValue(a.drawTime || '00:00') - getSortValue(b.drawTime || '00:00'));
        const firstActive = sorted.find((l) => l.active);
        if (firstActive) setSelectedLottery(firstActive.name);
      }
    }, (error) => {
      onError?.(error, 'get', 'lotteries');
    });

    return () => unsubscribe();
  }, [enabled, onError, selectedLottery, setSelectedLottery]);

  return {
    lotteries,
  };
}
