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

export const stripEmojis = (text: string) => {
  if (!text) return '';
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/[\u200D\uFE0E\uFE0F]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};
