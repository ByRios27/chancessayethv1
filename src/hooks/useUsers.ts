import { useEffect, useState } from 'react';
import { collection, getDocs, query } from '../firebase';
import { db } from '../firebase';
import type { UserProfile } from '../types/users';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useUsers({
  role,
  enabled = true,
  onError,
}: {
  role?: string;
  enabled?: boolean;
  onError?: FirestoreErrorHandler;
}) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!enabled) return;
    if (role !== 'ceo' && role !== 'admin') return;

    let cancelled = false;
    const run = async () => {
      try {
        console.log('Fetching users (one-time) for role:', role);
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        if (cancelled) return;
        const docs = snapshot.docs.map((userDoc) => userDoc.data() as UserProfile);
        setUsers(docs);
      } catch (error) {
        console.error('Error fetching users:', error);
        onError?.(error, 'list', 'users');
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, onError, role]);

  return {
    users,
    setUsers,
  };
}
