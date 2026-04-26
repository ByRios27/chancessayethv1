import { format } from 'date-fns';
import { addDoc, collection, db, serverTimestamp } from '../../firebase';
import { getBusinessDate } from '../../utils/dates';

export type DailyAuditEventType =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'INJECTION_CREATED'
  | 'INJECTION_UPDATED'
  | 'INJECTION_DELETED';

interface DailyAuditActor {
  email?: string;
  sellerId?: string;
  name?: string;
  role?: string;
}

interface DailyAuditTarget {
  email?: string;
  sellerId?: string;
  name?: string;
}

export const logDailyAuditEvent = async ({
  type,
  actor,
  target,
  details,
  date,
}: {
  type: DailyAuditEventType;
  actor: DailyAuditActor;
  target?: DailyAuditTarget;
  details?: Record<string, unknown>;
  date?: string;
}) => {
  const operationalDate = date || format(getBusinessDate(), 'yyyy-MM-dd');
  const actorEmail = String(actor.email || '').toLowerCase();
  if (!actorEmail) return;

  await addDoc(collection(db, 'daily_audit_logs', operationalDate, 'events'), {
    type,
    date: operationalDate,
    createdAt: serverTimestamp(),
    actorEmail,
    actorSellerId: actor.sellerId || '',
    actorName: actor.name || '',
    actorRole: String(actor.role || '').toLowerCase(),
    targetEmail: target?.email ? String(target.email).toLowerCase() : '',
    targetSellerId: target?.sellerId || '',
    targetName: target?.name || '',
    details: details || {},
  });
};
