export type MonthCell = {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function keyOf(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function daysInMonth(y: number, m: number): number {
  // m: 1-12。Date.UTC の月は0始まりなので、m を渡すと「翌月の0日目」= その月の最終日になる
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function weekdayOfFirst(y: number, m: number): number {
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
}

export function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12 + 1;
  return { y: ny, m: nm };
}

export function monthParam(y: number, m: number): string {
  return `${y}-${pad(m)}`;
}

/** JSTでの「今日」のYYYY-MM-DDキーを返す */
export function jstTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** イベント日時(Date)をJSTでのYYYY-MM-DDキーに変換する */
export function jstDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseMonthParam(value: string | undefined): { y: number; m: number } {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (m >= 1 && m <= 12) return { y, m };
  }
  const todayKey = jstTodayKey();
  const [y, m] = todayKey.split("-").map(Number);
  return { y, m };
}

/** 月のカレンダーグリッド（週の完全な行単位）を組み立てる */
export function buildMonthCells(y: number, m: number): MonthCell[] {
  const startWeekday = weekdayOfFirst(y, m);
  const thisMonthDays = daysInMonth(y, m);
  const prev = addMonths(y, m, -1);
  const prevMonthDays = daysInMonth(prev.y, prev.m);
  const todayKey = jstTodayKey();

  const cells: MonthCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const day = prevMonthDays - startWeekday + 1 + i;
    cells.push({ key: keyOf(prev.y, prev.m, day), day, inMonth: false, isToday: false });
  }

  for (let day = 1; day <= thisMonthDays; day++) {
    const key = keyOf(y, m, day);
    cells.push({ key, day, inMonth: true, isToday: key === todayKey });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const next = addMonths(y, m, 1);
    const need = 7 - remainder;
    for (let day = 1; day <= need; day++) {
      cells.push({ key: keyOf(next.y, next.m, day), day, inMonth: false, isToday: false });
    }
  }

  return cells;
}

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
