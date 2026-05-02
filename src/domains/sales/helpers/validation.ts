import { format } from 'date-fns';
import type { Lottery } from '../../../types/lotteries';
import type { LotteryResult } from '../../../types/results';
import type { UserProfile } from '../../../types/users';
import { SALES_DOMAIN_SPEC } from '../domainSpec';

interface ValidateSalesAccessParams {
  userProfile?: UserProfile | null;
  operationalSellerId?: string;
}

export function validateSalesAccess({ userProfile, operationalSellerId }: ValidateSalesAccessParams) {
  const hasRegisteredProfile = Boolean(userProfile?.email || userProfile?.role);
  if (!hasRegisteredProfile) return SALES_DOMAIN_SPEC.expectedErrors.missingSellerId;
  if (userProfile?.status && userProfile.status !== 'active') return SALES_DOMAIN_SPEC.expectedErrors.inactiveSeller;
  if (!operationalSellerId?.trim() && !userProfile?.email) return SALES_DOMAIN_SPEC.expectedErrors.missingSellerId;
  return null;
}

interface ValidateLotterySellableParams {
  lottery: Lottery | undefined;
  lotteryName: string;
  isLotteryOpenForSales: (lot: Lottery) => boolean;
  results: LotteryResult[];
  cleanText: (value: string) => string;
}

export function validateLotterySellable({
  lottery,
  lotteryName,
  isLotteryOpenForSales,
  results,
  cleanText,
}: ValidateLotterySellableParams) {
  if (!lottery) return `${SALES_DOMAIN_SPEC.expectedErrors.lotteryNotFound} (${lotteryName})`;
  if (!lottery.active || !isLotteryOpenForSales(lottery)) return `${SALES_DOMAIN_SPEC.expectedErrors.closedLottery} (${lotteryName})`;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const hasResult = results.some((result) => (
    result.date === todayStr &&
    (result.lotteryId ? result.lotteryId === lottery.id : cleanText(result.lotteryName) === cleanText(lotteryName))
  ));
  if (hasResult) return `${SALES_DOMAIN_SPEC.expectedErrors.lotteryWithResults} (${lotteryName})`;

  return null;
}
