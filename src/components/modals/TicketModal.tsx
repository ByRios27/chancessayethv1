import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { jsPDF } from 'jspdf';
import QRCode from 'react-qr-code';
import { DollarSign, Download, Printer, Share2, X } from 'lucide-react';
import type { LotteryTicket } from '../../types/bets';
import type { LotteryResult } from '../../types/results';
import type { Lottery, GlobalSettings } from '../../types/lotteries';
import type { UserProfile } from '../../types/users';
import { cleanText, normalizePlainText } from '../../utils/text';
import { formatTime12h } from '../../utils/time';
import { unifyBets } from '../../utils/bets';

const TicketModal = ({ ticket, results, lotteries, globalSettings, users, onClose, selectedLotteryName }: { ticket: LotteryTicket, results: LotteryResult[], lotteries: Lottery[], globalSettings: GlobalSettings, users: UserProfile[], onClose: () => void, selectedLotteryName?: string }) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [showFullTicket, setShowFullTicket] = useState(!selectedLotteryName);

  const localTotalAmount = (!showFullTicket && selectedLotteryName)
    ? (ticket.bets || []).filter(b => b.lottery === selectedLotteryName).reduce((sum, b) => sum + (b.amount || 0), 0)
    : ticket.totalAmount;

  const getTicketDate = (t: LotteryTicket) => {
    if (!t.timestamp) return format(new Date(), 'yyyy-MM-dd');
    try {
      if (t.timestamp.toDate) return format(t.timestamp.toDate(), 'yyyy-MM-dd');
      if (t.timestamp instanceof Date) return format(t.timestamp, 'yyyy-MM-dd');
      const d = t.timestamp ? new Date(t.timestamp) : new Date();
      return !isNaN(d.getTime()) ? format(d, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    } catch (e) {
      return format(new Date(), 'yyyy-MM-dd');
    }
  };

  const getTicketPrizesLocal = (ticket: LotteryTicket, results: LotteryResult[]) => {
    let totalPrize = 0;
    const winningBets: { idx: number, prize: number, rank: number, lotteryName: string, winningNumber: string, matchType?: string }[] = [];

    if (ticket.status === 'cancelled') return { totalPrize, winningBets };

    const ticketDate = getTicketDate(ticket);

    (ticket.bets || []).forEach((bet, idx) => {
      if (!showFullTicket && selectedLotteryName && bet.lottery !== selectedLotteryName) return;

      const result = results.find(r => cleanText(r.lotteryName) === cleanText(bet.lottery) && r.date === ticketDate);
      if (!result) return;

      const last2 = bet.number.slice(-2);
      
      if (bet.type === 'CH') {
        const quantity = bet.quantity || 1;
        const pricePerChance = (bet.amount || 0) / quantity;
        
        const priceConfig = globalSettings.chancePrices?.find(cp => Math.abs(cp.price - pricePerChance) < 0.001);
        
        if (last2 === result.firstPrize.slice(-2)) {
          const mult = priceConfig ? priceConfig.ch1 : 0;
          const p = mult * quantity;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: 1, lotteryName: bet.lottery, winningNumber: result.firstPrize });
        }
        
        if (result.secondPrize && last2 === result.secondPrize.slice(-2)) {
          const mult = priceConfig ? priceConfig.ch2 : 0;
          const p = mult * quantity;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: 2, lotteryName: bet.lottery, winningNumber: result.secondPrize });
        }
        
        if (result.thirdPrize && last2 === result.thirdPrize.slice(-2)) {
          const mult = priceConfig ? priceConfig.ch3 : 0;
          const p = mult * quantity;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: 3, lotteryName: bet.lottery, winningNumber: result.thirdPrize });
        }
      } else if (bet.type === 'PL' && globalSettings.palesEnabled) {
        // Pale: Wins if it matches combinations of the three prizes in any order
        const n1 = bet.number.slice(0, 2);
        const n2 = bet.number.slice(2, 4);
        const r1 = result.firstPrize.slice(-2);
        const r2 = result.secondPrize.slice(-2);
        const r3 = result.thirdPrize.slice(-2);

        // 1st and 2nd
        if ((n1 === r1 && n2 === r2) || (n1 === r2 && n2 === r1)) {
          const mult = globalSettings.pl12Multiplier || 1000;
          const p = (bet.amount || 0) * mult;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: 1, lotteryName: bet.lottery, winningNumber: r1 + '-' + r2, matchType: 'Palé' });
        }
        // 1st and 3rd
        if ((n1 === r1 && n2 === r3) || (n1 === r3 && n2 === r1)) {
          const mult = globalSettings.pl13Multiplier || 1000;
          const p = (bet.amount || 0) * mult;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: 1, lotteryName: bet.lottery, winningNumber: r1 + '-' + r3, matchType: 'Palé' });
        }
        // 2nd and 3rd
        if ((n1 === r2 && n2 === r3) || (n1 === r3 && n2 === r2)) {
          const mult = globalSettings.pl23Multiplier || 200;
          const p = (bet.amount || 0) * mult;
          totalPrize += p;
          winningBets.push({ idx, prize: p, rank: 2, lotteryName: bet.lottery, winningNumber: r2 + '-' + r3, matchType: 'Palé' });
        }
      } else if (bet.type === 'BL' && globalSettings.billetesEnabled) {
        // Billete: 4 digits. Check against first, second, and third prizes
        const defaultPrizes = { full4: 2000, first3: 200, last3: 200, first2: 20, last2: 20 };
        const multipliers = globalSettings.billeteMultipliers || {
          p1: { ...defaultPrizes },
          p2: { ...defaultPrizes },
          p3: { ...defaultPrizes }
        };

        const checkPrize = (winningNum: string, prizeRank: number) => {
          if (winningNum.length !== 4) return;
          
          const pKey = `p${prizeRank}` as keyof typeof multipliers;
          const prizeMults = multipliers[pKey] || defaultPrizes;
          const betNum = bet.number;
          const amount = bet.amount || 0;

          // Full 4 digits
          if (betNum === winningNum) {
            const p = amount * prizeMults.full4;
            totalPrize += p;
            winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '4 Cifras' });
            return; // If full match, don't count partials for the same prize
          }

          // First 3 digits
          if (betNum.slice(0, 3) === winningNum.slice(0, 3)) {
            const p = amount * prizeMults.first3;
            totalPrize += p;
            winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '3 Primeras' });
          } else if (betNum.slice(0, 2) === winningNum.slice(0, 2)) {
            // First 2 digits
            const p = amount * prizeMults.first2;
            totalPrize += p;
            winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '2 Primeras' });
          }

          // Last 3 digits
          if (betNum.slice(1, 4) === winningNum.slice(1, 4)) {
            const p = amount * prizeMults.last3;
            totalPrize += p;
            winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '3 últimas' });
          } else if (betNum.slice(2, 4) === winningNum.slice(2, 4)) {
            // Last 2 digits
            const p = amount * prizeMults.last2;
            totalPrize += p;
            winningBets.push({ idx, prize: p, rank: prizeRank, lotteryName: bet.lottery, winningNumber: winningNum, matchType: '2 últimas' });
          }
        };

        checkPrize(result.firstPrize, 1);
        checkPrize(result.secondPrize, 2);
        checkPrize(result.thirdPrize, 3);
      }
    });

    return { totalPrize, winningBets };
  };

  const { totalPrize, winningBets } = getTicketPrizesLocal(ticket, results);
  const shareLotteryLabel = selectedLotteryName
    ? cleanText(selectedLotteryName)
    : Array.from(new Set((ticket.bets || []).map(b => cleanText(b.lottery)).filter(Boolean))).join(', ') || 'sorteos varios';
  const shareTicketText = `Total USD ${localTotalAmount.toFixed(2)} - Sorteo: ${shareLotteryLabel}`;

  const compartirTicket = async () => {
    const node = ticketRef.current;

    if (!node) {
      console.error('No se encontró el elemento de exportación');
      toast.error('Error al preparar el ticket');
      return;
    }

    try {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 200));

      const width = node.scrollWidth;
      const height = node.scrollHeight;
      const { toPng } = await import('html-to-image');

      const dataUrl = await toPng(node, {
        width,
        height,
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0',
          left: '0',
          top: '0'
        }
      });

      if (!dataUrl) throw new Error('No se pudo generar la imagen');

      let shared = false;
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Content = dataUrl.split(',')[1];
          const fileName = `ticket-${Date.now()}.png`;
          await Filesystem.writeFile({
            path: fileName,
            data: base64Content,
            directory: Directory.Cache
          });

          const fileUriResult = await Filesystem.getUri({
            directory: Directory.Cache,
            path: fileName
          });
          const fileUri = fileUriResult.uri;

          // Prioritize attaching image file first; some targets drop files when text is included.
          try {
            await Share.share({
              title: 'Ticket de Juego',
              files: [fileUri],
              dialogTitle: 'Compartir Ticket'
            });
            shared = true;
          } catch {
            await Share.share({
              title: 'Ticket de Juego',
              text: shareTicketText,
              files: [fileUri],
              dialogTitle: 'Compartir Ticket'
            });
            shared = true;
          }
        } catch (capErr) {
          console.log('Native share failed, trying web fallback', capErr);
        }
      }

      if (!shared) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `ticket-${ticket.id.slice(0, 8)}.png`, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Ticket de Juego',
              files: [file]
            });
            shared = true;
          } else {
            // Do not fallback to text-only share when image files are unsupported.
            // Download the PNG so user can attach it manually and avoid misleading behavior.
            const link = document.createElement('a');
            link.download = `ticket-${ticket.id.slice(0, 8)}.png`;
            link.href = dataUrl;
            link.click();
            toast.info('Tu navegador móvil no permite adjuntar imagen al compartir. Se descargó el ticket para enviarlo manualmente.');
            shared = true;
          }
        } catch (webErr) {
          if (webErr instanceof Error && (webErr.name === 'AbortError' || webErr.message === 'Share canceled')) {
            return; // User canceled
          }
          throw webErr;
        }
      }
    } catch (err) {
      if (err instanceof Error && (err.message === 'Share canceled' || err.name === 'AbortError')) {
        return;
      }
      console.error('Error detallado al compartir:', err);
      toast.error(`Error al compartir: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const downloadTicket = async () => {
    if (ticketRef.current === null) return;
    try {
      const node = ticketRef.current;
      const width = node.scrollWidth;
      const height = node.scrollHeight;
      const { toPng } = await import('html-to-image');

      const dataUrl = await toPng(node, { 
        width,
        height,
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0',
          left: '0',
          top: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `ticket-${ticket.id.slice(0, 4)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Ticket descargado con éxito');
    } catch (err) {
      console.error(err);
      toast.error('Error al descargar el ticket');
    }
  };

  const printTicket = () => {
    if (!ticket) return;
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 180]
    });

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('CHANCE PRO', 40, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('COMPROBANTE DE VENTA', 40, 20, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Metadata
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('FECHA:', 12, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.timestamp?.toDate ? format(ticket.timestamp.toDate(), 'dd/MM/yyyy hh:mm a') : format(new Date(), 'dd/MM/yyyy hh:mm a'), 28, 30);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('VENDEDOR:', 12, 35);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`${ticket.sellerCode || '---'}`, 28, 35);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('CLIENTE:', 12, 40);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.customerName || 'Cliente General', 28, 40);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('SEQ:', 52, 40);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.sequenceNumber || '---', 62, 40);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('TICKET ID:', 12, 45);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.id.slice(0, 20), 28, 45);
    
    doc.setDrawColor(245, 245, 245);
    doc.line(12, 50, 68, 50);

    let y = 58;

    // Results in PDF if exist
    const ticketDate = getTicketDate(ticket);
    const relevantResults = results.filter(r => 
      r.date === ticketDate && 
      (ticket.bets || []).some(b => b?.lottery === r.lotteryName) &&
      (showFullTicket || !selectedLotteryName || r.lotteryName === selectedLotteryName)
    );

    if (relevantResults.length > 0) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(150, 150, 150);
      doc.text('RESULTADOS DEL SORTEO', 40, y, { align: 'center' });
      y += 5;
      
      relevantResults.forEach(res => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(cleanText(res.lotteryName).toUpperCase(), 12, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`1ro: ${res.firstPrize}  2do: ${res.secondPrize}  3ro: ${res.thirdPrize}`, 14, y);
        y += 6;
      });
      y += 2;
      doc.line(12, y, 68, y);
      y += 8;
    }

    // Table Header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('DESCRIPCION', 12, y);
    doc.text('CANT', 48, y, { align: 'center' });
    doc.text('TOTAL', 68, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(245, 245, 245);
    doc.line(12, y, 68, y);
    y += 8;

    // Bets grouped by lottery
    Array.from(new Set((ticket.bets || []).map(b => cleanText(b?.lottery))))
      .filter(lotName => showFullTicket || !selectedLotteryName || lotName === cleanText(selectedLotteryName))
      .forEach(lotName => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(cleanText(lotName).toUpperCase(), 12, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const betsForLot = (ticket.bets || []).filter(b => b?.lottery === lotName);
      betsForLot.forEach((bet, bIdx) => {
        // Find original index in ticket.bets
        const originalIdx = (ticket.bets || []).findIndex((tb, i) => tb === bet);
        const betWinnings = winningBets.filter(wb => wb.idx === originalIdx);
        const hasWon = betWinnings.length > 0;
        const betTotalPrize = betWinnings.reduce((sum, wb) => sum + wb.prize, 0);

        if (hasWon) {
          doc.setFillColor(255, 250, 200); // Light yellow
          doc.rect(12, y - 4, 56, 6, 'F');
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        let numStr = bet?.number || '??';
        if (bet?.type === 'PL' && numStr.length === 4) {
          numStr = `${numStr.slice(0, 2)}-${numStr.slice(2, 4)}`;
        }
        const desc = `${numStr} (${bet?.type || '?'})`;
        doc.text(desc, 14, y);
        
        if (hasWon) {
          doc.setFontSize(6);
          const matchTypesStr = betWinnings.map(wb => `${wb.rank}º${wb.matchType ? ' ' + wb.matchType : ''}`).join(', ');
          doc.text(`PREMIA: $${betTotalPrize.toFixed(2)} (${matchTypesStr})`, 14, y + 2.5);
          doc.setFontSize(10);
        }

        doc.setTextColor(150, 150, 150);
        doc.text(bet.quantity.toString(), 48, y, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.text(`$${(bet?.amount || 0).toFixed(2)}`, 68, y, { align: 'right' });
        y += 7;
      });
      y += 3;
    });

    // Footer
    y += 2;
    doc.setDrawColor(245, 245, 245);
    doc.line(12, y, 68, y);
    y += 10;

    if (totalPrize > 0) {
      doc.setFillColor(255, 215, 0); // Gold/Yellow
      doc.rect(12, y - 6, 56, 12, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('PREMIO TOTAL:', 14, y + 1);
      doc.text(`USD ${totalPrize.toFixed(2)}`, 66, y + 1, { align: 'right' });
      y += 15;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL A PAGAR:', 12, y);
    doc.text(`USD ${localTotalAmount.toFixed(2)}`, 68, y, { align: 'right' });

    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });
    y += 4;
    doc.text('Verifique su ticket antes de salir.', 40, y, { align: 'center' });

    doc.save(`ticket-${ticket.id.slice(0, 8)}.pdf`);
    toast.success('PDF generado correctamente');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0f172a] text-white p-2 rounded-xl shadow-2xl w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {selectedLotteryName && new Set(ticket.bets.map(b => b.lottery)).size > 1 && (
          <div className="p-4 bg-[#1e293b] border-b border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400">Vista de Ticket</span>
            <div className="flex bg-[#0f172a] p-1 rounded-lg">
              <button 
                onClick={() => setShowFullTicket(false)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${!showFullTicket ? 'bg-[#1e293b] text-white shadow-sm' : 'text-gray-500'}`}
              >
                Solo {selectedLotteryName}
              </button>
              <button 
                onClick={() => setShowFullTicket(true)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${showFullTicket ? 'bg-[#1e293b] text-white shadow-sm' : 'text-gray-500'}`}
              >
                Ticket Completo
              </button>
            </div>
          </div>
        )}
        <div id="ticket" ref={ticketRef} className="bg-white p-4 rounded-lg shadow-sm w-full text-black">
          {/* Header */}
          <div className="text-center mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-xl font-bold italic tracking-tighter leading-none mb-1.5">CHANCE PRO</h2>
            <div className="flex items-center justify-center gap-3">
              <span className="h-[1px] w-8 bg-gray-100"></span>
              <p className="text-[10px] font-mono uppercase font-bold tracking-[0.2em] text-gray-400">Comprobante de Venta</p>
              <span className="h-[1px] w-8 bg-gray-100"></span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4 text-xs font-mono text-black border-b border-gray-100 pb-4">
            <div className="col-span-2 flex justify-between items-center bg-gray-50/50 p-2 rounded-lg border border-gray-100">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase text-gray-400 mb-0.5">Cliente</span>
                <span className="font-bold text-xs truncate max-w-[150px]">{ticket.customerName || 'Cliente General'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold uppercase text-gray-400 mb-0.5">Secuencia</span>
                <span className="font-bold text-xs text-primary">#{ticket.sequenceNumber || '---'}</span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase text-gray-400 mb-0.5">Fecha y Hora</span>
              <span className="font-bold text-xs">{ticket.timestamp?.toDate ? format(ticket.timestamp.toDate(), 'dd/MM/yyyy hh:mm a') : 'Procesando...'}</span>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase text-gray-400 mb-0.5">Vendedor</span>
              <span className="font-bold text-xs">{ticket.sellerCode}</span>
            </div>

            <div className="col-span-2 pt-2 border-t border-gray-50">
              <span className="text-[9px] font-bold uppercase block text-gray-400 mb-0.5">Ticket ID</span>
              <span className="font-mono text-[9px] break-all text-gray-500 leading-tight">{ticket.id}</span>
            </div>
          </div>
          
          {/* Bets Table */}
          <div className="mb-4">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1 px-1 border-b border-gray-100 pb-1">
              <span>Descripción</span>
              <div className="flex gap-4">
                <span>Cant</span>
                <span>Subtotal</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {Array.from(
                (ticket.bets || []).reduce((map, bet) => {
                  const rawLottery = (bet?.lottery || '').trim();
                  const lotteryKey = normalizePlainText(rawLottery);
                  if (!lotteryKey) return map;
                  if (!map.has(lotteryKey)) map.set(lotteryKey, rawLottery);
                  return map;
                }, new Map<string, string>()).entries()
              )
                .filter(([lotteryKey]) => showFullTicket || !selectedLotteryName || lotteryKey === normalizePlainText(selectedLotteryName))
                .map(([lotteryKey, lotName]) => {
                const betsForLot = (ticket.bets || []).filter(b => normalizePlainText(b?.lottery || '') === lotteryKey);
                const unifiedBetsForLot = unifyBets(betsForLot.map(b => ({ ...b, lottery: lotName })));
                const ticketDate = getTicketDate(ticket);
                const result = results.find(r => normalizePlainText(r.lotteryName) === lotteryKey && r.date === ticketDate);

                return (
                  <div key={lotName} className="pt-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-tight text-primary flex items-center gap-1">
                        <span className="w-1 h-2 bg-primary rounded-full"></span>
                        {cleanText(lotName)}
                      </h4>
                      {result && (
                        <div className="flex gap-1">
                          <div className="flex items-center gap-1 bg-gray-50 px-1 py-0.5 rounded border border-gray-100">
                            <span className="text-[6px] uppercase font-bold text-gray-400">1ro</span>
                            <span className="text-[8px] font-black">{result.firstPrize}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-gray-50 px-1 py-0.5 rounded border border-gray-100">
                            <span className="text-[6px] uppercase font-bold text-gray-400">2do</span>
                            <span className="text-[8px] font-black">{result.secondPrize}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-gray-50 px-1 py-0.5 rounded border border-gray-100">
                            <span className="text-[6px] uppercase font-bold text-gray-400">3ro</span>
                            <span className="text-[8px] font-black">{result.thirdPrize}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {unifiedBetsForLot.map((bet, idx) => {
                          const betWinnings = winningBets.filter(wb => {
                            const original = (ticket.bets || [])[wb.idx];
                            return Boolean(
                              original &&
                              original.number === bet.number &&
                              original.type === bet.type &&
                              normalizePlainText(original.lottery || '') === lotteryKey
                            );
                          });
                          const hasWon = betWinnings.length > 0;
                          const betTotalPrize = betWinnings.reduce((sum, wb) => sum + wb.prize, 0);
                          
                          return (
                            <div key={`${lotName}-${bet.type}-${bet.number}-${idx}`} className={`flex justify-between items-center px-1 py-0.5 rounded transition-colors ${hasWon ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-gray-50'}`}>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-bold tracking-tight ${hasWon ? 'text-yellow-700' : ''}`}>
                                  {bet?.type === 'PL' && bet?.number?.length === 4 
                                    ? `${bet.number.slice(0, 2)}-${bet.number.slice(2, 4)}`
                                    : (bet?.number || '??')}
                                </span>
                                <span className="text-[9px] font-mono font-bold text-gray-400 uppercase">
                                  {bet?.type || '?'}
                                </span>
                                {hasWon && (
                                  <div className="flex flex-wrap gap-0.5 ml-1">
                                    {betWinnings.map((wb, wIdx) => (
                                      <span key={wIdx} className="text-[6px] font-mono bg-yellow-500 text-black px-1 rounded font-bold uppercase leading-tight">
                                        {wb.rank}º{wb.matchType ? ` ${wb.matchType}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-4 items-center">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-mono font-medium text-gray-500">{bet.quantity}</span>
                                  {hasWon && (
                                    <span className="text-[7px] font-black text-yellow-600">USD {betTotalPrize.toFixed(2)}</span>
                                  )}
                                </div>
                                <span className="text-xs font-bold font-mono w-12 text-right">
                                  ${(bet?.amount || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}

              {!showFullTicket && selectedLotteryName && Array.from(new Set((ticket.bets || []).map(b => b?.lottery))).length > 1 && (
                <button 
                  onClick={() => setShowFullTicket(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-[10px] font-bold uppercase text-gray-400 hover:border-primary hover:text-primary transition-all"
                >
                  Este ticket contiene otros sorteos. Ver Ticket Completo
                </button>
              )}
            </div>

            {totalPrize > 0 && (
              <div className="mt-4 p-4 bg-yellow-400 rounded-xl flex justify-between items-center shadow-lg shadow-yellow-400/20 border-2 border-yellow-500">
                <div className="flex items-center gap-2">
                  <div className="bg-black text-yellow-400 p-1 rounded-full">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tighter text-black">PREMIO TOTAL</span>
                </div>
                <span className="text-2xl font-black text-black tracking-tighter">
                  USD {totalPrize.toFixed(2)}
                </span>
              </div>
            )}

            {/* Total Footer */}
            <div className="mt-8 pt-6 border-t-2 border-gray-100 text-black">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Total a Pagar</span>
                  <span className="text-[10px] font-mono text-gray-400">Moneda: USD</span>
                </div>
                <span className="text-4xl font-bold tracking-tighter leading-none">
                  ${localTotalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* QR and Verification */}
          <div className="flex flex-col items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <QRCode value={`ticket:${ticket.id}`} size={80} />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-800">¡Buena Suerte!</p>
              <p className="text-[10px] font-mono uppercase text-gray-400 max-w-[200px] leading-relaxed">Este comprobante es indispensable para reclamar su premio.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 p-4 border-t border-gray-100">
          <button 
            onClick={() => printTicket()}
            className="flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg font-bold text-xs uppercase hover:bg-gray-800 transition-colors"
          >
            <Printer className="w-4 h-4" /> PDF
          </button>
          <button 
            onClick={() => downloadTicket()}
            className="flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-lg font-bold text-xs uppercase hover:bg-violet-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Imagen
          </button>
          <button 
            onClick={() => compartirTicket()}
            className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-bold text-xs uppercase hover:bg-blue-700 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Compartir
          </button>
          <button 
            onClick={onClose}
            className="col-span-2 mt-2 flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-lg font-bold text-xs uppercase hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TicketModal;
