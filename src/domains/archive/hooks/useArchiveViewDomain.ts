import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getBusinessDate } from '../../../utils/dates';
import { useArchiveDomain } from './useArchiveDomain';
import type { LotteryTicket } from '../../../types/bets';
import type { Injection, Settlement } from '../../../types/finance';
import type { LotteryResult } from '../../../types/results';

export function useArchiveViewDomain(params: any) {
  const {
    activeTab,
    businessDayKey,
    userRole,
    userEmail,
    buildFinancialSummary,
    getBusinessDayRange,
    mergeTicketSnapshots,
    operationalSellerId,
    injections,
    settlements,
    tickets,
    setResults,
  } = params;

  const [archiveUserEmail, setArchiveUserEmail] = useState('');
  const [archiveDate, setArchiveDate] = useState<string>(() => {
    const d = getBusinessDate();
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [archiveTickets, setArchiveTickets] = useState<LotteryTicket[]>([]);
  const [archiveInjections, setArchiveInjections] = useState<Injection[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  const [liquidationTicketsSnapshot, setLiquidationTicketsSnapshot] = useState<LotteryTicket[]>([]);
  const [liquidationInjectionsSnapshot, setLiquidationInjectionsSnapshot] = useState<Injection[]>([]);
  const [liquidationResultsSnapshot, setLiquidationResultsSnapshot] = useState<LotteryResult[]>([]);
  const [liquidationSettlementsSnapshot, setLiquidationSettlementsSnapshot] = useState<Settlement[]>([]);
  const [isLiquidationDataLoading, setIsLiquidationDataLoading] = useState(false);
  const [liquidationDate, setLiquidationDate] = useState<string>(format(getBusinessDate(), 'yyyy-MM-dd'));
  const [selectedUserToLiquidate, setSelectedUserToLiquidate] = useState<string>('');

  useEffect(() => {
    if (userRole === 'seller' && userEmail) {
      setSelectedUserToLiquidate(userEmail);
      setArchiveUserEmail(userEmail);
    }
  }, [userRole, userEmail]);

  const { fetchArchiveData, fetchUserOperationalDataByDate } = useArchiveDomain({
    activeTab,
    archiveDate,
    archiveUserEmail,
    businessDayKey,
    buildFinancialSummary,
    getBusinessDayRange,
    mergeTicketSnapshots,
    operationalSellerId,
    injections,
    settlements,
    tickets,
    liquidationDate,
    selectedUserToLiquidate,
    setArchiveInjections,
    setArchiveTickets,
    setIsArchiveLoading,
    setIsLiquidationDataLoading,
    setLiquidationInjectionsSnapshot,
    setLiquidationResultsSnapshot,
    setLiquidationSettlementsSnapshot,
    setLiquidationTicketsSnapshot,
    setResults,
  });

  return {
    archiveUserEmail,
    setArchiveUserEmail,
    archiveDate,
    setArchiveDate,
    archiveTickets,
    setArchiveTickets,
    archiveInjections,
    setArchiveInjections,
    isArchiveLoading,
    fetchArchiveData,
    fetchUserOperationalDataByDate,
    liquidationDate,
    setLiquidationDate,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    liquidationTicketsSnapshot,
    setLiquidationTicketsSnapshot,
    liquidationInjectionsSnapshot,
    setLiquidationInjectionsSnapshot,
    liquidationResultsSnapshot,
    setLiquidationResultsSnapshot,
    liquidationSettlementsSnapshot,
    setLiquidationSettlementsSnapshot,
    isLiquidationDataLoading,
    setIsLiquidationDataLoading,
  };
}
