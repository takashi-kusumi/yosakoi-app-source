/** "YYYY-MM-DD" の日付キーを1日ずつ進める */
export function addDaysKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOfKey(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

/** 期間内（両端を含む）で、指定曜日（0=日〜6=土）に当たる日付キーの一覧 */
export function datesForWeekdays(fromKey: string, toKey: string, weekdays: number[], max: number): string[] {
  const out: string[] = [];
  for (let k = fromKey; k <= toKey && out.length <= max; k = addDaysKey(k, 1)) {
    if (weekdays.includes(weekdayOfKey(k))) out.push(k);
  }
  return out;
}

export const MAX_BULK_EVENTS = 60;
