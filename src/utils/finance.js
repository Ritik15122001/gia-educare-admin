// Money and period helpers for the Finance screen. Every amount is INR.

// Whole rupees stay whole; anything with paise shows both digits (₹1,250.50).
export function inr(n) {
  const v = Number(n || 0);
  const digits = Number.isInteger(v) ? 0 : 2;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

// Short form for big tiles: ₹4.25 L, ₹1.3 Cr.
export function inrShort(n) {
  const v = Number(n || 0);
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
  return `${sign}${inr(abs)}`;
}

// Signed display: +₹5,000 / −₹5,000.
export const inrSigned = (n) => `${n < 0 ? '−' : '+'}${inr(Math.abs(n))}`;

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());

// Indian financial year: 1 April – 31 March.
const fyStartYear = (d) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
const fyLabel = (start) => `FY ${start}–${String((start + 1) % 100).padStart(2, '0')}`;

export function periodOptions(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const fy = fyStartYear(now);
  return [
    { key: 'this-month', label: 'This month', from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) },
    { key: 'last-month', label: 'Last month', from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) },
    { key: 'this-fy', label: fyLabel(fy), from: `${fy}-04-01`, to: `${fy + 1}-03-31` },
    { key: 'last-fy', label: fyLabel(fy - 1), from: `${fy - 1}-04-01`, to: `${fy}-03-31` },
    { key: 'all', label: 'All time', from: '', to: '' },
  ];
}

export const formatDay = (value) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

export const formatMonth = (yyyyMm) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const PAYMENT_MODE_LABELS = {
  bank_transfer: 'Bank transfer', upi: 'UPI', cash: 'Cash', card: 'Card', cheque: 'Cheque', other: 'Other',
};

export const DEFAULT_TAG = { income: 'revenue', expense: 'operating_expense' };

export const tagsForType = (plTags, type) => plTags.filter((t) => t.type === type || t.type === 'any');
