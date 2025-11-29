export const startOfDay = (value: number | Date) => {
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const isSameDay = (left: number | Date, right: number | Date) => {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
};

export const formatDateInputValue = (value: number | Date) => {
  const date = typeof value === 'number' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatWeekdayShort = (value: Date, locale: string = 'ru-RU') => {
  return value.toLocaleDateString(locale, { weekday: 'short' });
};

export const getRelativeDayLabel = (value: Date, locale: string = 'ru-RU') => {
  const today = startOfDay(new Date());
  const yesterday = startOfDay(addDays(today, -1));
  const target = startOfDay(value);

  if (target.getTime() === today.getTime()) return 'Сегодня';
  if (target.getTime() === yesterday.getTime()) return 'Вчера';

  return value.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
