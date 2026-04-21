import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from '../firebase';
import { db } from '../firebase';
import type { UserProfile } from '../types/users';

type FirestoreErrorHandler = (error: unknown, operation: 'get' | 'list', target: string) => void;

export function useUsers({
  role,
  onError,
}: {
  role?: string;
  onError?: FirestoreErrorHandler;
}) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (role !== 'ceo' && role !== 'admin' && role !== 'programador') return;

    console.log('Fetching all users for role:', role);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Users fetched successfully:', snapshot.size);
      const docs = snapshot.docs.map((userDoc) => userDoc.data() as UserProfile);
      setUsers(docs);
    }, (error) => {
      console.error('Error fetching users:', error);
      onError?.(error, 'list', 'users');
    });

    return () => unsubscribe();
  }, [onError, role]);

  return {
    users,
    setUsers,
  };
}
