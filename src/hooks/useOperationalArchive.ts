import { useCallback } from 'react';
import { serverTimestamp } from '../firebase';
import {
  buildArchivePayload,
  buildDocsToDelete,
  mapSnapshotDocs,
  shouldResetOperationalStateAfterArchive,
} from '../services/calculations/operationalArchive';
import {
  createOperationalArchiveIfMissing,
  deleteOperationalLiveDocsInChunks,
  fetchOperationalArchiveSourceSnapshots,
  readOperationalArchiveByDate,
} from '../services/repositories/operationalArchiveRepo';

export function useOperationalArchive({
  businessDayKey,
  getBusinessDayRange,
  archivedBy,
  onResetOperationalState,
}: {
  businessDayKey: string;
  getBusinessDayRange: (day: string) => { start: Date; end: Date };
  archivedBy: string;
  onResetOperationalState: () => void;
}) {
  const runOperationalArchiveAndCleanup = useCallback(async ({
    targetBusinessDay,
    trigger,
  }: {
    targetBusinessDay: string;
    trigger: 'manual' | 'automatic';
  }) => {
    const { start, end } = getBusinessDayRange(targetBusinessDay);

    const [sourceSnapshots, archiveRead] = await Promise.all([
      fetchOperationalArchiveSourceSnapshots({ start, end, targetBusinessDay }),
      readOperationalArchiveByDate(targetBusinessDay),
    ]);

    const ticketsToArchive = mapSnapshotDocs(sourceSnapshots.ticketsSnapshot.docs);
    const injectionsToArchive = mapSnapshotDocs(sourceSnapshots.injectionsSnapshot.docs);
    const resultsToArchive = mapSnapshotDocs(sourceSnapshots.resultsSnapshot.docs);
    const settlementsToArchive = mapSnapshotDocs(sourceSnapshots.settlementsSnapshot.docs);

    const archivePayload = buildArchivePayload({
      targetBusinessDay,
      ticketsToArchive,
      resultsToArchive,
      settlementsToArchive,
      injectionsToArchive,
      createdAt: serverTimestamp(),
      archivedBy,
      trigger,
    });

    const archiveAlreadyExists = await createOperationalArchiveIfMissing({
      archiveRef: archiveRead.archiveRef,
      archiveSnapshot: archiveRead.archiveSnapshot,
      archivePayload,
    });

    const docsToDelete = buildDocsToDelete({
      ticketsDocs: sourceSnapshots.ticketsSnapshot.docs,
      resultsDocs: sourceSnapshots.resultsSnapshot.docs,
      injectionsDocs: sourceSnapshots.injectionsSnapshot.docs,
    });

    await deleteOperationalLiveDocsInChunks({ docsToDelete, chunkSize: 450 });

    if (shouldResetOperationalStateAfterArchive({ targetBusinessDay, businessDayKey })) {
      onResetOperationalState();
    }

    return {
      targetBusinessDay,
      archiveAlreadyExists,
      deletedCount: docsToDelete.length,
    };
  }, [archivedBy, businessDayKey, getBusinessDayRange, onResetOperationalState]);

  return {
    runOperationalArchiveAndCleanup,
  };
}
