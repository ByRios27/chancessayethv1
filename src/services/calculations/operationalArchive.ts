import type { QueryDocumentSnapshot } from 'firebase/firestore';

export const mapSnapshotDocs = <T extends Record<string, any>>(docs: QueryDocumentSnapshot[]) => {
  return docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as unknown as T));
};

export const buildArchivePayload = ({
  targetBusinessDay,
  ticketsToArchive,
  resultsToArchive,
  settlementsToArchive,
  injectionsToArchive,
  archivedBy,
  trigger,
  createdAt,
}: {
  targetBusinessDay: string;
  ticketsToArchive: Array<Record<string, any>>;
  resultsToArchive: Array<Record<string, any>>;
  settlementsToArchive: Array<Record<string, any>>;
  injectionsToArchive: Array<Record<string, any>>;
  archivedBy: string;
  trigger: 'manual' | 'automatic';
  createdAt: any;
}) => ({
  date: targetBusinessDay,
  tickets: ticketsToArchive,
  results: resultsToArchive,
  settlements: settlementsToArchive,
  injections: injectionsToArchive,
  createdAt,
  archivedBy,
  archiveTrigger: trigger,
});

export const buildDocsToDelete = ({
  ticketsDocs,
  resultsDocs,
  injectionsDocs,
}: {
  ticketsDocs: QueryDocumentSnapshot[];
  resultsDocs: QueryDocumentSnapshot[];
  injectionsDocs: QueryDocumentSnapshot[];
}) => ([...ticketsDocs, ...resultsDocs, ...injectionsDocs]);

export const shouldResetOperationalStateAfterArchive = ({
  targetBusinessDay,
  businessDayKey,
}: {
  targetBusinessDay: string;
  businessDayKey: string;
}) => targetBusinessDay === businessDayKey;

export const shouldRunAutoCleanupNow = ({
  userUid,
  userRole,
  isAlreadyRunning,
  currentMinutes,
  executionMinutes,
  lastRunDate,
  todayKey,
}: {
  userUid?: string;
  userRole?: string;
  isAlreadyRunning: boolean;
  currentMinutes: number;
  executionMinutes: number;
  lastRunDate: string | null;
  todayKey: string;
}) => {
  if (!userUid || !userRole) return false;
  if (!['ceo', 'admin', 'programador'].includes(userRole)) return false;
  if (isAlreadyRunning) return false;
  if (currentMinutes < executionMinutes) return false;
  if (lastRunDate === todayKey) return false;
  return true;
};
