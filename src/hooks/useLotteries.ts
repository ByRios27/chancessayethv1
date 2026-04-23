import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { collection, onSnapshot, orderBy, query, where } from '../firebase';
import { db } from '../firebase';
import type { Lottery } from '../types/lotteries';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useLotteries({
  enabled,
  onlyActive = false,
  selectedLottery,
  setSelectedLottery,
  onError,
}: {
  enabled: boolean;
  onlyActive?: boolean;
  selectedLottery: string;
  setSelectedLottery: Dispatch<SetStateAction<string>>;
  onError?: FirestoreErrorHandler;
}) {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const qLot = onlyActive
      ? query(collection(db, 'lotteries'), where('active', '==', true))
      : query(collection(db, 'lotteries'), orderBy('name'));
    const unsubscribe = onSnapshot(qLot, (snapshot) => {
      const docs = snapshot.docs.map((lotteryDoc) => ({ id: lotteryDoc.id, ...lotteryDoc.data() } as Lottery));
      setLotteries(docs);

      if (docs.length > 0) {
        const getSortValue = (time: string) => {
          const [h, m] = time.split(':').map(Number);
          let val = h * 60 + m;
          if (val < 11 * 60) val += 24 * 60;
          return val;
        };
        const sorted = [...docs].sort((a, b) => getSortValue(a.drawTime || '00:00') - getSortValue(b.drawTime || '00:00'));
        const firstActive = sorted.find((l) => l.active);
        if (firstActive) {
          setSelectedLottery((current) => (current ? current : firstActive.name));
        }
      }
    }, (error) => {
      onError?.(error, 'get', 'lotteries');
    });

    return () => unsubscribe();
  }, [enabled, onError, onlyActive, setSelectedLottery]);

  return {
    lotteries,
  };
}
