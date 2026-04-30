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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const qLot = onlyActive
      ? query(collection(db, 'lotteries'), where('active', '==', true))
      : query(collection(db, 'lotteries'), orderBy('name'));
    const unsubscribe = onSnapshot(qLot, (snapshot) => {
      const docs = snapshot.docs.map((lotteryDoc) => ({ id: lotteryDoc.id, ...lotteryDoc.data() } as Lottery));
      setLotteries(docs);
      setLoading(false);

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
          setSelectedLottery((current) => (current ? current : firstActive.id));
        }
      }
    }, (error) => {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar los sorteos';
      setError(message);
      setLoading(false);
      onError?.(error, 'get', 'lotteries');
    });

    return () => unsubscribe();
  }, [enabled, onError, onlyActive, setSelectedLottery]);

  return {
    lotteries,
    loading,
    error,
  };
}
