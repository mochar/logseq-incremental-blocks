
// https://stackoverflow.com/questions/3224834/get-difference-between-2-dates-in-javascript
export function dateDiffInDays(a: Date, b: Date) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}export function todayMidnight(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
export function addDays(date: Date, days: number): Date {
  const newDate = new Date(date.getTime());
  newDate.setDate(date.getDate() + days);
  return newDate;
}
export function toStartOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}
export function toEndOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB');
}
export function secondsToString(seconds: number): string {
  return new Date(1000 * seconds).toISOString().substr(11, 8);
}

export function dateToUnixTimestamp(date: Date) : number {
  return Math.floor(date.getTime() / 1000);
}

export function unixTimestampToDate(unixTimestamp: number): Date {
  return new Date(unixTimestamp * 1000);
}
