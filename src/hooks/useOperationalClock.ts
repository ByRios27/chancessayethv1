import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { getBusinessDate } from '../utils/dates';

export function useOperationalClock() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const businessDayKey = useMemo(() => format(getBusinessDate(), 'yyyy-MM-dd'), [tick]);

  const getQuickOperationalDate = useCallback((offset: number) => {
    const d = getBusinessDate();
    d.setDate(d.getDate() + offset);
    return format(d, 'yyyy-MM-dd');
  }, []);

  const applyOperationalQuickDate = useCallback((setter: (value: string) => void, offset: number) => {
    setter(getQuickOperationalDate(offset));
  }, [getQuickOperationalDate]);

  return {
    tick,
    businessDayKey,
    getQuickOperationalDate,
    applyOperationalQuickDate,
  };
}
