import { useCallback, useRef, useState } from 'react';

export type SalesBetType = 'CH' | 'PL' | 'BL';
export type SalesEntryFocusedField = 'number' | 'amount';

export function useSalesEntryInput() {
  const [number, setNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isAmountSelected, setIsAmountSelected] = useState(false);
  const [amountEntryStarted, setAmountEntryStarted] = useState(false);
  const [plAmount, setPlAmount] = useState('1.00');
  const [betType, setBetType] = useState<SalesBetType>('CH');
  const [focusedField, setFocusedField] = useState<SalesEntryFocusedField>('number');

  const numberInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = useCallback((key: string) => {
    if (focusedField === 'number') {
      if (key === '.') return;
      const maxLen = betType === 'CH' ? 2 : 4;
      if (number.length < maxLen) {
        const newNumber = number + key;
        setNumber(newNumber);
        if (newNumber.length === maxLen) {
          setFocusedField('amount');
          setAmountEntryStarted(false);
          setTimeout(() => {
            amountInputRef.current?.focus();
          }, 0);
        }
      }
      return;
    }

    const useQuantity = betType === 'CH' || betType === 'BL';
    if (key === '.') {
      const currentVal = useQuantity ? quantity : plAmount;
      if (currentVal.includes('.') || currentVal === '') return;
    }

    if (useQuantity) {
      if (betType === 'BL' && key === '.') return;
      if (!amountEntryStarted) {
        setQuantity(key === '.' ? '0.' : key);
        setAmountEntryStarted(true);
        return;
      }

      const nextQuantity = quantity + key;
      if (betType === 'BL') {
        const parsed = parseInt(nextQuantity, 10);
        if (!isNaN(parsed) && parsed > 5) return;
      }
      setQuantity(nextQuantity);
      setAmountEntryStarted(true);
      return;
    }

    if (!amountEntryStarted) {
      setPlAmount(key === '.' ? '0.' : key);
      setAmountEntryStarted(true);
      return;
    }

    setPlAmount(plAmount + key);
    setAmountEntryStarted(true);
  }, [amountEntryStarted, betType, focusedField, number, plAmount, quantity]);

  const handleBackspace = useCallback(() => {
    if (focusedField === 'number') {
      setNumber(number.slice(0, -1));
      return;
    }

    if (betType === 'CH' || betType === 'BL') {
      const newVal = quantity.slice(0, -1);
      setQuantity(newVal || '');
      setAmountEntryStarted(newVal.length > 0);
      return;
    }

    const newVal = plAmount.slice(0, -1);
    setPlAmount(newVal || '');
    setAmountEntryStarted(newVal.length > 0);
  }, [betType, focusedField, number, plAmount, quantity]);

  const handleClear = useCallback(() => {
    setNumber('');
    if (betType === 'CH' || betType === 'BL') setQuantity('1');
    else setPlAmount('1.00');
    setAmountEntryStarted(false);
    setFocusedField('number');
  }, [betType]);

  return {
    number,
    setNumber,
    quantity,
    setQuantity,
    isAmountSelected,
    setIsAmountSelected,
    amountEntryStarted,
    setAmountEntryStarted,
    plAmount,
    setPlAmount,
    betType,
    setBetType,
    focusedField,
    setFocusedField,
    numberInputRef,
    amountInputRef,
    handleKeyPress,
    handleBackspace,
    handleClear,
  };
}
