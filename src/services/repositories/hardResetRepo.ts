import { EmailAuthProvider, reauthenticateWithCredential, type User } from 'firebase/auth';

import {
  collection,
  collectionGroup,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from '../firebase/client';

const DELETE_CHUNK_SIZE = 400;
const OPERATIONAL_ROOT_COLLECTIONS = [
  'tickets',
  'results',
  'injections',
  'settlements',
  'app_alerts',
] as const;

export interface FirestoreHardResetSummary {
  tickets: number;
  results: number;
  injections: number;
  settlements: number;
  appAlerts: number;
  dailyArchiveDocs: number;
  dailyArchiveUserDocs: number;
  dailyAuditLogDocs: number;
  dailyAuditEventDocs: number;
  supportDocs: number;
  usersNormalized: number;
}

const emptySummary = (): FirestoreHardResetSummary => ({
  tickets: 0,
  results: 0,
  injections: 0,
  settlements: 0,
  appAlerts: 0,
  dailyArchiveDocs: 0,
  dailyArchiveUserDocs: 0,
  dailyAuditLogDocs: 0,
  dailyAuditEventDocs: 0,
  supportDocs: 0,
  usersNormalized: 0,
});

const rootCollectionSummaryKey: Record<(typeof OPERATIONAL_ROOT_COLLECTIONS)[number], keyof FirestoreHardResetSummary> = {
  tickets: 'tickets',
  results: 'results',
  injections: 'injections',
  settlements: 'settlements',
  app_alerts: 'appAlerts',
};

async function deleteRootCollection(collectionId: string) {
  let deletedCount = 0;

  while (true) {
    const snapshot = await getDocs(query(collection(db, collectionId), limit(DELETE_CHUNK_SIZE)));
    if (snapshot.empty) break;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deletedCount += snapshot.docs.length;
  }

  return deletedCount;
}

async function deleteCollectionGroupDocs(
  groupId: string,
  predicate: (path: string) => boolean = () => true
) {
  let deletedCount = 0;

  while (true) {
    const snapshot = await getDocs(query(collectionGroup(db, groupId), limit(DELETE_CHUNK_SIZE)));
    if (snapshot.empty) break;

    const docsToDelete = snapshot.docs.filter((docSnap) => predicate(docSnap.ref.path));
    if (docsToDelete.length === 0) break;

    const batch = writeBatch(db);
    docsToDelete.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deletedCount += docsToDelete.length;
  }

  return deletedCount;
}

async function deleteSubcollection(parentRef: any, subcollectionId: string) {
  let deletedCount = 0;

  while (true) {
    const snapshot = await getDocs(query(collection(parentRef, subcollectionId), limit(DELETE_CHUNK_SIZE)));
    if (snapshot.empty) break;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deletedCount += snapshot.docs.length;
  }

  return deletedCount;
}

async function deleteDailyArchiveUserDocs() {
  let deletedCount = 0;
  const archivesSnapshot = await getDocs(collection(db, 'daily_archives'));

  for (const archiveDoc of archivesSnapshot.docs) {
    deletedCount += await deleteSubcollection(archiveDoc.ref, 'users');
  }

  return deletedCount;
}

async function deleteKnownDocument(pathSegments: [string, string]) {
  const ref = doc(db, ...pathSegments);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return 0;

  await deleteDoc(ref);
  return 1;
}

async function normalizeUserOperationalBalances(actorEmail: string) {
  let normalizedCount = 0;
  const snapshot = await getDocs(collection(db, 'users'));
  const usersToNormalize = snapshot.docs.filter((docSnap) => {
    const data = docSnap.data() as { currentDebt?: unknown; requiresInjection?: unknown };
    return Number(data.currentDebt || 0) !== 0 || data.requiresInjection === true;
  });

  for (let i = 0; i < usersToNormalize.length; i += DELETE_CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = usersToNormalize.slice(i, i + DELETE_CHUNK_SIZE);
    chunk.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        currentDebt: 0,
        requiresInjection: false,
        updatedAt: serverTimestamp(),
        updatedByEmail: actorEmail,
        updatedByRole: 'ceo',
      });
    });
    await batch.commit();
    normalizedCount += chunk.length;
  }

  return normalizedCount;
}

async function reauthenticateOwner(currentUser: User, password: string) {
  const email = currentUser.email?.toLowerCase();
  if (!email) {
    throw new Error('El usuario actual no tiene email para reautenticacion.');
  }

  const credential = EmailAuthProvider.credential(email, password);
  await reauthenticateWithCredential(currentUser, credential);
  await currentUser.getIdToken(true);
}

export async function hardResetFirestoreData({
  currentUser,
  password,
}: {
  currentUser: User;
  password: string;
}) {
  const trimmedPassword = password.trim();
  if (!trimmedPassword) {
    throw new Error('La contrasena es obligatoria para ejecutar el hard reset.');
  }

  await reauthenticateOwner(currentUser, trimmedPassword);

  const summary = emptySummary();

  for (const collectionId of OPERATIONAL_ROOT_COLLECTIONS) {
    const key = rootCollectionSummaryKey[collectionId];
    summary[key] = await deleteRootCollection(collectionId);
  }

  summary.dailyArchiveUserDocs = await deleteDailyArchiveUserDocs();
  summary.dailyArchiveDocs = await deleteRootCollection('daily_archives');

  summary.dailyAuditEventDocs = await deleteCollectionGroupDocs(
    'events',
    (path) => path.startsWith('daily_audit_logs/') && path.includes('/events/')
  );
  summary.dailyAuditLogDocs = await deleteRootCollection('daily_audit_logs');

  summary.supportDocs += await deleteKnownDocument(['public', 'connectivity']);
  summary.supportDocs += await deleteKnownDocument(['test', 'connection']);
  summary.usersNormalized = await normalizeUserOperationalBalances(currentUser.email?.toLowerCase() || '');

  return summary;
}
