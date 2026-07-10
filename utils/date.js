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
