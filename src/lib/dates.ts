import { env } from '../config/env';

// תאריכים במערכת הם "תאריך בלבד" (YYYY-MM-DD), בלי שעה.
// בתוך הקוד הם נשמרים כ־Date בחצות UTC, וכך משווים ביניהם בלי בעיות של אזורי זמן.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** היום, לפי אזור הזמן של המלון */
export function todayInHotel(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.HOTEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // en-CA => YYYY-MM-DD
  return parseDate(parts);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}
