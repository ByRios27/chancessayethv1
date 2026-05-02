import { addDoc, collection, db, doc, serverTimestamp, updateDoc } from '../../firebase';
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
    pinned: payload.pinned === true,
    pinnedAt: payload.pinned ? (payload.pinnedAt || serverTimestamp()) : null,
    pinnedByEmail: payload.pinned ? normalizeEmail(payload.pinnedByEmail || payload.createdByEmail) : '',
  });
};

export const updateAppAlertPinned = async ({
  alertId,
  pinned,
  pinnedByEmail,
}: {
  alertId: string;
  pinned: boolean;
  pinnedByEmail?: string;
}) => {
  return updateDoc(doc(db, 'app_alerts', alertId), {
    pinned,
    pinnedAt: pinned ? serverTimestamp() : null,
    pinnedByEmail: pinned ? normalizeEmail(pinnedByEmail) : '',
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
