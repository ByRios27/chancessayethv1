type TicketLike = {
  id?: string;
  customerName?: string;
  clientName?: string;
  sellerName?: string;
  sellerId?: string;
  sellerCode?: string;
  sellerEmail?: string;
};

export function getTicketPrimaryLabel(ticket: TicketLike | null | undefined): string {
  const customerName = (ticket?.customerName || ticket?.clientName || '').trim();
  if (customerName) return customerName;

  const sellerName = (ticket?.sellerName || '').trim();
  if (sellerName) return sellerName;

  const sellerId = (ticket?.sellerId || ticket?.sellerCode || '').trim();
  if (sellerId) return sellerId;

  const sellerEmail = (ticket?.sellerEmail || '').trim();
  if (sellerEmail) return sellerEmail.split('@')[0] || sellerEmail;

  return 'Cliente sin nombre';
}

export function getTicketSecondaryId(ticket: TicketLike | null | undefined): string {
  const id = (ticket?.id || '').trim();
  if (!id) return '';
  return `#${id.slice(0, 8).toUpperCase()}`;
}
