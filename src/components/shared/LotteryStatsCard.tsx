import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import type { Lottery, GlobalSettings } from '../../types/lotteries';
import type { LotteryTicket } from '../../types/bets';
import type { UserProfile } from '../../types/users';
import type { LotteryResult } from '../../types/results';
import { cleanText } from '../../utils/text';
import { formatTime12h } from '../../utils/time';

interface LotteryStatsCardProps {
  lottery: Lottery;
  tickets: LotteryTicket[];
  userProfile: UserProfile | null;
  users: UserProfile[];
  results: LotteryResult[];
  historyDate: string;
  selectedUserEmail: string;
  globalSettings: GlobalSettings;
}

const LotteryStatsCard: React.FC<LotteryStatsCardProps> = ({ 
  lottery, 
  tickets, 
  userProfile, 
  users, 
  results, 
  historyDate,
  selectedUserEmail,
  globalSettings
}) => {
  const [expanded, setExpanded] = useState(false);
  const [tappedCell, setTappedCell] = useState<number | null>(null);

  const lotteryTickets = useMemo(() => {
    return tickets.filter(t => t.bets && t.bets.some(b => b.lottery === lottery.name) && t.status !== 'cancelled');
  }, [tickets, lottery.name]);

  const visibleTickets = useMemo(() => {
    let filtered = lotteryTickets;
    if (userProfile?.role === 'seller') {
      filtered = filtered.filter(t => t.sellerEmail?.toLowerCase() === userProfile.email?.toLowerCase());
    } else if (selectedUserEmail !== '') {
      filtered = filtered.filter(t => t.sellerEmail?.toLowerCase() === selectedUserEmail?.toLowerCase());
    }
    return filtered;
  }, [lotteryTickets, userProfile, selectedUserEmail]);

  const visibleBets = useMemo(() => {
    return visibleTickets.flatMap(t => t.bets.filter(b => b.lottery === lottery.name));
  }, [visibleTickets, lottery.name]);

  const totalSales = visibleBets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPlays = visibleBets.length;
  
  const heatmapData = useMemo(() => {
    const data = new Array(100).fill(null).map(() => ({ amount: 0, count: 0 }));
    visibleBets.forEach(b => {
      if (b.type === 'CH' && b.number && b.number.length === 2) {
        const num = parseInt(b.number, 10);
        if (!isNaN(num) && num >= 0 && num <= 99) {
          data[num].amount += b.amount || 0;
          data[num].count += 1;
        }
      }
    });
    return data;
  }, [visibleBets]);

  const maxVolume = Math.max(...heatmapData.map(d => d.count), 1);

  const pales = visibleBets.filter(b => b.type === 'PL');
  const billetes = visibleBets.filter(b => b.type === 'BL');

  const groupedPales = useMemo(() => {
    const groups: Record<string, { count: number, amount: number }> = {};
    pales.forEach(b => {
      if (!b.number) return;
      if (!groups[b.number]) groups[b.number] = { count: 0, amount: 0 };
      groups[b.number].count += 1;
      groups[b.number].amount += b.amount || 0;
    });
    return Object.entries(groups).map(([number, data]) => ({ number, ...data })).sort((a, b) => b.amount - a.amount);
  }, [pales]);

  const groupedBilletes = useMemo(() => {
    const groups: Record<string, { count: number, amount: number }> = {};
    billetes.forEach(b => {
      if (!b.number) return;
      if (!groups[b.number]) groups[b.number] = { count: 0, amount: 0 };
      groups[b.number].count += 1;
      groups[b.number].amount += b.amount || 0;
    });
    return Object.entries(groups).map(([number, data]) => ({ number, ...data })).sort((a, b) => b.amount - a.amount);
  }, [billetes]);

  const userBreakdown = useMemo(() => {
    if (userProfile?.role === 'seller') return [];
    const breakdown: Record<string, number> = {};
    lotteryTickets.forEach(t => {
      const tBets = t.bets.filter(b => b.lottery === lottery.name);
      const tAmount = tBets.reduce((sum, b) => sum + (b.amount || 0), 0);
      if (tAmount > 0) {
        breakdown[t.sellerEmail || 'Unknown'] = (breakdown[t.sellerEmail || 'Unknown'] || 0) + tAmount;
      }
    });
    return Object.entries(breakdown).map(([email, amount]) => ({
      email,
      name: users.find(u => u.email === email)?.name || email,
      amount
    })).sort((a, b) => b.amount - a.amount);
  }, [lotteryTickets, userProfile, users, lottery.name]);

  const result = results.find(r => r.lotteryName === lottery.name && r.date === historyDate);
  const hasResult = !!result;
  const cardBgClass = hasResult ? 'bg-[#3F1616]/80 border-[#7F1D1D]/60' : 'bg-[#111827] border-gray-800';

  return (
    <div className={`rounded-xl border ${cardBgClass} overflow-hidden transition-all duration-300 mb-4`}>
      <div 
        className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors flex justify-between items-center gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-base font-medium text-[#E5E7EB] tracking-wide">{cleanText(lottery.name)}</h3>
            <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mt-1 font-normal">
              <span>{lottery.drawTime}</span>
              <span>•</span>
              <span>{historyDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[10px] text-[#9CA3AF] font-medium tracking-wider uppercase">Precio</span>
            <span className="text-base font-semibold text-[#34D399]">${totalSales.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#9CA3AF] font-medium tracking-wider uppercase">PZS</span>
            <span className="text-base font-semibold text-[#E5E7EB]">{totalPlays}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-[#9CA3AF] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800/50 overflow-hidden"
          >
            <div className="p-4 space-y-6">
              
              {/* Resultados */}
              {result && (
                <div className="flex gap-4 justify-start items-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-medium text-[#9CA3AF] mb-1">1RO</span>
                    <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm font-semibold px-3 py-1 rounded-md min-w-[2.5rem] text-center">
                      {result.firstPrize}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-medium text-[#9CA3AF] mb-1">2DO</span>
                    <span className="bg-gray-500/10 border border-gray-500/30 text-gray-300 text-sm font-semibold px-3 py-1 rounded-md min-w-[2.5rem] text-center">
                      {result.secondPrize}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-medium text-[#9CA3AF] mb-1">3RO</span>
                    <span className="bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold px-3 py-1 rounded-md min-w-[2.5rem] text-center">
                      {result.thirdPrize}
                    </span>
                  </div>
                </div>
              )}

              {/* Heatmap */}
              <div>
                <div className="grid grid-cols-10 gap-1">
                  {heatmapData.map((data, index) => {
                    const numStr = index.toString().padStart(2, '0');
                    const isFirst = result?.firstPrize ? result.firstPrize.slice(-2) === numStr : false;
                    const isSecond = result?.secondPrize ? result.secondPrize.slice(-2) === numStr : false;
                    const isThird = result?.thirdPrize ? result.thirdPrize.slice(-2) === numStr : false;
                    
                    const isWinner = isFirst || isSecond || isThird;
                    
                    let bgColor = 'bg-[#1F2937]/30';
                    let textColor = 'text-[#9CA3AF]';
                    let borderClass = 'border-transparent';
                    
                    if (data.count > 0) {
                      const intensity = 0.15 + (data.count / maxVolume) * 0.85;
                      bgColor = `rgba(34, 197, 94, ${intensity * 0.3})`;
                      textColor = 'text-[#34D399]';
                    }

                    let prizeAmount = 0;
                    let potentialPrize = 0;
                    
                    if (data.count > 0) {
                      visibleBets.forEach(b => {
                        if (b.type === 'CH' && b.number === numStr) {
                          const pricePerChance = lottery.pricePerUnit || 0.25;
                          const quantity = (b.amount || 0) / pricePerChance;
                          const priceConfig = globalSettings.chancePrices?.find(cp => Math.abs(cp.price - pricePerChance) < 0.001);
                          
                          potentialPrize += (priceConfig?.ch1 || 0) * quantity;
                          if (isFirst) prizeAmount += (priceConfig?.ch1 || 0) * quantity;
                          if (isSecond) prizeAmount += (priceConfig?.ch2 || 0) * quantity;
                          if (isThird) prizeAmount += (priceConfig?.ch3 || 0) * quantity;
                        }
                      });
                    }

                    const isLoss = prizeAmount > data.amount;

                    if (isWinner) {
                      borderClass = isFirst ? 'border-yellow-500/50' : isSecond ? 'border-gray-400/50' : 'border-orange-500/50';
                      textColor = isFirst ? 'text-yellow-500' : isSecond ? 'text-gray-300' : 'text-orange-400';
                      if (data.count > 0) {
                        // Highlight if winning number has sales
                        bgColor = isFirst ? 'bg-yellow-500/10' : isSecond ? 'bg-gray-500/10' : 'bg-orange-500/10';
                      }
                    }
                    
                    const isTapped = tappedCell === index;
                    const displayPrize = isWinner ? prizeAmount : potentialPrize;
                    const prizeLabel = isWinner ? 'Premio' : 'Paga';

                    return (
                      <div 
                        key={index}
                        onClick={() => {
                          if (data.count > 0) {
                            setTappedCell(isTapped ? null : index);
                          }
                        }}
                        className={`aspect-square flex flex-col items-center justify-center rounded border ${borderClass} ${bgColor} transition-colors relative ${data.count > 0 ? 'cursor-pointer' : ''}`}
                      >
                        {isLoss && data.count > 0 && !isTapped && (
                          <div className="absolute -top-2 -right-2 bg-[#111827] text-yellow-500 text-[8px] font-semibold px-1 rounded border border-yellow-500/50 z-10 whitespace-nowrap">
                            (+${prizeAmount.toFixed(0)})
                          </div>
                        )}
                        
                        {isTapped ? (
                          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-200">
                            <span className="text-[8px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">{prizeLabel}</span>
                            <span className={`text-[10px] font-bold ${isWinner ? textColor : 'text-[#34D399]'}`}>
                              ${displayPrize.toFixed(0)}
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className={`text-sm font-medium leading-none ${textColor}`}>
                              {numStr}
                            </span>
                            {data.count > 0 && (
                              <span className={`text-[10px] mt-1 font-normal ${isWinner ? textColor : 'text-[#34D399]/70'}`}>
                                {data.count}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pales y Billetes */}
              {(groupedPales.length > 0 || groupedBilletes.length > 0) && (
                <div className="border-t border-gray-800/50 pt-6 mt-6">
                  <h4 className="text-sm font-medium text-[#E5E7EB] mb-4 text-center tracking-widest">COMBINACIONES VENDIDAS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {groupedPales.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3 border-b border-gray-800/50 pb-2">PALES:</h5>
                        <div className="space-y-2">
                          {groupedPales.map(p => (
                            <div key={p.number} className="flex justify-between items-center bg-[#1F2937]/20 px-3 py-2 rounded">
                              <span className="text-sm font-medium text-[#E5E7EB]">{p.number}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-[#9CA3AF]">{p.count}x</span>
                                <span className="text-sm font-semibold text-[#34D399]">${p.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {groupedBilletes.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3 border-b border-gray-800/50 pb-2">BILLETES:</h5>
                        <div className="space-y-2">
                          {groupedBilletes.map(b => (
                            <div key={b.number} className="flex justify-between items-center bg-[#1F2937]/20 px-3 py-2 rounded">
                              <span className="text-sm font-medium text-[#E5E7EB]">{b.number}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-[#9CA3AF]">{b.count}x</span>
                                <span className="text-sm font-semibold text-[#34D399]">${b.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ventas por usuario */}
              {userProfile?.role !== 'seller' && userBreakdown.length > 0 && (
                <div className="bg-[#1F2937]/30 rounded-lg p-4 border border-gray-800/50">
                  <h4 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Ventas por Usuario</h4>
                  <div className="space-y-3">
                    {userBreakdown.map((ub) => (
                      <div key={ub.email} className="flex justify-between items-center">
                        <span className="text-sm font-normal text-[#E5E7EB]">{ub.name}</span>
                        <span className="text-sm font-medium text-green-400">${ub.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LotteryStatsCard;
