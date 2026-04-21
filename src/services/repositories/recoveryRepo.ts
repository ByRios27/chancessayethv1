import {
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '../firebase/client';

export const fetchRecoveryLiveTickets = async ({
  start,
  end,
}: {
  start: Date;
  end: Date;
}) => {
  return getDocs(query(
    collection(db, 'tickets'),
    where('timestamp', '>=', start),
    where('timestamp', '<', end),
    limit(5000)
  ));
};

export const fetchRecoveryDailyArchive = async (date: string) => {
  return getDoc(doc(db, 'daily_archives', date));
};

export const updateRecoveryLiveTicket = async (ticketId: string, updatePayload: Record<string, any>) => {
  await updateDoc(doc(db, 'tickets', ticketId), updatePayload);
};

export const updateRecoveryArchivedTicket = async ({
  archiveDate,
  ticketId,
  updatePayload,
  updatedBy,
}: {
  archiveDate: string;
  ticketId: string;
  updatePayload: Record<string, any>;
  updatedBy: string;
}) => {
  const archiveRef = doc(db, 'daily_archives', archiveDate);
  const archiveSnap = await getDoc(archiveRef);
  if (!archiveSnap.exists()) throw new Error('Archivo diario no encontrado');

  const archiveData = archiveSnap.data() as Record<string, any>;
  const archiveTickets: any[] = Array.isArray(archiveData.tickets) ? archiveData.tickets : [];
  const nextArchiveTickets = archiveTickets.map((archiveTicket) =>
    archiveTicket.id === ticketId
      ? { ...archiveTicket, ...updatePayload, recoveryUpdatedAt: new Date().toISOString(), recoveryUpdatedBy: updatedBy }
      : archiveTicket
  );

  await updateDoc(archiveRef, {
    tickets: nextArchiveTickets,
    recoveryUpdatedAt: serverTimestamp(),
    recoveryUpdatedBy: updatedBy,
  });
};

export const deleteRecoveryLiveTicket = async (ticketId: string) => {
  await deleteDoc(doc(db, 'tickets', ticketId));
};

export const deleteRecoveryArchivedTicket = async ({
  archiveDate,
  ticketId,
  updatedBy,
}: {
  archiveDate: string;
  ticketId: string;
  updatedBy: string;
}) => {
  const archiveRef = doc(db, 'daily_archives', archiveDate);
  const archiveSnap = await getDoc(archiveRef);
  if (!archiveSnap.exists()) throw new Error('Archivo diario no encontrado');

  const archiveData = archiveSnap.data() as Record<string, any>;
  const archiveTickets: any[] = Array.isArray(archiveData.tickets) ? archiveData.tickets : [];
  const nextArchiveTickets = archiveTickets.filter((archiveTicket) => archiveTicket.id !== ticketId);

  await updateDoc(archiveRef, {
    tickets: nextArchiveTickets,
    recoveryUpdatedAt: serverTimestamp(),
    recoveryUpdatedBy: updatedBy,
  });
};
