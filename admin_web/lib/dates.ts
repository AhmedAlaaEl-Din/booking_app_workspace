// Pure date helpers. Every Date here is shown in the browser's local time zone,
// which is what JavaScript's Date does by default.

/** "2026-11-17" for a date in local time. Same format as <input type="date">. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True if both dates fall on the same calendar day in local time. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Adds minutes without changing the original date. */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** "Mon, 17 Nov 2026" (exact wording depends on the browser's language). */
export function formatDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "09:30" in 24-hour time, like the mobile app. */
export function formatTime(date: Date, locale?: string): string {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "09:30 – 10:00" */
export function formatTimeRange(
  start: Date,
  durationMinutes: number,
  locale?: string,
): string {
  const end = addMinutes(start, durationMinutes);
  return `${formatTime(start, locale)} – ${formatTime(end, locale)}`;
}

/** "30 min", "1 h" or "1 h 30 min", like the mobile app. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/** "$25" or "$12.50", like the mobile app (BookingConstants.currencySymbol). */
export function formatPrice(price: number): string {
  const digits = Number.isInteger(price) ? 0 : 2;
  return `$${price.toFixed(digits)}`;
}
