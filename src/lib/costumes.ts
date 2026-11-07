// 衣装の貸し借り記録の写真の制約。
// お知らせの添付ファイルと同じく、Vercelのリクエストボディ上限（約4.5MB）に余裕を持たせ、
// 1回の送信で合計4MBまでに制限する。写真は画像のみ（PDFは不可）。
export const MAX_LOAN_PHOTO_SIZE = 4 * 1024 * 1024;
export const MAX_LOAN_PHOTOS_TOTAL_SIZE = 4 * 1024 * 1024;
export const ALLOWED_LOAN_PHOTO_TYPES = ["image/png", "image/jpeg"];

/** <input type="date"> の "YYYY-MM-DD" を検証して返す。空・不正ならnull */
export function parseDateOnly(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return v;
}

/** "YYYY-MM-DD" を「2026年9月23日」の形式に */
export function formatDateOnly(value: string | null): string {
  if (!value) return "-";
  const [y, m, d] = value.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** 貸出中で、返却予定日（JST）を過ぎているか */
export function isLoanOverdue(
  loan: { returnedAt: Date | null; dueOn: string | null },
  todayKey: string
): boolean {
  return !loan.returnedAt && !!loan.dueOn && loan.dueOn < todayKey;
}

/** フォームから送られた写真ファイルを取り出す（空のファイル入力は除外） */
export function pickPhotoFiles(formData: FormData): File[] {
  return formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
}

/** 写真の形式・サイズを検証する。問題があればエラーメッセージ、無ければnull */
export function validatePhotoFiles(files: File[]): string | null {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_LOAN_PHOTOS_TOTAL_SIZE) {
    return "写真の合計サイズが大きすぎます（1回の送信で合計4MBまで）";
  }
  for (const file of files) {
    if (!ALLOWED_LOAN_PHOTO_TYPES.includes(file.type)) {
      return `対応していないファイル形式です（PNG / JPEGのみ）: ${file.name}`;
    }
    if (file.size > MAX_LOAN_PHOTO_SIZE) {
      return `ファイルサイズが大きすぎます（1枚4MBまで）: ${file.name}`;
    }
  }
  return null;
}
