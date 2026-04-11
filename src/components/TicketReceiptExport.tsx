import React, { forwardRef } from 'react';
import { format } from 'date-fns';

const getTicketDateObj = (ticket: any) => {
  if (!ticket.timestamp) return new Date();
  if (ticket.timestamp.toDate) return ticket.timestamp.toDate();
  return new Date(ticket.timestamp);
};

const getTicketTime = (ticket: any) => {
  const dateObj = getTicketDateObj(ticket);
  return format(dateObj, 'HH:mm');
};

interface TicketReceiptExportProps {
  ticket: any;
  localTotalAmount: number;
}

export const TicketReceiptExport = forwardRef<HTMLDivElement, TicketReceiptExportProps>(
  ({ ticket, localTotalAmount }, ref) => {
    const dateObj = getTicketDateObj(ticket);
    const dateStr = `${format(dateObj, 'dd/MM/yyyy')} ${getTicketTime(ticket)}`;
    
    return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: '-10000px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '360px',
        minWidth: '360px',
        maxWidth: '360px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
        display: 'block',
        visibility: 'visible',
        opacity: 1,
        zIndex: 0,
        textAlign: 'left',
        border: '1px solid #9ca3af',
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: '16px',
          borderBottom: '2px solid #000000',
          paddingBottom: '10px',
        }}
      >
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 'bold',
            margin: '0',
            color: '#000000',
            letterSpacing: '0.5px',
          }}
        >
          CHANCE PRO
        </h2>
        <p
          style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            margin: '6px 0 0',
            color: '#1f2937',
            fontWeight: 600,
            letterSpacing: '1px',
          }}
        >
          Comprobante de Venta
        </p>
      </div>

      <div
        style={{
          fontSize: '12px',
          marginBottom: '16px',
          color: '#000000',
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: '3px 0' }}>
          <strong>Fecha:</strong>{' '}
          {dateStr}
        </p>
        <p style={{ margin: '3px 0', overflowWrap: 'anywhere' }}>
          <strong>Ticket ID:</strong> {ticket.id}
        </p>
        <p style={{ margin: '3px 0' }}>
          <strong>Cliente:</strong> {ticket.customerName || 'Cliente General'}
        </p>
        <p style={{ margin: '3px 0' }}>
          <strong>Vendedor:</strong> {ticket.sellerCode}
        </p>
      </div>

      <div
        style={{
          borderTop: '1px solid #000000',
          paddingTop: '10px',
        }}
      >
        {(ticket.bets || []).map((bet: any, idx: number) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              marginBottom: '6px',
              color: '#000000',
            }}
          >
            <span
              style={{
                overflowWrap: 'anywhere',
                fontWeight: 600,
                color: '#000000',
              }}
            >
              {bet.number} ({bet.type})
            </span>
            <span
              style={{
                whiteSpace: 'nowrap',
                fontWeight: 700,
                color: '#000000',
              }}
            >
              {bet.quantity} x ${Number(bet.amount || 0).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: '2px solid #000000',
          marginTop: '16px',
          paddingTop: '10px',
          textAlign: 'right',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#000000',
        }}
      >
        TOTAL: ${Number(localTotalAmount || 0).toFixed(2)}
      </div>
    </div>
  );
});
