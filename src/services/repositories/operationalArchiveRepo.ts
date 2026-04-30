import {
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from '../firebase/client';

export const fetchOperationalArchiveSourceSnapshots = async ({
  start,
  end,
  targetBusinessDay,
}: {
  start: Date;
  end: Date;
  targetBusinessDay: string;
}) => {
  const ticketsSnapshot = await getDocs(query(
    collection(db, 'tickets'),
    where('timestamp', '>=', start),
    where('timestamp', '<', end)
  ));

  const injectionsSnapshot = await getDocs(query(
    collection(db, 'injections'),
    where('date', '==', targetBusinessDay)
  ));

  const resultsSnapshot = await getDocs(query(
    collection(db, 'results'),
    where('date', '==', targetBusinessDay)
  ));

  const settlementsSnapshot = await getDocs(query(
    collection(db, 'settlements'),
    where('date', '==', targetBusinessDay)
  ));

  const appAlertsByMetadataDateSnapshot = await getDocs(query(
    collection(db, 'app_alerts'),
    where('metadata.date', '==', targetBusinessDay)
  ));

  const appAlertsByCreatedAtSnapshot = await getDocs(query(
    collection(db, 'app_alerts'),
    where('createdAt', '>=', start),
    where('createdAt', '<', end)
  ));

  const appAlertDocsById = new Map<string, any>();
  appAlertsByMetadataDateSnapshot.docs.forEach((docSnap) => appAlertDocsById.set(docSnap.id, docSnap));
  appAlertsByCreatedAtSnapshot.docs.forEach((docSnap) => appAlertDocsById.set(docSnap.id, docSnap));

  return {
    ticketsSnapshot,
    injectionsSnapshot,
    resultsSnapshot,
    settlementsSnapshot,
    appAlertsSnapshot: {
      docs: Array.from(appAlertDocsById.values()),
    },
  };
};

export const readOperationalArchiveByDate = async (targetBusinessDay: string) => {
  const archiveRef = doc(db, 'daily_archives', targetBusinessDay);
  const archiveSnapshot = await getDoc(archiveRef);
  return { archiveRef, archiveSnapshot };
};

export const createOperationalArchiveIfMissing = async ({
  archiveRef,
  archiveSnapshot,
  archivePayload,
}: {
  archiveRef: any;
  archiveSnapshot: { exists: () => boolean };
  archivePayload: Record<string, any>;
}) => {
  if (!archiveSnapshot.exists()) {
    await setDoc(archiveRef, archivePayload);
  }
  return archiveSnapshot.exists();
};

export const deleteOperationalLiveDocsInChunks = async ({
  docsToDelete,
  chunkSize = 450,
}: {
  docsToDelete: Array<{ ref: any }>;
  chunkSize?: number;
}) => {
  for (let i = 0; i < docsToDelete.length; i += chunkSize) {
    const batch = writeBatch(db);
    const chunk = docsToDelete.slice(i, i + chunkSize);
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
};
