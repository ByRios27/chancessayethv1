import { useCallback, useEffect, useMemo } from 'react';
import type { Lottery } from '../../../types/lotteries';
import { normalizeLotteryName } from '../../../utils/text';

interface UseSalesAvailabilityParams {
  sortedLotteries: Lottery[];
  isMultipleMode: boolean;
  multiLottery: string[];
  selectedLottery: string;
  setSelectedLottery: (value: string) => void;
  setMultiLottery: (value: string[]) => void;
  betType: 'CH' | 'PL' | 'BL';
  setBetType: (value: 'CH' | 'PL' | 'BL') => void;
  setNumber: (value: string) => void;
}

export function useSalesAvailability({
  sortedLotteries,
  isMultipleMode,
  multiLottery,
  selectedLottery,
  setSelectedLottery,
  setMultiLottery,
  betType,
  setBetType,
  setNumber,
}: UseSalesAvailabilityParams) {
  const isLotteryOpenForSales = useCallback((lot: Lottery) => {
    if (!lot.active) return false;
    if (!lot.closingTime) return true;

    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const adjustedHour = currentHour < 1 ? currentHour + 24 : currentHour;
      const currentTimeVal = adjustedHour * 60 + currentMinutes;

      const timeParts = lot.closingTime.match(/(\d+):(\d+)/);
      if (!timeParts) return true;

      const closeH = parseInt(timeParts[1], 10);
      const closeM = parseInt(timeParts[2], 10);
      const adjustedCloseH = closeH < 1 ? closeH + 24 : closeH;
      const closeTimeVal = adjustedCloseH * 60 + closeM;

      return currentTimeVal < closeTimeVal;
    } catch {
      return true;
    }
  }, []);

  const activeLotteries = useMemo(() => {
    return sortedLotteries.filter((lottery) => isLotteryOpenForSales(lottery));
  }, [isLotteryOpenForSales, sortedLotteries]);

  const findActiveLotteryByName = useCallback((name: string) => {
    const key = normalizeLotteryName(name);
    return activeLotteries.find((lottery) => lottery.id === name)
      || activeLotteries.find((lottery) => normalizeLotteryName(lottery.name) === key);
  }, [activeLotteries]);

  useEffect(() => {
    if (activeLotteries.length > 0) {
      if (!isMultipleMode) {
        if (!selectedLottery || !findActiveLotteryByName(selectedLottery)) {
          setSelectedLottery(activeLotteries[0].id);
        }
      } else {
        const validMulti = multiLottery.filter((name) => !!findActiveLotteryByName(name));
        if (validMulti.length !== multiLottery.length) {
          setMultiLottery(validMulti);
        }
      }
    } else {
      if (selectedLottery !== '') setSelectedLottery('');
      if (multiLottery.length > 0) setMultiLottery([]);
    }
  }, [
    activeLotteries,
    findActiveLotteryByName,
    isMultipleMode,
    multiLottery,
    selectedLottery,
    setMultiLottery,
    setSelectedLottery,
  ]);

  useEffect(() => {
    const selected = isMultipleMode ? undefined : findActiveLotteryByName(selectedLottery);
    if (selected?.isSpecial4D && betType !== 'CH') {
      setBetType('CH');
      setNumber('');
      return;
    }

    if (betType === 'BL') {
      const supportsBL = isMultipleMode
        ? multiLottery.some((name) => {
          const lottery = findActiveLotteryByName(name);
          return Boolean(lottery?.isFourDigits && !lottery?.isSpecial4D);
        })
        : Boolean(selected?.isFourDigits && !selected?.isSpecial4D);

      if (!supportsBL) {
        setBetType('CH');
        setNumber('');
      }
    }
  }, [betType, findActiveLotteryByName, isMultipleMode, multiLottery, selectedLottery, setBetType, setNumber]);

  return {
    isLotteryOpenForSales,
    activeLotteries,
    findActiveLotteryByName,
  };
}
