import { useMemo, useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import type { LotteryTicket } from '../../../types/bets';

export function useCierresDomain(params: any) {
  const {
    historyTickets,
    lotteries,
    cleanText,
    canAccessAllUsers,
    operationalSellerId,
    ticketMatchesGlobalChancePrice,
    historyDate,
    shareImageDataUrl,
    downloadDataUrlFile,
  } = params;

  const [cierreLottery, setCierreLottery] = useState('');
  const cierreRef = useRef<HTMLDivElement>(null);

  const cierreData = useMemo(() => {
    if (!cierreLottery) return null;

    const scopedTickets = (historyTickets as LotteryTicket[]).filter(t => {
      if (t.status === 'cancelled') return false;
      if (!ticketMatchesGlobalChancePrice(t)) return false;
      if (canAccessAllUsers) return true;
      return !!operationalSellerId && t.sellerId === operationalSellerId;
    });

    const bets = scopedTickets.flatMap(t => t.bets || []).filter(b => cleanText(b.lottery) === cleanText(cierreLottery));
    const lotteryInfo = lotteries.find((l: any) => cleanText(l.name) === cleanText(cierreLottery));

    const totalTiempos = bets.filter(b => b.type === 'CH').reduce((sum, b) => sum + (b.quantity || 0), 0);
    const totalVendido = bets.filter(b => b.type === 'CH').reduce((sum, b) => sum + (b.amount || 0), 0);

    const col1 = Array.from({ length: 34 }).map((_, i) => i.toString().padStart(2, '0'));
    const col2 = Array.from({ length: 34 }).map((_, i) => (i + 34).toString().padStart(2, '0'));
    const col3 = Array.from({ length: 32 }).map((_, i) => (i + 68).toString().padStart(2, '0'));

    const getQty = (num: string) => {
      const qty = bets.filter(b => b.type === 'CH' && b.number === num).reduce((s, b) => s + (b.quantity || 0), 0);
      return qty > 0 ? qty : '-';
    };

    const combos: Record<string, number> = {};
    bets.forEach(b => {
      if (b.type === 'PL' || b.type === 'BL') {
        const key = `${b.type} ${b.number}`;
        combos[key] = (combos[key] || 0) + (b.amount || 0);
      }
    });

    const comboEntries = Object.entries(combos).sort((a, b) => b[1] - a[1]);

    return {
      lotteryInfo,
      totalTiempos,
      totalVendido,
      col1,
      col2,
      col3,
      getQty,
      comboEntries,
    };
  }, [canAccessAllUsers, cierreLottery, cleanText, historyTickets, lotteries, operationalSellerId, ticketMatchesGlobalChancePrice]);

  const handleDownloadCierre = async () => {
    if (!cierreRef.current || !cierreLottery) return;
    const toastId = toast.loading('Generando imagen...');
    const cierreNode = cierreRef.current;
    const isAndroid = Capacitor.getPlatform() === 'android';
    const originalWidth = cierreNode.style.width;
    const originalMaxWidth = cierreNode.style.maxWidth;
    const originalMinHeight = cierreNode.style.minHeight;
    const originalMargin = cierreNode.style.margin;
    const originalBackgroundColor = cierreNode.style.backgroundColor;

    try {
      const exportWidthPx = isAndroid ? 640 : 720;
      const exportHeightPx = Math.max(900, cierreNode.scrollHeight);
      const pixelRatio = isAndroid ? 1 : 1.5;
      const imageQuality = isAndroid ? 0.82 : 0.9;
      const fileName = `Cierre-${cleanText(cierreLottery)}-${historyDate}.jpg`;

      cierreNode.style.width = `${exportWidthPx}px`;
      cierreNode.style.maxWidth = 'none';
      cierreNode.style.minHeight = `${exportHeightPx}px`;
      cierreNode.style.margin = '0 auto';
      cierreNode.style.backgroundColor = '#ffffff';

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const dataUrl = await htmlToImage.toJpeg(cierreNode, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio,
        width: exportWidthPx,
        height: Math.max(exportHeightPx, cierreNode.scrollHeight),
        style: {
          width: `${exportWidthPx}px`,
          maxWidth: 'none',
          minHeight: `${exportHeightPx}px`,
          margin: '0 auto',
          backgroundColor: '#ffffff',
        },
        quality: imageQuality,
      });

      const shared = await shareImageDataUrl({
        dataUrl,
        fileName,
        title: `Cierre ${cleanText(cierreLottery)}`,
        text: `Reporte de cierre de ${cleanText(cierreLottery)} para el dia ${historyDate}`,
        dialogTitle: 'Compartir Cierre',
      });

      if (shared) {
        toast.success('Cierre compartido', { id: toastId });
      } else {
        downloadDataUrlFile(dataUrl, fileName);
        toast.info('Se descargo la imagen para envio manual', { id: toastId });
      }
    } catch (error) {
      toast.error('Error al generar la imagen', { id: toastId });
    } finally {
      cierreNode.style.width = originalWidth;
      cierreNode.style.maxWidth = originalMaxWidth;
      cierreNode.style.minHeight = originalMinHeight;
      cierreNode.style.margin = originalMargin;
      cierreNode.style.backgroundColor = originalBackgroundColor;
    }
  };

  return {
    cierreLottery,
    setCierreLottery,
    cierreRef,
    cierreData,
    handleDownloadCierre,
  };
}
