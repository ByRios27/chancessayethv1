import { addDoc, collection, db, serverTimestamp } from '../../firebase';
import type { CreateAppAlertPayload } from '../../types/alerts';

const normalizeEmail = (value?: string) => String(value || '').trim().toLowerCase();
const normalizeRole = (value?: string) => String(value || '').trim().toLowerCase();

export const createAppAlert = async (payload: CreateAppAlertPayload) => {
  return addDoc(collection(db, 'app_alerts'), {
    ...payload,
    createdAt: payload.createdAt || serverTimestamp(),
    createdByEmail: normalizeEmail(payload.createdByEmail),
    createdByRole: normalizeRole(payload.createdByRole),
    targetUserEmail: normalizeEmail(payload.targetUserEmail),
    targetRole: normalizeRole(payload.targetRole) || '',
    global: payload.global === true,
    readBy: Array.isArray(payload.readBy) ? payload.readBy : [],
    metadata: payload.metadata || {},
  });
};

export const createCeoAdminAlert = async (payload: Omit<CreateAppAlertPayload, 'targetRole' | 'global' | 'readBy'>) => {
  return createAppAlert({
    ...payload,
    targetRole: 'ceo',
    global: false,
    readBy: [],
  });
};
