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
  appAlertsToArchive,
  archivedBy,
  trigger,
  createdAt,
}: {
  targetBusinessDay: string;
  ticketsToArchive: Array<Record<string, any>>;
  resultsToArchive: Array<Record<string, any>>;
  settlementsToArchive: Array<Record<string, any>>;
  injectionsToArchive: Array<Record<string, any>>;
  appAlertsToArchive?: Array<Record<string, any>>;
  archivedBy: string;
  trigger: 'manual' | 'automatic';
  createdAt: any;
}) => ({
  date: targetBusinessDay,
  tickets: ticketsToArchive,
  results: resultsToArchive,
  settlements: settlementsToArchive,
  injections: injectionsToArchive,
  appAlerts: appAlertsToArchive || [],
  createdAt,
  archivedBy,
  archiveTrigger: trigger,
});

const normalizeEmail = (value?: unknown) => String(value || '').toLowerCase().trim();

export const buildUserArchivePayloads = ({
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
}) => {
  const archivesByEmail = new Map<string, {
    date: string;
    userEmail: string;
    tickets: Array<Record<string, any>>;
    results: Array<Record<string, any>>;
    settlements: Array<Record<string, any>>;
    injections: Array<Record<string, any>>;
    createdAt: any;
    archivedBy: string;
    archiveTrigger: 'manual' | 'automatic';
  }>();

  const getArchive = (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const existing = archivesByEmail.get(normalizedEmail);
    if (existing) return existing;

    const archive = {
      date: targetBusinessDay,
      userEmail: normalizedEmail,
      tickets: [],
      results: resultsToArchive,
      settlements: [],
      injections: [],
      createdAt,
      archivedBy,
      archiveTrigger: trigger,
    };
    archivesByEmail.set(normalizedEmail, archive);
    return archive;
  };

  ticketsToArchive.forEach((ticket) => {
    const archive = getArchive(ticket.sellerEmail || ticket.userEmail);
    if (archive) archive.tickets.push(ticket);
  });

  injectionsToArchive.forEach((injection) => {
    const archive = getArchive(injection.userEmail || injection.sellerEmail);
    if (archive) archive.injections.push(injection);
  });

  settlementsToArchive.forEach((settlement) => {
    const archive = getArchive(settlement.userEmail || settlement.sellerEmail);
    if (archive) archive.settlements.push(settlement);
  });

  return Array.from(archivesByEmail.values());
};

export const buildDocsToDelete = ({
  ticketsDocs,
  resultsDocs,
  injectionsDocs,
  settlementsDocs = [],
  appAlertsDocs = [],
}: {
  ticketsDocs: QueryDocumentSnapshot[];
  resultsDocs: QueryDocumentSnapshot[];
  injectionsDocs: QueryDocumentSnapshot[];
  settlementsDocs?: QueryDocumentSnapshot[];
  appAlertsDocs?: QueryDocumentSnapshot[];
}) => ([...ticketsDocs, ...resultsDocs, ...injectionsDocs, ...settlementsDocs, ...appAlertsDocs]);

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
  if (!['ceo', 'admin'].includes(userRole)) return false;
  if (isAlreadyRunning) return false;
  if (currentMinutes < executionMinutes) return false;
  if (lastRunDate === todayKey) return false;
  return true;
};
