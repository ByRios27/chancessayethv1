export const cleanText = (text: string) => {
  if (!text) return '';
  // Replace common corrupted patterns found in the database
  // More aggressive regex to catch variations of the corrupted characters
  return text
    .replace(/[\u00D8\u00DD<][^a-zA-Z0-9\s()\-:/]*/g, 'Lotería')
    .replace(/Lotería+/g, 'Lotería')
    .replace(/Lotería\s+Lotería/g, 'Lotería')
    .trim();
};

export const normalizePlainText = (text: string) => {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

export const normalizeLotteryName = (name: string) => cleanText(name || '').trim().toLowerCase();
