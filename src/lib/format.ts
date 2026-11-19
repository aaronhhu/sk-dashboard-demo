export const fmtMoney = (v: number, compact = false) =>
  compact && Math.abs(v) >= 10000
    ? `$${(v / 1000).toFixed(1)}k`
    : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Math.abs(v) < 100 ? 2 : 0 });

export const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US');
export const fmtPct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
export const fmtSignedPct = (v: number, digits = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(digits)}%`;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const fmtDay = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const fmtDayShort = (dt: Date) => `${WEEKDAYS[dt.getDay()]} ${dt.getDate()}`;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Blend two hex colors. t = 0 → a, 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
