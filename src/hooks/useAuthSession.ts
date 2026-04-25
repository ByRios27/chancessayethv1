import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { auth, collection, db, doc, getDoc, getDocs, limit, query, setDoc, signOut } from '../firebase';
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
        const ceoEmail = (import.meta.env.VITE_CEO_EMAIL || 'zsayeth09@gmail.com').toLowerCase();
        const ownerEmail = 'zsayeth09@gmail.com';

        if (email === ceoEmail) {
          console.log('CEO logged in:', email, u.uid);
          try {
            let userDoc = await getDoc(doc(db, 'users', email));
            if (!userDoc.exists() && email === ownerEmail) {
              const usersProbe = await getDocs(query(collection(db, 'users'), limit(1)));
              if (usersProbe.empty) {
                const bootstrapOwnerProfile: UserProfile & { isPrimaryCeo: boolean } = {
                  email,
                  name: 'CEO',
                  role: 'ceo',
                  status: 'active',
                  isPrimaryCeo: true,
                  commissionRate: 0,
                  currentDebt: 0,
                  canLiquidate: true,
                  sellerId: 'CEO01',
                };
                await setDoc(doc(db, 'users', email), bootstrapOwnerProfile, { merge: true });
                userDoc = await getDoc(doc(db, 'users', email));
              }
            }

            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              const normalizedSellerId = (data.sellerId || '').trim() || email.split('@')[0].toUpperCase();
              const normalizedProfile: UserProfile = {
                email,
                name: data.name || 'CEO',
                role: 'ceo',
                commissionRate: typeof data.commissionRate === 'number' ? data.commissionRate : 0,
                status: data.status || 'active',
                sellerId: normalizedSellerId || 'CEO01',
                currentDebt: typeof data.currentDebt === 'number' ? data.currentDebt : 0,
                canLiquidate: data.canLiquidate ?? true,
              };
              setUserProfile(normalizedProfile);
            } else {
              console.warn('CEO profile missing and bootstrap did not run.', { email });
              toast.error('No se encontró el perfil del owner. Contacta al administrador.');
              setUserProfile(null);
            }
          } catch (error) {
            console.error('Error fetching CEO profile:', error);
            toast.error('Error cargando perfil del owner. Intenta cerrar e iniciar sesión nuevamente.');
            setUserProfile(null);
          }
        } else {
          try {
            console.log('Non-CEO user logged in:', email, u.uid);
            const userDoc = await getDoc(doc(db, 'users', email));
            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              if (!['ceo', 'admin', 'seller'].includes(String(data.role || '').toLowerCase())) {
                toast.error('Tu rol ya no es válido en el sistema. Contacta al administrador.');
                setUserProfile(null);
                setLoading(false);
                return;
              }
              const normalizedSellerId = (data.sellerId || '').trim() || email.split('@')[0].toUpperCase();
              setUserProfile({
                ...data,
                email,
                sellerId: normalizedSellerId,
              } as UserProfile);
            } else {
              console.warn('User profile not found in Firestore for:', email);
              toast.error('Tu perfil no existe en la base de datos. Contacta al administrador.');
              setUserProfile(null);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            toast.error('Error cargando tu perfil. Intenta iniciar sesión de nuevo.');
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
