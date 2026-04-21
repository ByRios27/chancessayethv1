import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { auth, db, doc, getDoc, setDoc, signOut } from '../firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '../types/users';
import { getBusinessDate } from '../utils/dates';

export function useAuthSession(enforceSessionByOperationalDay: boolean) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const getCurrentOperationalSessionDay = useCallback(() => format(getBusinessDate(), 'yyyy-MM-dd'), []);
  const getStoredSessionDay = useCallback(() => localStorage.getItem('sessionBusinessDay'), []);
  const markSessionDay = useCallback(() => {
    localStorage.setItem('sessionBusinessDay', getCurrentOperationalSessionDay());
  }, [getCurrentOperationalSessionDay]);
  const clearSessionDay = useCallback(() => {
    localStorage.removeItem('sessionBusinessDay');
  }, []);

  const isSessionValid = useCallback(() => {
    const storedDay = getStoredSessionDay();
    if (!storedDay) return true;
    return storedDay === getCurrentOperationalSessionDay();
  }, [getCurrentOperationalSessionDay, getStoredSessionDay]);

  const handleLogout = useCallback(() => {
    signOut(auth);
    clearSessionDay();
  }, [clearSessionDay]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        try {
          await u.getIdToken(true);
          const token = await u.getIdTokenResult();
          if (!token.claims?.role) {
            console.warn('Authenticated user without role claim. Firestore writes/reads by role may fail until claims are synced.');
          }
        } catch (tokenError) {
          console.error('Error refreshing auth token/claims:', tokenError);
        }

        const storedSessionDay = getStoredSessionDay();
        const currentSessionDay = getCurrentOperationalSessionDay();

        if (!storedSessionDay) {
          markSessionDay();
        } else if (storedSessionDay !== currentSessionDay) {
          if (enforceSessionByOperationalDay) {
            console.log('Session expired by operational day change. Signing out.');
            handleLogout();
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            toast.info('Debe iniciar sesión nuevamente por cambio de día operativo.');
            return;
          }
          markSessionDay();
        }
      }

      setUser(u);
      if (u && u.email) {
        const email = u.email.toLowerCase();
        const ceoEmail = import.meta.env.VITE_CEO_EMAIL || 'zsayeth09@gmail.com';

        if (email === ceoEmail.toLowerCase()) {
          console.log('CEO logged in:', email, u.uid);
          try {
            const userDoc = await getDoc(doc(db, 'users', email));
            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              data.role = 'ceo';
              if (!data.name) data.name = 'CEO';
              if (!data.email) data.email = email;
              setUserProfile(data);
            } else {
              const defaultCeoProfile: UserProfile = {
                email,
                name: 'CEO',
                role: 'ceo',
                commissionRate: 0,
                status: 'active',
                sellerId: 'CEO01',
              };
              await setDoc(doc(db, 'users', email), defaultCeoProfile);
              setUserProfile(defaultCeoProfile);
            }
          } catch (error) {
            console.error('Error fetching CEO profile:', error);
            setUserProfile({
              email,
              name: 'CEO',
              role: 'ceo',
              commissionRate: 0,
              status: 'active',
              sellerId: 'CEO01',
            });
          }
        } else {
          try {
            console.log('Non-CEO user logged in:', email, u.uid);
            const userDoc = await getDoc(doc(db, 'users', email));
            if (userDoc.exists()) {
              setUserProfile(userDoc.data() as UserProfile);
            } else {
              console.warn('User profile not found in Firestore for:', email);
              setUserProfile(null);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUserProfile(null);
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [enforceSessionByOperationalDay, getCurrentOperationalSessionDay, getStoredSessionDay, handleLogout, markSessionDay]);

  useEffect(() => {
    if (!user || !enforceSessionByOperationalDay) return;

    const interval = setInterval(() => {
      if (!isSessionValid()) {
        console.log('Session expired by operational day change. Signing out.');
        handleLogout();
        toast.info('Su sesión expiró por cambio de día operativo. Inicie sesión nuevamente.');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [enforceSessionByOperationalDay, handleLogout, isSessionValid, user]);

  return {
    user,
    userProfile,
    setUserProfile,
    loading,
    handleLogout,
  };
}
