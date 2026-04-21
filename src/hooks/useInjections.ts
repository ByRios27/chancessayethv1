import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from '../firebase';
import { db } from '../firebase';
import type { Injection } from '../types/finance';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useInjections({
  enabled,
  canAccessAllUsers,
  businessDayKey,
  userEmail,
  onError,
}: {
  enabled: boolean;
  canAccessAllUsers: boolean;
  businessDayKey: string;
  userEmail?: string;
  onError?: FirestoreErrorHandler;
}) {
  const [injections, setInjections] = useState<Injection[]>([]);

  useEffect(() => {
    if (!enabled) return;

    if (canAccessAllUsers) {
      const qInj = query(
        collection(db, 'injections'),
        where('date', '==', businessDayKey),
        limit(500)
      );
      const unsubscribeInjections = onSnapshot(qInj, (snapshot) => {
        console.log('Injections fetched successfully:', snapshot.size);
        const docs = snapshot.docs.map((injDoc) => ({ id: injDoc.id, ...injDoc.data() } as Injection));
        setInjections(docs);
      }, (error) => {
        console.error('Error fetching injections:', error);
        onError?.(error, 'get', 'injections');
      });

      return () => unsubscribeInjections();
    }

    console.log('Fetching injections for user:', userEmail?.toLowerCase());
    const qInj = query(
      collection(db, 'injections'),
      where('userEmail', '==', userEmail?.toLowerCase()),
      where('date', '==', businessDayKey),
      limit(50)
    );
    const unsubscribeInjections = onSnapshot(qInj, (snapshot) => {
      console.log('Injections fetched successfully:', snapshot.size);
      const docs = snapshot.docs.map((injDoc) => ({ id: injDoc.id, ...injDoc.data() } as Injection));
      setInjections(docs);
    }, (error) => {
      console.error('Error fetching injections:', error);
      onError?.(error, 'get', 'injections');
    });

    return () => unsubscribeInjections();
  }, [enabled, canAccessAllUsers, businessDayKey, userEmail, onError]);

  return {
    injections,
    setInjections,
  };
}
