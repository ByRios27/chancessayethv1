import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { auth, collection, db, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, signOut } from '../firebase';
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
    let unsubscribeProfile: (() => void) | null = null;

    const clearProfileListener = () => {
      if (!unsubscribeProfile) return;
      unsubscribeProfile();
      unsubscribeProfile = null;
    };

    const subscribeToUserProfile = (email: string, isCeoLogin: boolean) => {
      const userRef = doc(db, 'users', email);
      unsubscribeProfile = onSnapshot(userRef, (userDoc) => {
        if (!userDoc.exists()) {
          console.warn('User profile not found in Firestore for:', email);
          toast.error(isCeoLogin
            ? 'No se encontro el perfil del owner. Contacta al administrador.'
            : 'Tu perfil no existe en la base de datos. Contacta al administrador.');
          setUserProfile(null);
          setLoading(false);
          return;
        }

        const data = userDoc.data() as UserProfile;
        if (!isCeoLogin && !['ceo', 'admin', 'seller'].includes(String(data.role || '').toLowerCase())) {
          toast.error('Tu rol ya no es valido en el sistema. Contacta al administrador.');
          setUserProfile(null);
          setLoading(false);
          return;
        }

        const normalizedSellerId = (data.sellerId || '').trim() || email.split('@')[0].toUpperCase();
        const normalizedProfile: UserProfile = isCeoLogin
          ? {
            ...data,
            email,
            name: data.name || 'CEO',
            role: 'ceo',
            commissionRate: typeof data.commissionRate === 'number' ? data.commissionRate : 0,
            status: data.status || 'active',
            sellerId: normalizedSellerId || 'CEO01',
            currentDebt: typeof data.currentDebt === 'number' ? data.currentDebt : 0,
            canLiquidate: data.canLiquidate ?? true,
            preferredChancePrice: typeof data.preferredChancePrice === 'number' ? data.preferredChancePrice : undefined,
          }
          : {
            ...data,
            email,
            sellerId: normalizedSellerId,
          } as UserProfile;

        setUserProfile(normalizedProfile);
        setLoading(false);
      }, (error) => {
        console.error('Error listening user profile:', error);
        toast.error('Error cargando tu perfil. Intenta iniciar sesion de nuevo.');
        setUserProfile(null);
        setLoading(false);
      });
    };

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      clearProfileListener();
      setLoading(true);
      setUserProfile(u ? undefined : null);
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
            handleLogout();
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            toast.info('Debe iniciar sesion nuevamente por cambio de dia operativo.');
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

            if (!userDoc.exists()) {
              console.warn('CEO profile missing and bootstrap did not run.', { email });
              toast.error('No se encontro el perfil del owner. Contacta al administrador.');
              setUserProfile(null);
              setLoading(false);
              return;
            }

            subscribeToUserProfile(email, true);
          } catch (error) {
            console.error('Error fetching CEO profile:', error);
            toast.error('Error cargando perfil del owner. Intenta cerrar e iniciar sesion nuevamente.');
            setUserProfile(null);
            setLoading(false);
          }
        } else {
          subscribeToUserProfile(email, false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearProfileListener();
      unsubscribe();
    };
  }, [enforceSessionByOperationalDay, getCurrentOperationalSessionDay, getStoredSessionDay, handleLogout, markSessionDay]);

  useEffect(() => {
    if (!user || !enforceSessionByOperationalDay) return;

    const interval = setInterval(() => {
      if (!isSessionValid()) {
        handleLogout();
        toast.info('Su sesion expiro por cambio de dia operativo. Inicie sesion nuevamente.');
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
