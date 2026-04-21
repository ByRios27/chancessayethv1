export const getBusinessDate = (date = new Date()) => {
  const hours = date.getHours();
  if (hours < 3) {
    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    return prevDate;
  }
  return date;
};

export const getStartOfBusinessDay = (date = new Date()) => {
  const businessDate = getBusinessDate(date);
  const start = new Date(businessDate);
  start.setHours(3, 0, 0, 0);
  return start;
};

export const getEndOfBusinessDay = (date = new Date()) => {
  const start = getStartOfBusinessDay(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return end;
};
