import { db, doc, getDoc, setDoc, updateDoc } from '../firebase/client';

export const readDailyArchive = async (date: string) => {
  const archiveRef = doc(db, 'daily_archives', date);
  return getDoc(archiveRef);
};

export const createDailyArchiveIfMissing = async (date: string, payload: Record<string, any> = {}) => {
  const archiveRef = doc(db, 'daily_archives', date);
  return setDoc(archiveRef, payload, { merge: true });
};

export const updateArchiveTickets = async (date: string, tickets: any[]) => {
  const archiveRef = doc(db, 'daily_archives', date);
  return updateDoc(archiveRef, { tickets });
};

export const deleteTicketFromArchive = async (date: string, ticketId: string) => {
  const archiveRef = doc(db, 'daily_archives', date);
  const snap = await getDoc(archiveRef);
  if (!snap.exists()) return;
  const data = snap.data() || {};
  const currentTickets = Array.isArray(data.tickets) ? data.tickets : [];
  const nextTickets = currentTickets.filter((ticket: any) => ticket?.id !== ticketId);
  return updateDoc(archiveRef, { tickets: nextTickets });
};
