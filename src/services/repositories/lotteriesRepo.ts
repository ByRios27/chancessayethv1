import { addDoc, collection, db, deleteDoc, doc, getDocs, updateDoc, writeBatch } from '../firebase/client';
import type { Lottery } from '../../types/lotteries';

export const createLottery = async (payload: Partial<Lottery> & Record<string, any>) => {
  return addDoc(collection(db, 'lotteries'), payload);
};

export const updateLottery = async (lotteryId: string, payload: Partial<Lottery> & Record<string, any>) => {
  return updateDoc(doc(db, 'lotteries', lotteryId), payload);
};

export const deleteLottery = async (lotteryId: string) => {
  return deleteDoc(doc(db, 'lotteries', lotteryId));
};

export const setLotteryActive = async (lotteryId: string, active: boolean) => {
  return updateDoc(doc(db, 'lotteries', lotteryId), { active });
};

const normalizeReferenceName = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const replaceBetLotteryName = (
  bets: unknown,
  lotteryId: string,
  previousNameKey: string,
  nextName: string
) => {
  if (!Array.isArray(bets)) {
    return { bets, changed: false, changedBets: 0 };
  }

  let changedBets = 0;
  const nextBets = bets.map((bet: any) => {
    const matchesById = bet?.lotteryId && bet.lotteryId === lotteryId;
    const matchesLegacyName = !bet?.lotteryId && normalizeReferenceName(bet?.lottery) === previousNameKey;
    if (!matchesById && !matchesLegacyName) return bet;
    changedBets += 1;
    return { ...bet, lottery: nextName, lotteryId: bet?.lotteryId || lotteryId };
  });

  return {
    bets: nextBets,
    changed: changedBets > 0,
    changedBets,
  };
};

const commitInChunks = async (updates: Array<{ ref: any; payload: Record<string, any> }>) => {
  for (let index = 0; index < updates.length; index += 450) {
    const batch = writeBatch(db);
    updates.slice(index, index + 450).forEach((update) => {
      batch.update(update.ref, update.payload);
    });
    await batch.commit();
  }
};

export const renameLotteryReferences = async ({
  lotteryId,
  previousName,
  nextName,
}: {
  lotteryId: string;
  previousName: string;
  nextName: string;
}) => {
  const previousNameKey = normalizeReferenceName(previousName);
  const nextNameKey = normalizeReferenceName(nextName);

  if (!lotteryId || !previousNameKey || !nextName || previousNameKey === nextNameKey) {
    return {
      liveTickets: 0,
      liveTicketBets: 0,
      liveResults: 0,
      archiveDays: 0,
      archivedTickets: 0,
      archivedTicketBets: 0,
      archivedResults: 0,
    };
  }

  const [ticketsSnapshot, resultsSnapshot, archivesSnapshot] = await Promise.all([
    getDocs(collection(db, 'tickets')),
    getDocs(collection(db, 'results')),
    getDocs(collection(db, 'daily_archives')),
  ]);

  const ticketUpdates: Array<{ ref: any; payload: Record<string, any> }> = [];
  let liveTicketBets = 0;

  ticketsSnapshot.docs.forEach((docSnap: any) => {
    const data = docSnap.data() || {};
    const nextBets = replaceBetLotteryName(data.bets, lotteryId, previousNameKey, nextName);
    if (!nextBets.changed) return;

    liveTicketBets += nextBets.changedBets;
    ticketUpdates.push({
      ref: docSnap.ref,
      payload: { bets: nextBets.bets },
    });
  });

  const resultUpdates: Array<{ ref: any; payload: Record<string, any> }> = [];
  resultsSnapshot.docs.forEach((docSnap: any) => {
    const data = docSnap.data() || {};
    const matchesLottery = data.lotteryId === lotteryId || normalizeReferenceName(data.lotteryName) === previousNameKey;
    if (!matchesLottery) return;

    resultUpdates.push({
      ref: docSnap.ref,
      payload: { lotteryName: nextName },
    });
  });

  const archiveUpdates: Array<{ ref: any; payload: Record<string, any> }> = [];
  let archivedTickets = 0;
  let archivedTicketBets = 0;
  let archivedResults = 0;

  archivesSnapshot.docs.forEach((docSnap: any) => {
    const data = docSnap.data() || {};
    let changed = false;
    const payload: Record<string, any> = {};

    if (Array.isArray(data.tickets)) {
      const nextTickets = data.tickets.map((ticket: any) => {
        const nextBets = replaceBetLotteryName(ticket?.bets, lotteryId, previousNameKey, nextName);
        if (!nextBets.changed) return ticket;

        changed = true;
        archivedTickets += 1;
        archivedTicketBets += nextBets.changedBets;
        return { ...ticket, bets: nextBets.bets };
      });

      if (changed) {
        payload.tickets = nextTickets;
      }
    }

    if (Array.isArray(data.results)) {
      const nextResults = data.results.map((result: any) => {
        const matchesLottery = result?.lotteryId === lotteryId || normalizeReferenceName(result?.lotteryName) === previousNameKey;
        if (!matchesLottery) return result;

        changed = true;
        archivedResults += 1;
        return { ...result, lotteryName: nextName };
      });

      if (nextResults !== data.results && nextResults.some((result: any, index: number) => result !== data.results[index])) {
        payload.results = nextResults;
      }
    }

    if (!changed) return;
    archiveUpdates.push({ ref: docSnap.ref, payload });
  });

  await commitInChunks([...ticketUpdates, ...resultUpdates, ...archiveUpdates]);

  return {
    liveTickets: ticketUpdates.length,
    liveTicketBets,
    liveResults: resultUpdates.length,
    archiveDays: archiveUpdates.length,
    archivedTickets,
    archivedTicketBets,
    archivedResults,
  };
};
