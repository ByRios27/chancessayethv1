import { useEffect, useRef } from 'react';

import { format } from 'date-fns';

import { shouldRunAutoCleanupNow } from '../services/calculations/operationalArchive';

interface UseAutoOperationalCleanupParams {
  tick: number;
  userUid?: string;
  userRole?: string;
  getQuickOperationalDate: (offsetDays: number) => string;
  runOperationalArchiveAndCleanup: (params: {
    targetBusinessDay: string;
    trigger: 'automatic';
  }) => Promise<unknown>;
}

export function useAutoOperationalCleanup({
  tick,
  userUid,
  userRole,
  getQuickOperationalDate,
  runOperationalArchiveAndCleanup,
}: UseAutoOperationalCleanupParams) {
  const autoCleanupRunningRef = useRef(false);

  useEffect(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const autoCleanupExecutionMinutes = 4 * 60 + 30;
    const todayKey = format(now, 'yyyy-MM-dd');
    const autoCleanupStorageKey = 'autoCleanupLastRunDate';
    const shouldRunNow = shouldRunAutoCleanupNow({
      userUid,
      userRole,
      isAlreadyRunning: autoCleanupRunningRef.current,
      currentMinutes,
      executionMinutes: autoCleanupExecutionMinutes,
      lastRunDate: localStorage.getItem(autoCleanupStorageKey),
      todayKey,
    });
    if (!shouldRunNow) return;

    autoCleanupRunningRef.current = true;

    (async () => {
      try {
        const targetBusinessDay = getQuickOperationalDate(-1);
        await runOperationalArchiveAndCleanup({
          targetBusinessDay,
          trigger: 'automatic'
        });

        localStorage.setItem(autoCleanupStorageKey, todayKey);
      } catch (error) {
        console.error('Error en limpieza automática 4:30 AM:', error);
      } finally {
        autoCleanupRunningRef.current = false;
      }
    })();
  }, [getQuickOperationalDate, runOperationalArchiveAndCleanup, tick, userRole, userUid]);
}
