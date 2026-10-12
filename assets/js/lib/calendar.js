// NYSE holidays and 1:00 p.m. early closes, as announced by NYSE Group (December 2025).
// Shared by the database seed script and the demo market.

export const HOLIDAYS = new Set([
  // 2026
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  // 2027
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
  '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
  // 2028 (New Year's Day falls on a Saturday and is not observed)
  '2028-01-17', '2028-02-21', '2028-04-14', '2028-05-29', '2028-06-19',
  '2028-07-04', '2028-09-04', '2028-11-23', '2028-12-25'
]);

export const EARLY_CLOSES = new Set([
  '2026-11-27', '2026-12-24',
  '2027-11-26',
  '2028-07-03', '2028-11-24'
]);

export function isTradingDay(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  const dow = d.getUTCDay();
  return dow !== 0 && dow !== 6 && !HOLIDAYS.has(iso);
}

export function addDaysIso(iso, days) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function tradingDays(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDaysIso(d, 1)) {
    if (isTradingDay(d)) out.push({ d, open: '09:30', close: EARLY_CLOSES.has(d) ? '13:00' : '16:00' });
  }
  return out;
}
