import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from '../firebase';
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
    if (!enabled || (role !== 'ceo' && role !== 'admin')) {
      setUsers([]);
      return;
    }

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((userDoc) => {
          const data = userDoc.data() as UserProfile;
          return {
            ...data,
            email: data.email || userDoc.id,
          };
        });
        setUsers(docs);
      },
      (error) => {
        console.error('Error listening to users:', error);
        onError?.(error, 'list', 'users');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, onError, role]);

  return {
    users,
    setUsers,
  };
}
