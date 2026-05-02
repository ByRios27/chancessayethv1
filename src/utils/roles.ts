import type { UserProfile } from '../types/users';

export const CEO_OWNER_EMAIL = (import.meta.env.VITE_CEO_EMAIL || 'zsayeth09@gmail.com').toLowerCase();
export const CEO_OWNER_SELLER_ID = 'ceo01';

export const isCeoOwnerProfile = (userProfile?: Partial<UserProfile> | null) => {
  if (!userProfile) return false;
  const role = String(userProfile.role || '').toLowerCase();
  const email = String(userProfile.email || '').toLowerCase();
  const sellerId = String(userProfile.sellerId || '').toLowerCase();

  return (role === 'ceo' || role === 'owner') && (
    userProfile.isPrimaryCeo === true ||
    email === CEO_OWNER_EMAIL ||
    sellerId === CEO_OWNER_SELLER_ID
  );
};

export const isProtectedCeoOwnerProfile = (userProfile?: Partial<UserProfile> | null) => {
  if (!userProfile) return false;
  const email = String(userProfile.email || '').toLowerCase();
  const sellerId = String(userProfile.sellerId || '').toLowerCase();

  return userProfile.isPrimaryCeo === true ||
    email === CEO_OWNER_EMAIL ||
    sellerId === CEO_OWNER_SELLER_ID;
};
