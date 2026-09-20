// Follow-up dates: the counsellor's local calendar day, not UTC.
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());
export const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** "Today", "Tomorrow", "3 days ago", or a plain date. */
export function followUpLabel(value) {
  if (!value) return null;
  const due = new Date(value);
  const days = Math.round((new Date(due).setHours(0, 0, 0, 0) - startOfToday()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days <= 7) return `In ${days} days`;
  return due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Overdue reads red, today gold, anything later is quiet. */
export function followUpTone(value, status) {
  if (!value) return null;
  if (['converted', 'closed'].includes(status)) return 'neutral';
  const days = Math.round((new Date(value).setHours(0, 0, 0, 0) - startOfToday()) / 86400000);
  if (days < 0) return 'err';
  if (days === 0) return 'gold';
  return 'info';
}
