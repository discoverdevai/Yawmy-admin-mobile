// Small date helpers for chat day separators.

export function midnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Human label for a message's day relative to now: "Today", "Yesterday",
 * otherwise a short date ("Jul 3" — with the year if it isn't the current one).
 */
export function dayLabel(date) {
  const d = midnight(date);
  const today = midnight(new Date());
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, addDays(today, -1))) return 'Yesterday';
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

const FULL_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The right-hand stamp on a chat list row: "10:30 AM" today, "Yesterday", the
 * weekday within the last week, then the date. Chat lists are scanned rather
 * than read, so recent rows show a time and older ones only need to be placeable.
 */
export function formatChatStamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = midnight(new Date());
  const day = midnight(d);

  if (sameDay(day, today)) {
    let hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, '0');
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${period}`;
  }
  if (sameDay(day, addDays(today, -1))) return 'Yesterday';

  const daysAgo = Math.round((today - day) / 86400000);
  if (daysAgo < 7) return FULL_DOW[d.getDay()];

  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}
